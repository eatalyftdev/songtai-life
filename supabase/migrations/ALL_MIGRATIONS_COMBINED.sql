-- ALL MIGRATIONS COMBINED — fully idempotent (safe to re-run at any time)
-- Every statement skips gracefully if the object already exists.
--
-- Technique reference:
--   Tables / columns / indexes → IF NOT EXISTS
--   Policies                   → DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$
--   Column renames             → DO $$ BEGIN … check pg_attribute … END $$
--   Generated columns          → DO $$ BEGIN … EXCEPTION WHEN duplicate_column THEN NULL; END $$
--   Triggers                   → DROP TRIGGER IF EXISTS … then CREATE
--   Publication additions      → DO $$ BEGIN … EXCEPTION WHEN others THEN NULL; END $$
--   Seeds                      → ON CONFLICT DO NOTHING
--   Functions                  → CREATE OR REPLACE (always idempotent)
--   DROP POLICY IF EXISTS      → always safe

-- ══════════════════════════════════════════════════════════════════
-- 0001 — Base schema
-- ══════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- product_categories
create table if not exists product_categories (
  id   uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null
);

-- products
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

-- blog_categories
create table if not exists blog_categories (
  id   uuid primary key default uuid_generate_v4(),
  name text not null
);

-- blog_posts
create table if not exists blog_posts (
  id           uuid primary key default uuid_generate_v4(),
  slug         text unique not null,
  title        text not null,
  body         text not null,
  category_id  uuid references blog_categories(id),
  status       text default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz default now()
);

-- events
create table if not exists events (
  id       uuid primary key default uuid_generate_v4(),
  slug     text unique not null,
  title    text not null,
  start_at timestamptz not null,
  end_at   timestamptz,
  location text,
  capacity integer
);

-- event_registrations
create table if not exists event_registrations (
  id       uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) not null,
  user_id  uuid references auth.users(id),
  status   text default 'registered' check (status in ('registered','attended','cancelled')),
  unique(event_id, user_id)
);

-- gallery_images
create table if not exists gallery_images (
  id      uuid primary key default uuid_generate_v4(),
  url     text not null,
  album   text,
  caption text
);

-- testimonials
create table if not exists testimonials (
  id        uuid primary key default uuid_generate_v4(),
  name      text not null,
  rank      text,
  region    text,
  quote     text not null,
  video_url text
);

-- contact_messages
create table if not exists contact_messages (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  email        text not null,
  message      text not null,
  spam_flagged boolean default false,
  created_at   timestamptz default now()
);

-- newsletter_subscribers
create table if not exists newsletter_subscribers (
  id        uuid primary key default uuid_generate_v4(),
  email     text unique not null,
  locale    text default 'en',
  confirmed boolean default false
);

-- RLS (enable is a no-op if already enabled)
alter table products               enable row level security;
alter table blog_posts             enable row level security;
alter table events                 enable row level security;
alter table gallery_images         enable row level security;
alter table testimonials           enable row level security;
alter table contact_messages       enable row level security;
alter table newsletter_subscribers enable row level security;

do $$ begin
  create policy "Public read active products" on products for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public read published posts" on blog_posts for select using (status = 'published');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public read events" on events for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public read gallery" on gallery_images for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public read testimonials" on testimonials for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public insert contact" on contact_messages for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public insert newsletter" on newsletter_subscribers for insert with check (true);
exception when duplicate_object then null; end $$;

-- Seeds
insert into product_categories (id, name, slug) values
  ('f8d68965-0a18-47e2-895c-9c7ef2b6e1b1', 'Health',       'health'),
  ('f8d68965-0a18-47e2-895c-9c7ef2b6e1b2', 'Beauty',       'beauty'),
  ('f8d68965-0a18-47e2-895c-9c7ef2b6e1b3', 'Agriculture',  'agriculture'),
  ('f8d68965-0a18-47e2-895c-9c7ef2b6e1b4', 'New Arrivals', 'new-arrivals')
on conflict (slug) do nothing;

insert into products (slug, name, description, price_xaf, pv_points, category_id, images, is_active) values
  ('cellular-vitality', 'Cellular Vitality Capsules', 'High-purity organic moringa and ginseng complex designed to renew cellular energy and boost regional immune health.', 18500, 25, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b1', array['https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'], true),
  ('luminous-elixir',   'Luminous Facial Elixir',    'Anti-aging daily serum rich in shea oil esters, wild ginger, and vitamin C to smooth and brighten West African skin.',    22000, 30, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b2', array['https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&q=80&w=800'], true),
  ('bio-yield-booster', 'Bio-Yield Soil Booster',    '100% ecological organic agricultural fertilizer to accelerate seed germination and crop yield in Cameroon farm soils.',    15000, 20, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b3', array['https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=800'], true),
  ('shampoo-bar',       'Botanical Purifying Shampoo Bar', 'Zero-waste premium conditioning hair cleanser formulated with wild tea tree and rosemary leaf extracts.',            8500, 10, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b4', array['https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800'], true)
on conflict (slug) do nothing;

insert into blog_categories (id, name) values
  ('a8d68965-0a18-47e2-895c-9c7ef2b6e1b1', 'Nutraceuticals'),
  ('a8d68965-0a18-47e2-895c-9c7ef2b6e1b2', 'Direct Selling'),
  ('a8d68965-0a18-47e2-895c-9c7ef2b6e1b3', 'Eco Agriculture')
on conflict do nothing;

insert into blog_posts (slug, title, body, category_id, status) values
  ('moringa-cellular-benefits', 'Sourcing Northern Moringa: Active Botanical Cellular Benefits',       'Moringa Oleifera grown in northern Cameroon boasts extraordinary concentration of vitamins and active antioxidants...', 'a8d68965-0a18-47e2-895c-9c7ef2b6e1b1', 'published'),
  ('unilevel-mlm-growth',       'Unlocking Sovereign Income: Mastering the Unilevel Compensation Matrix', 'The direct-selling business template represents a reliable path toward organic network growth across pan-African markets...', 'a8d68965-0a18-47e2-895c-9c7ef2b6e1b2', 'published')
on conflict (slug) do nothing;

insert into events (slug, title, start_at, location, capacity) values
  ('yaounde-summit-2026',  'National Leadership Summit - Yaoundé',    '2026-10-15T09:00:00Z', 'Avenue Kennedy Conference Hall, Yaoundé', 300),
  ('douala-workshop-2026', 'Douala Bio-Yield Agricultural Workshop', '2026-11-05T10:00:00Z', 'Akwa District Business Hotel, Douala',    150)
on conflict (slug) do nothing;

insert into testimonials (name, rank, region, quote) values
  ('Sophie Ebongue',   'Diamond Director', 'Littoral (Douala)', 'Songtai Life completely reshaped my perspective on micro-franchise networks. By introducing organic wellness supplements to our community, my team secured financial independence for over 50 local families within six months.'),
  ('Jean-Paul Amadou', 'Gold Distributor', 'North (Garoua)',    'The Bio-Yield soil organic enhancer has dramatically increased our corn harvest yields by over 40% while rebuilding the microbial life of our soils. This is the product that direct-selling in Cameroon has been waiting for.')
on conflict do nothing;

insert into gallery_images (url, album, caption) values
  ('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600', 'Farms',   'Direct botanical sourcing with our agricultural farming cooperatives.'),
  ('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=600',   'Summits', 'Our physical business forum training and entrepreneur coaching sessions in Douala.')
on conflict do nothing;


-- ══════════════════════════════════════════════════════════════════
-- 0002 — MLM core tables
-- ══════════════════════════════════════════════════════════════════

create table if not exists profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  email                    text not null,
  phone                    text,
  display_name             text,
  role                     text not null default 'customer'
    check (role in ('customer','distributor','content_editor','admin','superadmin')),
  locale                   text default 'fr',
  privacy_accepted_at      timestamptz,
  privacy_accepted_version text,
  created_at               timestamptz default now()
);

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

create table if not exists wallets (
  id          uuid primary key references auth.users(id) on delete cascade,
  balance_xaf integer default 0,
  updated_at  timestamptz default now()
);

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

create table if not exists withdrawals (
  id             uuid primary key default uuid_generate_v4(),
  distributor_id uuid references auth.users(id) not null,
  amount_xaf     integer not null,
  method         text not null,
  status         text default 'pending' check (status in ('pending','completed','failed')),
  created_at     timestamptz default now()
);
create index if not exists idx_withdrawals_distributor_id on withdrawals(distributor_id);

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

create table if not exists kyc_documents (
  id             text primary key,
  distributor_id uuid references auth.users(id) not null,
  document_type  text,
  file_url       text,
  status         text default 'pending' check (status in ('pending','verified','rejected')),
  created_at     timestamptz default now()
);
create index if not exists idx_kyc_distributor_id on kyc_documents(distributor_id);

create table if not exists processed_payments (
  order_id       text primary key,
  transaction_id text,
  processed_at   timestamptz default now()
);

create table if not exists audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  event       text,
  payload     jsonb,
  admin_email text,
  action      text,
  details     text,
  created_at  timestamptz default now()
);

-- RLS
alter table profiles            enable row level security;
alter table distributors        enable row level security;
alter table wallets             enable row level security;
alter table wallet_transactions enable row level security;
alter table commissions         enable row level security;
alter table withdrawals         enable row level security;
alter table orders              enable row level security;
alter table kyc_documents       enable row level security;
alter table audit_logs          enable row level security;
alter table processed_payments  enable row level security;

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
  create policy "distributors_select_own" on distributors for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "distributors_insert_own" on distributors for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "distributors_update_own" on distributors for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "wallets_select_own" on wallets for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "wallets_insert_own" on wallets for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
-- NOTE: wallets_update_own intentionally omitted — use increment_wallet_balance() RPC

do $$ begin
  create policy "wallet_tx_select_own" on wallet_transactions for select using (auth.uid() = wallet_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "wallet_tx_insert_own" on wallet_transactions for insert with check (auth.uid() = wallet_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "commissions_select_own" on commissions for select using (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "withdrawals_select_own" on withdrawals for select using (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "withdrawals_insert_own" on withdrawals for insert with check (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "orders_select_own" on orders for select using (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "kyc_select_own" on kyc_documents for select using (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "kyc_insert_own" on kyc_documents for insert with check (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "kyc_upsert_own" on kyc_documents for update using (auth.uid() = distributor_id);
exception when duplicate_object then null; end $$;

-- RPC: atomic wallet balance increment
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

-- Realtime (safe: swallows "already member of publication" error)
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


-- ══════════════════════════════════════════════════════════════════
-- 0003 — Missing columns
-- ══════════════════════════════════════════════════════════════════

alter table blog_posts           add column if not exists excerpt    text;
alter table blog_posts           add column if not exists author     text;
alter table blog_posts           add column if not exists image      text;
alter table blog_posts           add column if not exists category   text;

alter table events               add column if not exists description text;
alter table events               add column if not exists image       text;
alter table events               add column if not exists registrants text[] default '{}';

alter table contact_messages     add column if not exists phone  text;
alter table contact_messages     add column if not exists status text default 'unread'
  check (status in ('unread','read','responded'));

alter table newsletter_subscribers add column if not exists created_at timestamptz default now();

alter table audit_logs           add column if not exists admin_email text;
alter table audit_logs           add column if not exists action      text;
alter table audit_logs           add column if not exists details     text;

alter table products             add column if not exists stock integer default 0;
-- Generated column: safe to attempt; silently skips if it already exists
do $$ begin
  alter table products add column image text generated always as (images[1]) stored;
exception when duplicate_column then null; end $$;


-- ══════════════════════════════════════════════════════════════════
-- 0004 — Admin RLS policies + wallet update lockdown
-- ══════════════════════════════════════════════════════════════════

create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

-- Remove the dangerously permissive direct balance-update policy
drop policy if exists "wallets_update_own" on wallets;

do $$ begin
  create policy "admin_wallets_read" on wallets for select using (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_profiles_all" on profiles for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_distributors_all" on distributors for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_wallet_transactions_all" on wallet_transactions for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_commissions_all" on commissions for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_withdrawals_all" on withdrawals for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_orders_all" on orders for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_kyc_all" on kyc_documents for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_processed_payments_all" on processed_payments for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_audit_logs_all" on audit_logs for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_blog_posts_read" on blog_posts for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_blog_posts_all" on blog_posts for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_events_read" on events for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_events_all" on events for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_contact_messages_insert" on contact_messages for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_contact_messages_all" on contact_messages for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_newsletter_insert" on newsletter_subscribers for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_newsletter_all" on newsletter_subscribers for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_products_read" on products for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_products_all" on products for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;


-- ══════════════════════════════════════════════════════════════════
-- 0005 — Auth hardening, RBAC, rate limiting, bilingual products,
--         hero carousel
-- ══════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- Hardened is_admin() with pinned search_path (already defined above; replace is idempotent)
create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_content_editor_or_above()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('content_editor', 'admin', 'superadmin')
  );
$$;

drop policy if exists "editor_blog_posts_write" on public.blog_posts;
do $$ begin
  create policy "editor_blog_posts_write" on public.blog_posts
  for all using (is_content_editor_or_above()) with check (is_content_editor_or_above());
exception when duplicate_object then null; end $$;

drop policy if exists "editor_events_write" on public.events;
do $$ begin
  create policy "editor_events_write" on public.events
  for all using (is_content_editor_or_above()) with check (is_content_editor_or_above());
exception when duplicate_object then null; end $$;

-- Rate limiting
create table if not exists public.rate_limit_events (
  id         uuid primary key default uuid_generate_v4(),
  bucket     text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (bucket, identifier, created_at);
alter table public.rate_limit_events enable row level security;
drop policy if exists "rate_limit_no_direct_access" on public.rate_limit_events;
do $$ begin
  create policy "rate_limit_no_direct_access" on public.rate_limit_events for all using (false);
exception when duplicate_object then null; end $$;

create or replace function public.check_rate_limit(
  p_bucket         text,
  p_identifier     text,
  p_max_attempts   int,
  p_window_seconds int
)
returns boolean language plpgsql security definer
set search_path = public as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.rate_limit_events
  where bucket     = p_bucket
    and identifier = p_identifier
    and created_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max_attempts then
    return false;
  end if;

  insert into public.rate_limit_events (bucket, identifier) values (p_bucket, p_identifier);
  return true;
end;
$$;

-- Bilingual products: rename name→name_en and description→description_en
-- Safe: checks column existence before attempting the rename.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'name'
  ) then
    alter table public.products rename column name to name_en;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'description'
  ) then
    alter table public.products rename column description to description_en;
  end if;
end $$;

alter table public.products
  add column if not exists name_fr          text,
  add column if not exists description_fr   text,
  add column if not exists strike_price_xaf integer;

-- Hero carousel
create table if not exists public.hero_carousel (
  id          uuid primary key default uuid_generate_v4(),
  image_url   text not null,
  title_en    text,
  title_fr    text,
  subtitle_en text,
  subtitle_fr text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.hero_carousel enable row level security;
drop policy if exists "hero_carousel_public_read"  on public.hero_carousel;
drop policy if exists "hero_carousel_admin_write"  on public.hero_carousel;
do $$ begin
  create policy "hero_carousel_public_read" on public.hero_carousel for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "hero_carousel_admin_write" on public.hero_carousel for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

insert into public.hero_carousel (image_url, title_en, title_fr, subtitle_en, subtitle_fr, sort_order) values
  ('https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=1600',
   'Cellular Vitality Pro',  'Vitalité Cellulaire Pro',
   'Advanced antioxidants from West African botanical heritage',
   'Antioxydants avancés du patrimoine botanique ouest-africain', 1),
  ('https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1600',
   'Luminous Gold Elixir',   'Élixir Or Lumineux',
   'Ultra-premium face serum with cold-pressed argan oil',
   'Sérum visage ultra-premium à l''huile d''argan pressée à froid', 2),
  ('https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1600',
   'Bio-Yield Max',          'Bio-Rendement Max',
   'Ecological bio-stimulant for maximum harvest yield',
   'Bio-stimulant écologique pour un rendement maximal des récoltes', 3)
on conflict do nothing;


-- ══════════════════════════════════════════════════════════════════
-- 0006 — Site settings, appointments, testimonials/gallery ext.,
--         storage policies
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.site_settings (
  id         uuid primary key default uuid_generate_v4(),
  key        text unique not null,
  value      jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id)
);
alter table public.site_settings enable row level security;
drop policy if exists "public_settings_read" on public.site_settings;
drop policy if exists "admin_settings_write" on public.site_settings;
do $$ begin
  create policy "public_settings_read" on public.site_settings for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_settings_write" on public.site_settings for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

insert into public.site_settings (key, value) values
  ('whatsapp',    '{"number": "", "default_message": "Hi Songtai Life, I would like to know more!", "enabled": false}'),
  ('analytics',   '{"gtm_id": "", "ga4_id": "", "enabled": false}'),
  ('socials',     '{"facebook": "", "instagram": "", "tiktok": "", "whatsapp": "", "youtube": "", "linkedin": ""}'),
  ('seo_defaults','{"site_title": "Songtai Life", "meta_description": "Health. Opportunity. Prosperity. Premium natural products from West African botanical heritage.", "og_image_url": ""}')
on conflict (key) do nothing;

create table if not exists public.appointment_types (
  id               uuid primary key default uuid_generate_v4(),
  name_en          text not null,
  name_fr          text,
  duration_minutes integer default 30,
  description_en   text,
  description_fr   text,
  is_active        boolean default true,
  display_order    integer default 0,
  created_at       timestamptz default now()
);
alter table public.appointment_types enable row level security;
drop policy if exists "public_read_appointment_types" on public.appointment_types;
drop policy if exists "admin_appointment_types_all"   on public.appointment_types;
do $$ begin
  create policy "public_read_appointment_types" on public.appointment_types for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_appointment_types_all" on public.appointment_types for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

insert into public.appointment_types (name_en, name_fr, duration_minutes, description_en, description_fr, display_order) values
  ('Product Consultation',   'Consultation Produit',     30, 'Learn about our wellness product range.',            'Découvrez notre gamme de produits bien-être.',               1),
  ('Distributor Onboarding', 'Intégration Distributeur', 45, 'Get started as a Songtai Life distributor.',         'Rejoignez le réseau Songtai Life en tant que distributeur.', 2),
  ('General Inquiry',        'Renseignement Général',    20, 'Any other question — we are happy to help.',         'Toute autre question — nous sommes là pour vous aider.',     3)
on conflict do nothing;

create table if not exists public.appointments (
  id                  uuid primary key default uuid_generate_v4(),
  appointment_type_id uuid references public.appointment_types(id),
  name                text not null,
  email               text not null,
  phone               text,
  preferred_date      date not null,
  preferred_time      time not null,
  message             text,
  status              text default 'requested'
    check (status in ('requested','confirmed','completed','cancelled')),
  created_at          timestamptz default now()
);
alter table public.appointments enable row level security;
drop policy if exists "public_insert_appointments" on public.appointments;
drop policy if exists "admin_appointments_all"     on public.appointments;
do $$ begin
  create policy "public_insert_appointments" on public.appointments for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_appointments_all" on public.appointments for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

alter table public.testimonials
  add column if not exists quote_fr      text,
  add column if not exists is_featured   boolean default false,
  add column if not exists display_order integer default 0;

alter table public.gallery_images
  add column if not exists caption_fr      text,
  add column if not exists display_order   integer default 0,
  add column if not exists uploaded_by     uuid references public.profiles(id),
  add column if not exists file_size_bytes integer,
  add column if not exists mime_type       text;

-- Storage policies (buckets: media, documents, testimonials)
drop policy if exists "public_read_media"            on storage.objects;
drop policy if exists "public_read_documents"        on storage.objects;
drop policy if exists "public_read_testimonials"     on storage.objects;
drop policy if exists "admin_insert_media"           on storage.objects;
drop policy if exists "admin_update_media"           on storage.objects;
drop policy if exists "admin_delete_media"           on storage.objects;
drop policy if exists "admin_insert_documents"       on storage.objects;
drop policy if exists "admin_update_documents"       on storage.objects;
drop policy if exists "admin_delete_documents"       on storage.objects;
drop policy if exists "admin_insert_testimonials"    on storage.objects;
drop policy if exists "admin_update_testimonials"    on storage.objects;
drop policy if exists "admin_delete_testimonials"    on storage.objects;

do $$ begin create policy "public_read_media"        on storage.objects for select using (bucket_id = 'media');
exception when duplicate_object then null; end $$;
do $$ begin create policy "public_read_documents"    on storage.objects for select using (bucket_id = 'documents');
exception when duplicate_object then null; end $$;
do $$ begin create policy "public_read_testimonials" on storage.objects for select using (bucket_id = 'testimonials');
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_insert_media"       on storage.objects for insert with check (bucket_id = 'media'        and is_admin());
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_update_media"       on storage.objects for update using      (bucket_id = 'media'        and is_admin());
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_delete_media"       on storage.objects for delete using      (bucket_id = 'media'        and is_admin());
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_insert_documents"   on storage.objects for insert with check (bucket_id = 'documents'    and is_admin());
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_update_documents"   on storage.objects for update using      (bucket_id = 'documents'    and is_admin());
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_delete_documents"   on storage.objects for delete using      (bucket_id = 'documents'    and is_admin());
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_insert_testimonials" on storage.objects for insert with check (bucket_id = 'testimonials' and is_admin());
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_update_testimonials" on storage.objects for update using      (bucket_id = 'testimonials' and is_admin());
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_delete_testimonials" on storage.objects for delete using      (bucket_id = 'testimonials' and is_admin());
exception when duplicate_object then null; end $$;


-- ══════════════════════════════════════════════════════════════════
-- 0007 — Order delivery fields, WhatsApp tracking, blog/testimonial
--         column additions, order_notifications setting
-- ══════════════════════════════════════════════════════════════════

alter table public.orders
  add column if not exists customer_name              text,
  add column if not exists customer_phone             text,
  add column if not exists delivery_address           text,
  add column if not exists delivery_notes             text,
  add column if not exists whatsapp_notified          boolean not null default false,
  add column if not exists whatsapp_notified_at       timestamptz,
  add column if not exists whatsapp_notification_error text;

alter table public.blog_posts
  add column if not exists created_at timestamptz default now(),
  add column if not exists title_fr   text;

alter table public.testimonials
  add column if not exists image text;
-- quote_fr / is_featured / display_order already added in 0006, IF NOT EXISTS is safe

insert into public.site_settings (key, value) values
  ('order_notifications', '{"whatsapp_number": "", "enabled": false}')
on conflict (key) do nothing;


-- ══════════════════════════════════════════════════════════════════
-- 0008 — FAQ, featured products, product categories RLS,
--         gallery albums
-- ══════════════════════════════════════════════════════════════════

create table if not exists faq_categories (
  id            uuid primary key default uuid_generate_v4(),
  name_en       text not null,
  name_fr       text,
  display_order integer default 0
);

create table if not exists faqs (
  id            uuid primary key default uuid_generate_v4(),
  category_id   uuid references faq_categories(id) on delete set null,
  question_en   text not null,
  question_fr   text,
  answer_en     text not null,
  answer_fr     text,
  display_order integer default 0,
  is_published  boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table faq_categories enable row level security;
alter table faqs           enable row level security;

drop policy if exists "public_read_faq_categories" on faq_categories;
drop policy if exists "admin_faq_categories_all"   on faq_categories;
do $$ begin create policy "public_read_faq_categories" on faq_categories for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_faq_categories_all" on faq_categories for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

drop policy if exists "public_read_published_faqs" on faqs;
drop policy if exists "admin_faqs_all"             on faqs;
do $$ begin create policy "public_read_published_faqs" on faqs for select using (is_published = true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_faqs_all" on faqs for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

insert into faq_categories (name_en, name_fr, display_order) values
  ('Products',    'Produits',     1),
  ('Distributor', 'Distributeur', 2),
  ('Payments',    'Paiements',    3),
  ('Shipping',    'Livraison',    4)
on conflict do nothing;

alter table products
  add column if not exists is_featured    boolean default false,
  add column if not exists featured_order integer default 0;

alter table product_categories
  add column if not exists name_fr       text,
  add column if not exists display_order integer default 0,
  add column if not exists image_url     text,
  add column if not exists is_active     boolean default true;

update product_categories
  set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
  where slug is null or slug = '';

alter table product_categories enable row level security;
drop policy if exists "public_read_active_categories" on product_categories;
drop policy if exists "admin_categories_all"          on product_categories;
do $$ begin create policy "public_read_active_categories" on product_categories for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_categories_all" on product_categories for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

create table if not exists gallery_albums (
  id            uuid primary key default uuid_generate_v4(),
  name_en       text not null,
  name_fr       text,
  display_order integer default 0
);
alter table gallery_albums enable row level security;
drop policy if exists "public_read_albums" on gallery_albums;
drop policy if exists "admin_albums_all"   on gallery_albums;
do $$ begin create policy "public_read_albums" on gallery_albums for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_albums_all" on gallery_albums for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

alter table gallery_images
  add column if not exists album_id     uuid references gallery_albums(id) on delete set null,
  add column if not exists caption_en   text,
  add column if not exists display_order integer default 0,
  add column if not exists created_at   timestamptz default now();
-- caption_fr already added in 0006

update gallery_images
  set caption_en = caption
  where caption_en is null and caption is not null;


-- ══════════════════════════════════════════════════════════════════
-- 0009 — Image URL constraints (NOT VALID — safe on live data)
-- ══════════════════════════════════════════════════════════════════

alter table blog_posts
  drop constraint if exists blog_featured_image_supabase_hosted;
alter table blog_posts
  add constraint blog_featured_image_supabase_hosted
  check (image is null or image = '' or image like 'https://auyjxchghtetxpiyecds.supabase.co/storage/%')
  not valid;

alter table gallery_images
  drop constraint if exists gallery_image_url_supabase_hosted;
alter table gallery_images
  add constraint gallery_image_url_supabase_hosted
  check (url is null or url = '' or url like 'https://auyjxchghtetxpiyecds.supabase.co/storage/%')
  not valid;

alter table product_categories
  drop constraint if exists product_category_image_supabase_hosted;
alter table product_categories
  add constraint product_category_image_supabase_hosted
  check (image_url is null or image_url = '' or image_url like 'https://auyjxchghtetxpiyecds.supabase.co/storage/%')
  not valid;

alter table testimonials
  drop constraint if exists testimonials_image_url_supabase_hosted;
alter table testimonials
  add constraint testimonials_image_url_supabase_hosted
  check (image is null or image = '' or image like 'https://auyjxchghtetxpiyecds.supabase.co/storage/%')
  not valid;

-- After re-hosting all external images, run these to fully enforce:
-- alter table blog_posts         validate constraint blog_featured_image_supabase_hosted;
-- alter table gallery_images     validate constraint gallery_image_url_supabase_hosted;
-- alter table product_categories validate constraint product_category_image_supabase_hosted;
-- alter table testimonials       validate constraint testimonials_image_url_supabase_hosted;


-- ══════════════════════════════════════════════════════════════════
-- 0010 — Homepage sections CMS
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.homepage_sections (
  id          uuid primary key default uuid_generate_v4(),
  section_key text unique not null,
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now(),
  updated_by  uuid references public.profiles(id)
);
alter table public.homepage_sections enable row level security;
drop policy if exists "public_read_homepage_sections" on public.homepage_sections;
drop policy if exists "admin_homepage_sections_all"   on public.homepage_sections;
do $$ begin
  create policy "public_read_homepage_sections" on public.homepage_sections for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_homepage_sections_all" on public.homepage_sections for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

insert into public.homepage_sections (section_key, content) values
  ('hero', '{
    "headline_en": "Transform Your Life With Songtai Life",
    "headline_fr": "Transformez Votre Vie Avec Songtai Life",
    "subheadline_en": "Health. Opportunity. Prosperity.",
    "subheadline_fr": "Santé. Opportunité. Prospérité.",
    "cta_primary_en": "Become a Distributor",
    "cta_primary_fr": "Devenir Distributeur",
    "cta_secondary_en": "Explore Products",
    "cta_secondary_fr": "Explorer les Produits"
  }'::jsonb),
  ('company_intro', '{
    "story_en": "", "story_fr": "",
    "stat_countries": 12, "stat_members": 42800,
    "stat_products": 24, "stat_years": 8, "stat_awards": 15
  }'::jsonb),
  ('opportunity', '{
    "steps": [
      {"label_en": "Join", "label_fr": "Rejoindre", "desc_en": "Register as a distributor and access our full product line.", "desc_fr": "Inscrivez-vous comme distributeur et accédez à toute notre gamme de produits."},
      {"label_en": "Grow", "label_fr": "Grandir",   "desc_en": "Build your customer base and recruit your downline team.",  "desc_fr": "Développez votre clientèle et recrutez votre équipe de filleuls."},
      {"label_en": "Lead", "label_fr": "Diriger",   "desc_en": "Mentor your team, earn leadership bonuses, and level up your rank.", "desc_fr": "Encadrez votre équipe, gagnez des bonus de leadership et montez en grade."},
      {"label_en": "Earn", "label_fr": "Gagner",    "desc_en": "Unlock mobile money payouts, rank rewards, and monthly residuals.", "desc_fr": "Débloquez des paiements mobile money, des récompenses de rang et des revenus résiduels mensuels."}
    ]
  }'::jsonb),
  ('benefits', '{
    "headline_en": "Why Join Songtai Life?",
    "headline_fr": "Pourquoi Rejoindre Songtai Life ?",
    "sub_en": "Proven products. Real commissions. A community that grows together.",
    "sub_fr": "Des produits éprouvés. De vraies commissions. Une communauté qui grandit ensemble.",
    "items": [
      {"icon": "Award",      "title_en": "Rank-Based Rewards",        "title_fr": "Récompenses basées sur le rang",    "desc_en": "Climb from Bronze to Diamond and unlock exclusive bonuses at every level.",                    "desc_fr": "Passez de Bronze à Diamond et débloquez des bonus exclusifs à chaque niveau."},
      {"icon": "TrendingUp", "title_en": "5-Level Commission Engine", "title_fr": "Moteur de commission sur 5 niveaux","desc_en": "Earn unilevel overrides up to 5 levels deep — your team''s success is your success.",         "desc_fr": "Gagnez des remplacements unilevel jusqu''à 5 niveaux — le succès de votre équipe est le vôtre."},
      {"icon": "Users",      "title_en": "Mobile Money Payouts",      "title_fr": "Paiements en argent mobile",        "desc_en": "Receive commissions directly to your MTN or Orange Money wallet — no bank account needed.", "desc_fr": "Recevez des commissions directement sur votre portefeuille MTN ou Orange Money."}
    ]
  }'::jsonb),
  ('newsletter', '{
    "headline_en": "Stay Ahead With Insider News",
    "headline_fr": "Restez en avance avec les nouvelles exclusives",
    "body_en": "Product drops, rank promotions, event alerts, and distributor tips — straight to your inbox.",
    "body_fr": "Nouveaux produits, promotions de rang, alertes événements et conseils de distributeur — directement dans votre boîte mail."
  }'::jsonb)
on conflict (section_key) do nothing;


-- ══════════════════════════════════════════════════════════════════
-- 0011 — MeSomb webhook event deduplication
-- ══════════════════════════════════════════════════════════════════

create table if not exists mesomb_webhook_events (
  id          uuid primary key default uuid_generate_v4(),
  event_id    text unique not null,
  event_type  text not null,
  payload     jsonb not null,
  received_at timestamptz default now()
);
alter table mesomb_webhook_events enable row level security;
do $$ begin
  create policy "admin_read_webhook_events" on mesomb_webhook_events for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','superadmin')));
exception when duplicate_object then null; end $$;

alter table orders
  add column if not exists mesomb_transaction_id text;


-- ══════════════════════════════════════════════════════════════════
-- 0012 — Unified page_sections CMS
-- ══════════════════════════════════════════════════════════════════

create table if not exists page_sections (
  id            uuid primary key default uuid_generate_v4(),
  page_key      text not null,
  section_key   text not null,
  content       jsonb not null default '{}',
  display_order integer default 0,
  updated_at    timestamptz default now(),
  updated_by    uuid references profiles(id),
  unique (page_key, section_key)
);
alter table page_sections enable row level security;
do $$ begin
  create policy "public_read_page_sections" on page_sections for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin_page_sections_all" on page_sections for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','superadmin','content_editor')))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','superadmin','content_editor')));
exception when duplicate_object then null; end $$;

create or replace function update_page_sections_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger: drop first so re-running never errors
drop trigger if exists page_sections_updated_at on page_sections;
create trigger page_sections_updated_at
  before update on page_sections
  for each row execute function update_page_sections_timestamp();

-- Migrate existing homepage_sections → page_sections (idempotent)
insert into page_sections (page_key, section_key, content)
select 'home', section_key, content from homepage_sections
on conflict (page_key, section_key) do nothing;


-- ══════════════════════════════════════════════════════════════════
-- 0013 — Product video fields
-- ══════════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists video_url_en           text,
  add column if not exists video_url_fr           text,
  add column if not exists video_thumbnail_en     text,
  add column if not exists video_thumbnail_fr     text,
  add column if not exists video_duration_seconds integer,
  add column if not exists video_title_en         text,
  add column if not exists video_title_fr         text,
  add column if not exists video_description_en   text,
  add column if not exists video_description_fr   text;

-- Backfill missing slugs from name_en (safe no-op if all slugs exist)
update public.products
  set slug = lower(regexp_replace(trim(name_en), '[^a-zA-Z0-9]+', '-', 'g'))
  where (slug is null or slug = '')
    and name_en is not null
    and name_en != '';

-- Storage: product-videos bucket policies
drop policy if exists "public_read_product_videos"  on storage.objects;
drop policy if exists "admin_insert_product_videos" on storage.objects;
drop policy if exists "admin_update_product_videos" on storage.objects;
drop policy if exists "admin_delete_product_videos" on storage.objects;

do $$ begin create policy "public_read_product_videos"  on storage.objects for select using (bucket_id = 'product-videos');
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_insert_product_videos" on storage.objects for insert with check (bucket_id = 'product-videos');
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_update_product_videos" on storage.objects for update using (bucket_id = 'product-videos');
exception when duplicate_object then null; end $$;
do $$ begin create policy "admin_delete_product_videos" on storage.objects for delete using (bucket_id = 'product-videos');
exception when duplicate_object then null; end $$;
