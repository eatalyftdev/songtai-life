-- ============================================================
-- 0007_order_delivery_whatsapp.sql
-- Delivery address fields on orders, WhatsApp notification
-- tracking, and order_notifications site setting.
-- ============================================================

-- ── 1. DELIVERY FIELDS on orders ─────────────────────────────
alter table public.orders
  add column if not exists customer_name         text,
  add column if not exists customer_phone        text,
  add column if not exists delivery_address      text,
  add column if not exists delivery_notes        text;

-- ── 2. WHATSAPP NOTIFICATION TRACKING ────────────────────────
alter table public.orders
  add column if not exists whatsapp_notified       boolean   not null default false,
  add column if not exists whatsapp_notified_at    timestamptz,
  add column if not exists whatsapp_notification_error text;

-- ── 3. BLOG POSTS — add created_at if missing ────────────────
alter table public.blog_posts
  add column if not exists created_at timestamptz default now();

alter table public.blog_posts
  add column if not exists title_fr text;

-- ── 4. TESTIMONIALS — add missing columns ────────────────────
alter table public.testimonials
  add column if not exists quote_fr      text,
  add column if not exists image         text,
  add column if not exists is_featured   boolean not null default false,
  add column if not exists display_order integer not null default 0;

-- ── 5. ORDER NOTIFICATIONS site setting ──────────────────────
insert into public.site_settings (key, value) values
  ('order_notifications', '{"whatsapp_number": "", "enabled": false}')
on conflict (key) do nothing;
