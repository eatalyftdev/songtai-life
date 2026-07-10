-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0014: Per-locale video source toggle (uploaded file vs YouTube link)
-- Run via: Supabase Dashboard > SQL Editor, or `supabase db push`
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.products
  add column if not exists video_source_en text not null default 'upload',
  add column if not exists video_source_fr text not null default 'upload';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_video_source_en_check'
  ) then
    alter table public.products
      add constraint products_video_source_en_check
      check (video_source_en in ('upload', 'youtube'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'products_video_source_fr_check'
  ) then
    alter table public.products
      add constraint products_video_source_fr_check
      check (video_source_fr in ('upload', 'youtube'));
  end if;
end $$;
