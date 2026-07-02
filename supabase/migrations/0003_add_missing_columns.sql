-- =========================================================
-- SONGTAI LIFE — Add columns missing from initial migration
-- =========================================================

-- blog_posts: add excerpt, author, image, and direct category text
alter table blog_posts add column if not exists excerpt text;
alter table blog_posts add column if not exists author text;
alter table blog_posts add column if not exists image text;
alter table blog_posts add column if not exists category text;

-- events: add description, image, registrants
alter table events add column if not exists description text;
alter table events add column if not exists image text;
alter table events add column if not exists registrants text[] default '{}';

-- contact_messages: add phone, status
alter table contact_messages add column if not exists phone text;
alter table contact_messages add column if not exists status text default 'unread'
  check (status in ('unread','read','responded'));

-- newsletter_subscribers: add created_at
alter table newsletter_subscribers add column if not exists created_at timestamptz default now();

-- audit_logs: add admin_email, action, details (more descriptive than event/payload)
alter table audit_logs add column if not exists admin_email text;
alter table audit_logs add column if not exists action text;
alter table audit_logs add column if not exists details text;

-- products: add a direct `stock` integer column and single `image` alias
-- (the table already has `images text[]`; we add stock and a convenience image column)
alter table products add column if not exists stock integer default 0;
alter table products add column if not exists image text
  generated always as (images[1]) stored;
