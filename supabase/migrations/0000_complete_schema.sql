-- =================================================================
-- SONGTAI LIFE — COMPLETE IDEMPOTENT SCHEMA
-- Run this single file. Every statement is safe to re-run:
--   • Tables  → CREATE TABLE IF NOT EXISTS
--   • Columns → ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--   • Policies→ wrapped in DO $$ BEGIN...EXCEPTION WHEN
--               duplicate_object THEN NULL; END $$
--   • Seeds   → INSERT ... ON CONFLICT DO NOTHING
-- =================================================================

-- ── Extensions ───────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Product Categories ───────────────────────────────────────────
create table if not exists product_categories (
  id   uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null
);

-- ── Products ─────────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  price_xaf   integer not null,
  pv_points   integer default 0,
  category_id uuid references product_categories(id),
  images      text[] default '{}',
  is_active   boolean default true,
  created_at  timestamptz default now()
);
alter table products add column if not exists stock integer default 0;
-- generated column: single convenience alias for images[1]
do $$ begin
  alter table products add column image text generated always as (images[1]) stored;
exception when duplicate_column then null;
end $$;

-- ── Blog Categories ───────────────────────────────────────────────
create table if not exists blog_categories (
  id   uuid primary key default uuid_generate_v4(),
  name text not null
);

-- ── Blog Posts ────────────────────────────────────────────────────
create table if not exists blog_posts (
  id           uuid primary key default uuid_generate_v4(),
  slug         text unique not null,
  title        text not null,
  body         text not null,
  category_id  uuid references blog_categories(id),
  status       text default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz default now()
);
alter table blog_posts add column if not exists body     text;
alter table blog_posts add column if not exists excerpt  text;
alter table blog_posts add column if not exists author   text;
alter table blog_posts add column if not exists image    text;
alter table blog_posts add column if not exists category text;

-- ── Events ────────────────────────────────────────────────────────
create table if not exists events (
  id       uuid primary key default uuid_generate_v4(),
  slug     text unique not null,
  title    text not null,
  start_at timestamptz not null,
  end_at   timestamptz,
  location text,
  capacity integer
);
alter table events add column if not exists description text;
alter table events add column if not exists image       text;
alter table events add column if not exists registrants text[] default '{}';

-- ── Event Registrations ───────────────────────────────────────────
create table if not exists event_registrations (
  id       uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) not null,
  user_id  uuid references auth.users(id),
  status   text default 'registered' check (status in ('registered','attended','cancelled')),
  unique(event_id, user_id)
);

-- ── Gallery Images ────────────────────────────────────────────────
create table if not exists gallery_images (
  id      uuid primary key default uuid_generate_v4(),
  url     text not null,
  album   text,
  caption text
);

-- ── Testimonials ──────────────────────────────────────────────────
create table if not exists testimonials (
  id        uuid primary key default uuid_generate_v4(),
  name      text not null,
  rank      text,
  region    text,
  quote     text not null,
  video_url text
);

-- ── Contact Messages ──────────────────────────────────────────────
create table if not exists contact_messages (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  email        text not null,
  message      text not null,
  spam_flagged boolean default false,
  created_at   timestamptz default now()
);
alter table contact_messages add column if not exists phone  text;
alter table contact_messages add column if not exists status text default 'unread'
  check (status in ('unread','read','responded'));

-- ── Newsletter Subscribers ────────────────────────────────────────
create table if not exists newsletter_subscribers (
  id         uuid primary key default uuid_generate_v4(),
  email      text unique not null,
  locale     text default 'en',
  confirmed  boolean default false
);
alter table newsletter_subscribers add column if not exists created_at timestamptz default now();

-- ── MLM: Profiles (extends auth.users) ───────────────────────────
create table if not exists profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text not null,
  phone                   text,
  display_name            text,
  role                    text not null default 'customer'
    check (role in ('customer','distributor','content_editor','admin','superadmin')),
  locale                  text default 'fr',
  privacy_accepted_at     timestamptz,
  privacy_accepted_version text,
  created_at              timestamptz default now()
);

-- ── MLM: Distributors ─────────────────────────────────────────────
create table if not exists distributors (
  id               uuid primary key references auth.users(id) on delete cascade,
  distributor_code text unique not null,
  sponsor_id       text,
  placement_id     text,
  rank             text default 'bronze'
    check (rank in ('bronze','silver','gold','platinum','diamond')),
  kyc_status       text default 'none'
    check (kyc_status in ('none','pending','verified','rejected')),
  pv               integer default 0,
  joined_at        timestamptz default now()
);

-- ── MLM: Wallets ──────────────────────────────────────────────────
create table if not exists wallets (
  id          uuid primary key references auth.users(id) on delete cascade,
  balance_xaf integer default 0,
  updated_at  timestamptz default now()
);

-- ── MLM: Wallet Transactions ──────────────────────────────────────
create table if not exists wallet_transactions (
  id           uuid primary key default uuid_generate_v4(),
  wallet_id    uuid references auth.users(id) not null,
  type         text not null check (type in ('commission','withdrawal','adjustment','refund')),
  amount_xaf   integer not null,
  reference_id text,
  description  text,
  status       text default 'completed' check (status in ('pending','completed','failed')),
  created_at   timestamptz default now()
);
create index if not exists idx_wallet_tx_wallet_id on wallet_transactions(wallet_id);

-- ── MLM: Commissions ──────────────────────────────────────────────
create table if not exists commissions (
  id             uuid primary key default uuid_generate_v4(),
  distributor_id uuid references auth.users(id) not null,
  order_id       text not null,
  type           text not null,
  level          integer default 0,
  amount_xaf     integer not null,
  status         text default 'completed',
  created_at     timestamptz default now()
);
create index if not exists idx_commissions_distributor_id on commissions(distributor_id);

-- ── MLM: Withdrawals ─────────────────────────────────────────────
create table if not exists withdrawals (
  id             uuid primary key default uuid_generate_v4(),
  distributor_id uuid references auth.users(id) not null,
  amount_xaf     integer not null,
  method         text not null,
  status         text default 'pending' check (status in ('pending','completed','failed')),
  created_at     timestamptz default now()
);
create index if not exists idx_withdrawals_distributor_id on withdrawals(distributor_id);

-- ── MLM: Orders ───────────────────────────────────────────────────
create table if not exists orders (
  id             uuid primary key default uuid_generate_v4(),
  order_id       text unique not null,
  user_id        text not null,
  amount_xaf     integer not null,
  pv_points      integer default 0,
  phone          text,
  provider       text,
  cart           jsonb default '[]',
  status         text default 'pending' check (status in ('pending','paid','failed','refunded')),
  transaction_id text,
  paid_at        timestamptz,
  created_at     timestamptz default now()
);
create index if not exists idx_orders_order_id on orders(order_id);
create index if not exists idx_orders_user_id  on orders(user_id);

-- ── MLM: KYC Documents ───────────────────────────────────────────
create table if not exists kyc_documents (
  id             text primary key,
  distributor_id uuid references auth.users(id) not null,
  document_type  text,
  file_url       text,
  status         text default 'pending' check (status in ('pending','verified','rejected')),
  created_at     timestamptz default now()
);
create index if not exists idx_kyc_distributor_id on kyc_documents(distributor_id);

-- ── MLM: Processed Payments (idempotency ledger) ─────────────────
create table if not exists processed_payments (
  order_id       text primary key,
  transaction_id text,
  processed_at   timestamptz default now()
);

-- ── MLM: Audit Logs ───────────────────────────────────────────────
create table if not exists audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  event       text,
  payload     jsonb,
  admin_email text,
  action      text,
  details     text,
  created_at  timestamptz default now()
);

-- =================================================================
-- ROW LEVEL SECURITY — enable on all tables (safe to re-run)
-- =================================================================
alter table products              enable row level security;
alter table blog_posts            enable row level security;
alter table events                enable row level security;
alter table gallery_images        enable row level security;
alter table testimonials          enable row level security;
alter table contact_messages      enable row level security;
alter table newsletter_subscribers enable row level security;
alter table profiles              enable row level security;
alter table distributors          enable row level security;
alter table wallets               enable row level security;
alter table wallet_transactions   enable row level security;
alter table commissions           enable row level security;
alter table withdrawals           enable row level security;
alter table orders                enable row level security;
alter table kyc_documents         enable row level security;
alter table audit_logs            enable row level security;
alter table processed_payments    enable row level security;

-- =================================================================
-- HELPER FUNCTION: is_admin()
-- =================================================================
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  );
$$;

-- =================================================================
-- POLICIES
-- Each block uses DO $$ BEGIN...EXCEPTION WHEN duplicate_object
-- THEN NULL; END $$ so re-running never errors.
-- =================================================================

-- ── products ─────────────────────────────────────────────────────
do $$ begin
  create policy "Public read active products" on products for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_products_all" on products for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── blog_posts ────────────────────────────────────────────────────
do $$ begin
  create policy "Public read published posts" on blog_posts for select using (status = 'published');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_blog_posts_all" on blog_posts for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── events ────────────────────────────────────────────────────────
do $$ begin
  create policy "Public read events" on events for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_events_all" on events for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── gallery_images ────────────────────────────────────────────────
do $$ begin
  create policy "Public read gallery" on gallery_images for select using (true);
exception when duplicate_object then null; end $$;

-- ── testimonials ──────────────────────────────────────────────────
do $$ begin
  create policy "Public read testimonials" on testimonials for select using (true);
exception when duplicate_object then null; end $$;

-- ── contact_messages ─────────────────────────────────────────────
do $$ begin
  create policy "Public insert contact" on contact_messages for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_contact_messages_all" on contact_messages for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── newsletter_subscribers ────────────────────────────────────────
do $$ begin
  create policy "Public insert newsletter" on newsletter_subscribers for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_newsletter_all" on newsletter_subscribers for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── profiles ─────────────────────────────────────────────────────
do $$ begin
  create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_profiles_all" on profiles for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── distributors ─────────────────────────────────────────────────
do $$ begin
  create policy "distributors_select_own" on distributors for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "distributors_insert_own" on distributors for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "distributors_update_own" on distributors for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_distributors_all" on distributors for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── wallets ───────────────────────────────────────────────────────
-- NOTE: wallets_update_own intentionally omitted — balance updates
-- must go through the increment_wallet_balance() RPC or server endpoint.
do $$ begin
  create policy "wallets_select_own" on wallets for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "wallets_insert_own" on wallets for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_wallets_read" on wallets for select using (is_admin());
exception when duplicate_object then null; end $$;
-- Remove the dangerously permissive direct-balance-update policy if it exists
drop policy if exists "wallets_update_own" on wallets;

-- ── wallet_transactions ───────────────────────────────────────────
do $$ begin
  create policy "wallet_tx_select_own" on wallet_transactions for select using (auth.uid() = wallet_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "wallet_tx_insert_own" on wallet_transactions for insert with check (auth.uid() = wallet_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_wallet_transactions_all" on wallet_transactions for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── commissions ───────────────────────────────────────────────────
do $$ begin
  create policy "commissions_select_own" on commissions for select using (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_commissions_all" on commissions for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── withdrawals ───────────────────────────────────────────────────
do $$ begin
  create policy "withdrawals_select_own" on withdrawals for select using (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "withdrawals_insert_own" on withdrawals for insert with check (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_withdrawals_all" on withdrawals for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── orders ────────────────────────────────────────────────────────
do $$ begin
  create policy "orders_select_own" on orders for select using (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_orders_all" on orders for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── kyc_documents ─────────────────────────────────────────────────
do $$ begin
  create policy "kyc_select_own" on kyc_documents for select using (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "kyc_insert_own" on kyc_documents for insert with check (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "kyc_upsert_own" on kyc_documents for update using (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_kyc_all" on kyc_documents for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── processed_payments ────────────────────────────────────────────
do $$ begin
  create policy "admin_processed_payments_all" on processed_payments for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- ── audit_logs ────────────────────────────────────────────────────
do $$ begin
  create policy "admin_audit_logs_all" on audit_logs for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

-- =================================================================
-- RPC: Atomic wallet balance increment
-- (create or replace is always idempotent)
-- =================================================================
create or replace function increment_wallet_balance(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
begin
  insert into wallets (id, balance_xaf, updated_at)
  values (p_user_id, p_amount, now())
  on conflict (id) do update set
    balance_xaf = wallets.balance_xaf + p_amount,
    updated_at  = now();
end;
$$;

-- =================================================================
-- REALTIME — add tables to publication (safe to re-run via DO block)
-- =================================================================
do $$ begin
  alter publication supabase_realtime add table profiles;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table wallets;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table wallet_transactions;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table distributors;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table commissions;
exception when others then null; end $$;

-- =================================================================
-- SEED DATA — all use ON CONFLICT DO NOTHING so safe to re-run
-- =================================================================

-- Product Categories
insert into product_categories (id, name, slug) values
  ('f8d68965-0a18-47e2-895c-9c7ef2b6e1b1', 'Health',        'health'),
  ('f8d68965-0a18-47e2-895c-9c7ef2b6e1b2', 'Beauty',        'beauty'),
  ('f8d68965-0a18-47e2-895c-9c7ef2b6e1b3', 'Agriculture',   'agriculture'),
  ('f8d68965-0a18-47e2-895c-9c7ef2b6e1b4', 'New Arrivals',  'new-arrivals')
on conflict (slug) do nothing;

-- Products
insert into products (slug, name, description, price_xaf, pv_points, category_id, images, is_active) values
  ('cellular-vitality', 'Cellular Vitality Capsules',
   'High-purity organic moringa and ginseng complex designed to renew cellular energy and boost regional immune health.',
   18500, 25, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b1',
   array['https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'], true),
  ('luminous-elixir', 'Luminous Facial Elixir',
   'Anti-aging daily serum rich in shea oil esters, wild ginger, and vitamin C to smooth and brighten West African skin.',
   22000, 30, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b2',
   array['https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&q=80&w=800'], true),
  ('bio-yield-booster', 'Bio-Yield Soil Booster',
   '100% ecological organic agricultural fertilizer to accelerate seed germination and crop yield in Cameroon farm soils.',
   15000, 20, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b3',
   array['https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=800'], true),
  ('shampoo-bar', 'Botanical Purifying Shampoo Bar',
   'Zero-waste premium conditioning hair cleanser formulated with wild tea tree and rosemary leaf extracts.',
   8500, 10, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b4',
   array['https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800'], true)
on conflict (slug) do nothing;

-- Blog Categories
insert into blog_categories (id, name) values
  ('a8d68965-0a18-47e2-895c-9c7ef2b6e1b1', 'Nutraceuticals'),
  ('a8d68965-0a18-47e2-895c-9c7ef2b6e1b2', 'Direct Selling'),
  ('a8d68965-0a18-47e2-895c-9c7ef2b6e1b3', 'Eco Agriculture')
on conflict do nothing;

-- Blog Posts
insert into blog_posts (slug, title, body, category_id, status) values
  ('moringa-cellular-benefits',
   'Sourcing Northern Moringa: Active Botanical Cellular Benefits',
   'Moringa Oleifera grown in northern Cameroon boasts extraordinary concentration of vitamins and active antioxidants...',
   'a8d68965-0a18-47e2-895c-9c7ef2b6e1b1', 'published'),
  ('unilevel-mlm-growth',
   'Unlocking Sovereign Income: Mastering the Unilevel Compensation Matrix',
   'The direct-selling business template represents a reliable path toward organic network growth across pan-African markets...',
   'a8d68965-0a18-47e2-895c-9c7ef2b6e1b2', 'published')
on conflict (slug) do nothing;

-- Events
insert into events (slug, title, start_at, location, capacity) values
  ('yaounde-summit-2026',   'National Leadership Summit - Yaoundé',
   '2026-10-15T09:00:00Z', 'Avenue Kennedy Conference Hall, Yaoundé', 300),
  ('douala-workshop-2026',  'Douala Bio-Yield Agricultural Workshop',
   '2026-11-05T10:00:00Z', 'Akwa District Business Hotel, Douala',   150)
on conflict (slug) do nothing;

-- Testimonials
insert into testimonials (name, rank, region, quote) values
  ('Sophie Ebongue',  'Diamond Director', 'Littoral (Douala)',
   'Songtai Life completely reshaped my perspective on micro-franchise networks. By introducing organic wellness supplements to our community, my team secured financial independence for over 50 local families within six months.'),
  ('Jean-Paul Amadou','Gold Distributor', 'North (Garoua)',
   'The Bio-Yield soil organic enhancer has dramatically increased our corn harvest yields by over 40% while rebuilding the microbial life of our soils. This is the product that direct-selling in Cameroon has been waiting for.')
on conflict do nothing;

-- Gallery Images
insert into gallery_images (url, album, caption) values
  ('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600',
   'Farms',   'Direct botanical sourcing with our agricultural farming cooperatives.'),
  ('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=600',
   'Summits', 'Our physical business forum training and entrepreneur coaching sessions in Douala.')
on conflict do nothing;
