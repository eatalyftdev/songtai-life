-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0015: Media Center (admin + public + distributor)
-- Run via: Supabase Dashboard > SQL Editor, or `supabase db push`
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists media_categories (
  id uuid primary key default uuid_generate_v4(),
  category_key text not null unique,
  name_en text not null,
  name_fr text not null,
  display_order integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists media_assets (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references media_categories(id) on delete cascade,
  title_en text not null,
  title_fr text not null,
  description_en text,
  description_fr text,
  file_url text not null,
  thumbnail_url text,
  file_type text not null check (file_type in ('video', 'audio', 'document', 'image', 'archive')),
  mime_type text,
  file_size_bytes bigint,
  visibility text not null default 'public' check (visibility in ('public', 'distributor_only')),
  is_published boolean not null default true,
  download_count integer not null default 0,
  display_order integer not null default 0,
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists media_assets_category_idx on media_assets(category_id);
create index if not exists media_assets_visibility_idx on media_assets(visibility, is_published);

create or replace function update_media_assets_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists media_assets_updated_at on media_assets;
create trigger media_assets_updated_at
  before update on media_assets
  for each row execute function update_media_assets_timestamp();

insert into media_categories (category_key, name_en, name_fr, display_order) values
  ('corporate_videos',    'Corporate Videos',     'Vidéos corporatives',        1),
  ('anthem_audio',        'Brand Anthem',         'Hymne de la marque',         2),
  ('brand_documents',     'Brand Documents',      'Documents de marque',        3),
  ('marketing_materials', 'Marketing Materials',  'Supports marketing',         4),
  ('product_media',       'Product Media',        'Médias produits',           5),
  ('training_materials',  'Training Materials',   'Supports de formation',      6)
on conflict (category_key) do nothing;

-- ── Helper: is the current user an authenticated distributor? ─────────────
create or replace function is_distributor()
returns boolean language sql security definer stable as $$
  select exists (select 1 from distributors where id = auth.uid());
$$;

-- ── Atomic, server-trusted download counter ────────────────────────────────
create or replace function increment_media_download_count(p_asset_id uuid)
returns void language sql security definer as $$
  update media_assets set download_count = download_count + 1 where id = p_asset_id;
$$;

alter table media_categories enable row level security;
alter table media_assets     enable row level security;

drop policy if exists "public_read_media_categories" on media_categories;
create policy "public_read_media_categories" on media_categories for select using (true);

drop policy if exists "admin_media_categories_all" on media_categories;
create policy "admin_media_categories_all" on media_categories for all
  using (is_admin()) with check (is_admin());

drop policy if exists "public_read_public_media_assets" on media_assets;
create policy "public_read_public_media_assets" on media_assets for select
  using (visibility = 'public' and is_published = true);

drop policy if exists "distributor_read_media_assets" on media_assets;
create policy "distributor_read_media_assets" on media_assets for select
  using (is_published = true and is_distributor());

drop policy if exists "admin_media_assets_all" on media_assets;
create policy "admin_media_assets_all" on media_assets for all
  using (is_admin()) with check (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: media-center bucket (public read, admin-only write — same model
-- as the existing `media` / `product-videos` buckets in this project).
-- Note: distributor_only gating happens at the media_assets row level (RLS
-- above); the storage bucket itself is public like the project's other
-- buckets, so a raw storage URL is not access-controlled by itself.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('media-center', 'media-center', true)
on conflict (id) do nothing;

drop policy if exists "public_read_media_center"  on storage.objects;
drop policy if exists "admin_insert_media_center"  on storage.objects;
drop policy if exists "admin_update_media_center"  on storage.objects;
drop policy if exists "admin_delete_media_center"  on storage.objects;

create policy "public_read_media_center"
  on storage.objects for select
  using (bucket_id = 'media-center');

create policy "admin_insert_media_center"
  on storage.objects for insert
  with check (bucket_id = 'media-center' and is_admin());

create policy "admin_update_media_center"
  on storage.objects for update
  using (bucket_id = 'media-center' and is_admin());

create policy "admin_delete_media_center"
  on storage.objects for delete
  using (bucket_id = 'media-center' and is_admin());
