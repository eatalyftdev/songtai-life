-- ============================================================
-- 0005_schema_additions.sql
-- Auth hardening, RBAC, rate limiting, bilingual products,
-- hero carousel, and misc schema additions.
-- ============================================================

-- ── 1. PROFILES ──────────────────────────────────────────────
-- Add must_change_password flag (admin bootstrap flow)
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- ── 2. HARDEN EXISTING is_admin() ────────────────────────────
-- Pin search_path to prevent schema-injection attacks
create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

-- ── 3. CONTENT EDITOR ROLE ───────────────────────────────────
create or replace function public.is_content_editor_or_above()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('content_editor', 'admin', 'superadmin')
  );
$$;

-- Blog posts: allow content editors to write
drop policy if exists "editor_blog_posts_write" on public.blog_posts;
create policy "editor_blog_posts_write" on public.blog_posts
  for all
  using (is_content_editor_or_above())
  with check (is_content_editor_or_above());

-- Events: allow content editors to write
drop policy if exists "editor_events_write" on public.events;
create policy "editor_events_write" on public.events
  for all
  using (is_content_editor_or_above())
  with check (is_content_editor_or_above());

-- ── 4. RATE LIMITING ─────────────────────────────────────────
create table if not exists public.rate_limit_events (
  id          uuid primary key default uuid_generate_v4(),
  bucket      text not null,       -- e.g. 'login', 'contact_form', 'newsletter'
  identifier  text not null,       -- IP or email
  created_at  timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (bucket, identifier, created_at);

-- RLS: no direct client access — only via security-definer function
alter table public.rate_limit_events enable row level security;

drop policy if exists "rate_limit_no_direct_access" on public.rate_limit_events;
create policy "rate_limit_no_direct_access" on public.rate_limit_events
  for all using (false);

create or replace function public.check_rate_limit(
  p_bucket       text,
  p_identifier   text,
  p_max_attempts int,
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

  insert into public.rate_limit_events (bucket, identifier)
  values (p_bucket, p_identifier);

  return true;
end;
$$;

-- ── 5. BILINGUAL PRODUCTS ────────────────────────────────────
-- Rename English columns
alter table public.products
  rename column name        to name_en;

alter table public.products
  rename column description to description_en;

-- Add French translation columns
alter table public.products
  add column if not exists name_fr         text,
  add column if not exists description_fr  text,
  add column if not exists strike_price_xaf integer;

-- ── 6. HERO CAROUSEL ─────────────────────────────────────────
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

drop policy if exists "hero_carousel_public_read" on public.hero_carousel;
create policy "hero_carousel_public_read" on public.hero_carousel
  for select using (is_active = true);

drop policy if exists "hero_carousel_admin_write" on public.hero_carousel;
create policy "hero_carousel_admin_write" on public.hero_carousel
  for all using (is_admin()) with check (is_admin());

-- Seed default carousel images
insert into public.hero_carousel (image_url, title_en, title_fr, subtitle_en, subtitle_fr, sort_order)
values
  (
    'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=1600',
    'Cellular Vitality Pro',
    'Vitalité Cellulaire Pro',
    'Advanced antioxidants from West African botanical heritage',
    'Antioxydants avancés du patrimoine botanique ouest-africain',
    1
  ),
  (
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1600',
    'Luminous Gold Elixir',
    'Élixir Or Lumineux',
    'Ultra-premium face serum with cold-pressed argan oil',
    'Sérum visage ultra-premium à l''huile d''argan pressée à froid',
    2
  ),
  (
    'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1600',
    'Bio-Yield Max',
    'Bio-Rendement Max',
    'Ecological bio-stimulant for maximum harvest yield',
    'Bio-stimulant écologique pour un rendement maximal des récoltes',
    3
  )
on conflict do nothing;

-- ── 7. ADMIN SEED SCRIPT INSTRUCTIONS ───────────────────────
-- To create the initial superadmin account, run the server endpoint:
--   POST /api/admin/bootstrap
-- with body: { "bootstrapKey": "<value of ADMIN_BOOTSTRAP_KEY env var>" }
-- This uses the service-role key to bypass email validation.
-- Never hardcode admin credentials in the frontend.
