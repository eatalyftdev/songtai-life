-- ============================================================
-- 0006_site_settings_appointments.sql
-- Site settings singleton, appointment booking, testimonials
-- and gallery extensions, storage policies.
-- ============================================================

-- ── 1. SITE SETTINGS — singleton key/value config table ──────
create table if not exists public.site_settings (
  id          uuid primary key default uuid_generate_v4(),
  key         text unique not null,
  value       jsonb not null,
  updated_at  timestamptz default now(),
  updated_by  uuid references public.profiles(id)
);

alter table public.site_settings enable row level security;

drop policy if exists "public_settings_read"  on public.site_settings;
drop policy if exists "admin_settings_write"  on public.site_settings;

create policy "public_settings_read" on public.site_settings
  for select using (true);

create policy "admin_settings_write" on public.site_settings
  for all using (is_admin()) with check (is_admin());

-- Seed defaults (idempotent)
insert into public.site_settings (key, value) values
  ('whatsapp',    '{"number": "", "default_message": "Hi Songtai Life, I would like to know more!", "enabled": false}'),
  ('analytics',   '{"gtm_id": "", "ga4_id": "", "enabled": false}'),
  ('socials',     '{"facebook": "", "instagram": "", "tiktok": "", "whatsapp": "", "youtube": "", "linkedin": ""}'),
  ('seo_defaults','{"site_title": "Songtai Life", "meta_description": "Health. Opportunity. Prosperity. Premium natural products from West African botanical heritage.", "og_image_url": ""}')
on conflict (key) do nothing;

-- ── 2. APPOINTMENT TYPES (admin-managed) ─────────────────────
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

create policy "public_read_appointment_types" on public.appointment_types
  for select using (is_active = true);

create policy "admin_appointment_types_all" on public.appointment_types
  for all using (is_admin()) with check (is_admin());

-- Seed default types
insert into public.appointment_types (name_en, name_fr, duration_minutes, description_en, description_fr, display_order) values
  ('Product Consultation',        'Consultation Produit',       30, 'Learn about our wellness product range.',                          'Découvrez notre gamme de produits bien-être.',          1),
  ('Distributor Onboarding',      'Intégration Distributeur',   45, 'Get started as a Songtai Life distributor.',                       'Rejoignez le réseau Songtai Life en tant que distributeur.', 2),
  ('General Inquiry',             'Renseignement Général',      20, 'Any other question — we are happy to help.',                       'Toute autre question — nous sommes là pour vous aider.', 3)
on conflict do nothing;

-- ── 3. APPOINTMENTS (public booking) ─────────────────────────
create table if not exists public.appointments (
  id                    uuid primary key default uuid_generate_v4(),
  appointment_type_id   uuid references public.appointment_types(id),
  name                  text not null,
  email                 text not null,
  phone                 text,
  preferred_date        date not null,
  preferred_time        time not null,
  message               text,
  status                text default 'requested'
                          check (status in ('requested','confirmed','completed','cancelled')),
  created_at            timestamptz default now()
);

alter table public.appointments enable row level security;

drop policy if exists "public_insert_appointments" on public.appointments;
drop policy if exists "admin_appointments_all"      on public.appointments;

create policy "public_insert_appointments" on public.appointments
  for insert with check (true);

create policy "admin_appointments_all" on public.appointments
  for all using (is_admin()) with check (is_admin());

-- ── 4. EXTEND TESTIMONIALS ────────────────────────────────────
alter table public.testimonials
  add column if not exists quote_fr       text,
  add column if not exists is_featured    boolean default false,
  add column if not exists display_order  integer default 0;

-- ── 5. EXTEND GALLERY ─────────────────────────────────────────
alter table public.gallery_images
  add column if not exists caption_fr        text,
  add column if not exists display_order     integer default 0,
  add column if not exists uploaded_by       uuid references public.profiles(id),
  add column if not exists file_size_bytes   integer,
  add column if not exists mime_type         text;

-- ── 6. STORAGE POLICIES ───────────────────────────────────────
-- Note: create buckets 'media', 'documents', 'testimonials' via Supabase Dashboard
-- or supabase-js storage admin API before applying these policies.

-- Public read access
drop policy if exists "public_read_media"        on storage.objects;
drop policy if exists "public_read_documents"    on storage.objects;
drop policy if exists "public_read_testimonials" on storage.objects;
create policy "public_read_media"        on storage.objects for select using (bucket_id = 'media');
create policy "public_read_documents"    on storage.objects for select using (bucket_id = 'documents');
create policy "public_read_testimonials" on storage.objects for select using (bucket_id = 'testimonials');

-- Admin write access
drop policy if exists "admin_insert_media"        on storage.objects;
drop policy if exists "admin_update_media"         on storage.objects;
drop policy if exists "admin_delete_media"         on storage.objects;
drop policy if exists "admin_insert_documents"     on storage.objects;
drop policy if exists "admin_update_documents"     on storage.objects;
drop policy if exists "admin_delete_documents"     on storage.objects;
drop policy if exists "admin_insert_testimonials"  on storage.objects;
drop policy if exists "admin_update_testimonials"  on storage.objects;
drop policy if exists "admin_delete_testimonials"  on storage.objects;

create policy "admin_insert_media"       on storage.objects for insert with check (bucket_id = 'media'        and is_admin());
create policy "admin_update_media"       on storage.objects for update using      (bucket_id = 'media'        and is_admin());
create policy "admin_delete_media"       on storage.objects for delete using      (bucket_id = 'media'        and is_admin());

create policy "admin_insert_documents"   on storage.objects for insert with check (bucket_id = 'documents'    and is_admin());
create policy "admin_update_documents"   on storage.objects for update using      (bucket_id = 'documents'    and is_admin());
create policy "admin_delete_documents"   on storage.objects for delete using      (bucket_id = 'documents'    and is_admin());

create policy "admin_insert_testimonials" on storage.objects for insert with check (bucket_id = 'testimonials' and is_admin());
create policy "admin_update_testimonials" on storage.objects for update using      (bucket_id = 'testimonials' and is_admin());
create policy "admin_delete_testimonials" on storage.objects for delete using      (bucket_id = 'testimonials' and is_admin());
