-- =========================================================
-- SONGTAI LIFE — Fix RLS policies
-- 1. Add admin/superadmin bypass policies for all tables
-- 2. Remove permissive wallet balance direct-update policy
-- =========================================================

-- Helper: reusable admin check function
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  );
$$;

-- ── profiles ────────────────────────────────────────────
create policy "admin_profiles_all" on profiles
  for all
  using (is_admin())
  with check (is_admin());

-- ── distributors ─────────────────────────────────────────
create policy "admin_distributors_all" on distributors
  for all
  using (is_admin())
  with check (is_admin());

-- ── wallets ──────────────────────────────────────────────
-- Remove the dangerously permissive direct balance update policy
drop policy if exists "wallets_update_own" on wallets;

-- Admins may read all wallets
create policy "admin_wallets_read" on wallets
  for select
  using (is_admin());

-- Users may still read their own wallet (existing select policy should cover this,
-- but ensure it exists)
create policy "wallets_select_own" on wallets
  for select
  using (auth.uid() = id);

-- ── wallet_transactions ──────────────────────────────────
create policy "admin_wallet_transactions_all" on wallet_transactions
  for all
  using (is_admin())
  with check (is_admin());

-- ── commissions ─────────────────────────────────────────
create policy "admin_commissions_all" on commissions
  for all
  using (is_admin())
  with check (is_admin());

-- ── withdrawals ─────────────────────────────────────────
create policy "admin_withdrawals_all" on withdrawals
  for all
  using (is_admin())
  with check (is_admin());

-- ── orders ───────────────────────────────────────────────
create policy "admin_orders_all" on orders
  for all
  using (is_admin())
  with check (is_admin());

-- ── kyc_documents ────────────────────────────────────────
create policy "admin_kyc_all" on kyc_documents
  for all
  using (is_admin())
  with check (is_admin());

-- ── processed_payments ───────────────────────────────────
create policy "admin_processed_payments_all" on processed_payments
  for all
  using (is_admin())
  with check (is_admin());

-- ── audit_logs ───────────────────────────────────────────
create policy "admin_audit_logs_all" on audit_logs
  for all
  using (is_admin())
  with check (is_admin());

-- ── blog_posts ───────────────────────────────────────────
alter table if exists blog_posts enable row level security;
create policy "public_blog_posts_read" on blog_posts
  for select using (true);
create policy "admin_blog_posts_all" on blog_posts
  for all using (is_admin()) with check (is_admin());

-- ── events ───────────────────────────────────────────────
alter table if exists events enable row level security;
create policy "public_events_read" on events
  for select using (true);
create policy "admin_events_all" on events
  for all using (is_admin()) with check (is_admin());

-- ── contact_messages ─────────────────────────────────────
alter table if exists contact_messages enable row level security;
create policy "public_contact_messages_insert" on contact_messages
  for insert with check (true);
create policy "admin_contact_messages_all" on contact_messages
  for all using (is_admin()) with check (is_admin());

-- ── newsletter_subscribers ───────────────────────────────
alter table if exists newsletter_subscribers enable row level security;
create policy "public_newsletter_insert" on newsletter_subscribers
  for insert with check (true);
create policy "admin_newsletter_all" on newsletter_subscribers
  for all using (is_admin()) with check (is_admin());

-- ── products ─────────────────────────────────────────────
alter table if exists products enable row level security;
create policy "public_products_read" on products
  for select using (true);
create policy "admin_products_all" on products
  for all using (is_admin()) with check (is_admin());
