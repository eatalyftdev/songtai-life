-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0013: Product video fields (bilingual EN/FR)
-- Run via: Supabase Dashboard > SQL Editor, or `supabase db push`
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.products
  add column if not exists video_url_en          text,
  add column if not exists video_url_fr          text,
  add column if not exists video_thumbnail_en    text,
  add column if not exists video_thumbnail_fr    text,
  add column if not exists video_duration_seconds integer,
  add column if not exists video_title_en        text,
  add column if not exists video_title_fr        text,
  add column if not exists video_description_en  text,
  add column if not exists video_description_fr  text;

-- Backfill missing/malformed slugs from name_en
update public.products
set slug = lower(regexp_replace(trim(name_en), '[^a-zA-Z0-9]+', '-', 'g'))
where (slug is null or slug = '')
  and name_en is not null
  and name_en != '';

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: product-videos bucket
-- Create manually in Supabase Dashboard > Storage > New Bucket:
--   Name: product-videos
--   Public: true
--   File size limit: max your plan allows (Pro plan recommended for video)
--
-- Then run these RLS policies:
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "public_read_product_videos"   on storage.objects;
drop policy if exists "admin_insert_product_videos"  on storage.objects;
drop policy if exists "admin_update_product_videos"  on storage.objects;
drop policy if exists "admin_delete_product_videos"  on storage.objects;

create policy "public_read_product_videos"
  on storage.objects for select
  using (bucket_id = 'product-videos');

create policy "admin_insert_product_videos"
  on storage.objects for insert
  with check (bucket_id = 'product-videos');

create policy "admin_update_product_videos"
  on storage.objects for update
  using (bucket_id = 'product-videos');

create policy "admin_delete_product_videos"
  on storage.objects for delete
  using (bucket_id = 'product-videos');
