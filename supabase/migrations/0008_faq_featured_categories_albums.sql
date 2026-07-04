-- ================================================================
-- 0008: FAQ tables, Featured Products flags, Product Categories
--       enhancements, Gallery Albums table
-- ================================================================

-- ── 1. FAQ TABLES ────────────────────────────────────────────────
create table if not exists faq_categories (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_fr text,
  display_order integer default 0
);

create table if not exists faqs (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references faq_categories(id) on delete set null,
  question_en text not null,
  question_fr text,
  answer_en text not null,
  answer_fr text,
  display_order integer default 0,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table faq_categories enable row level security;
alter table faqs enable row level security;

create policy "public_read_faq_categories"
  on faq_categories for select using (true);
create policy "admin_faq_categories_all"
  on faq_categories for all using (is_admin()) with check (is_admin());

create policy "public_read_published_faqs"
  on faqs for select using (is_published = true);
create policy "admin_faqs_all"
  on faqs for all using (is_admin()) with check (is_admin());

-- Seed FAQ categories to match the existing hardcoded categories on the public page
insert into faq_categories (name_en, name_fr, display_order) values
  ('Products',     'Produits',      1),
  ('Distributor',  'Distributeur',  2),
  ('Payments',     'Paiements',     3),
  ('Shipping',     'Livraison',     4)
on conflict do nothing;

-- ── 2. PRODUCTS — FEATURED FLAGS ─────────────────────────────────
alter table products
  add column if not exists is_featured boolean default false,
  add column if not exists featured_order integer default 0;

-- ── 3. PRODUCT CATEGORIES — MISSING COLUMNS + RLS ────────────────
-- slug already exists; add the rest
alter table product_categories
  add column if not exists name_fr text,
  add column if not exists display_order integer default 0,
  add column if not exists image_url text,
  add column if not exists is_active boolean default true;

-- Backfill slug from name where slug might be missing (safe no-op if all slugs exist)
update product_categories
  set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
  where slug is null or slug = '';

-- Enable RLS (was not enabled before — existing rows default is_active = true so public read still works)
alter table product_categories enable row level security;

create policy "public_read_active_categories"
  on product_categories for select using (is_active = true);
create policy "admin_categories_all"
  on product_categories for all using (is_admin()) with check (is_admin());

-- ── 4. GALLERY ALBUMS ────────────────────────────────────────────
create table if not exists gallery_albums (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_fr text,
  display_order integer default 0
);

alter table gallery_albums enable row level security;
create policy "public_read_albums"  on gallery_albums for select using (true);
create policy "admin_albums_all"    on gallery_albums for all using (is_admin()) with check (is_admin());

-- ── 5. GALLERY IMAGES — MISSING COLUMNS ──────────────────────────
alter table gallery_images
  add column if not exists album_id uuid references gallery_albums(id) on delete set null,
  add column if not exists caption_en text,
  add column if not exists caption_fr text,
  add column if not exists display_order integer default 0,
  add column if not exists created_at timestamptz default now();

-- Backfill existing plain caption -> caption_en
update gallery_images
  set caption_en = caption
  where caption_en is null and caption is not null;
