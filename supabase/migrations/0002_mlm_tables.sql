-- =========================================================
-- SONGTAI LIFE — MLM CORE TABLES
-- =========================================================

-- 1. User Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  role text not null default 'customer'
    check (role in ('customer','distributor','content_editor','admin','superadmin')),
  locale text default 'fr',
  privacy_accepted_at timestamptz,
  privacy_accepted_version text,
  created_at timestamptz default now()
);

-- 2. Distributors
create table if not exists distributors (
  id uuid primary key references auth.users(id) on delete cascade,
  distributor_code text unique not null,
  sponsor_id text,
  placement_id text,
  rank text default 'bronze'
    check (rank in ('bronze','silver','gold','platinum','diamond')),
  kyc_status text default 'none'
    check (kyc_status in ('none','pending','verified','rejected')),
  pv integer default 0,
  joined_at timestamptz default now()
);

-- 3. Wallets
create table if not exists wallets (
  id uuid primary key references auth.users(id) on delete cascade,
  balance_xaf integer default 0,
  updated_at timestamptz default now()
);

-- 4. Wallet Transactions
create table if not exists wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  wallet_id uuid references auth.users(id) not null,
  type text not null check (type in ('commission','withdrawal','adjustment','refund')),
  amount_xaf integer not null,
  reference_id text,
  description text,
  status text default 'completed' check (status in ('pending','completed','failed')),
  created_at timestamptz default now()
);
create index if not exists idx_wallet_tx_wallet_id on wallet_transactions(wallet_id);

-- 5. Commissions
create table if not exists commissions (
  id uuid primary key default uuid_generate_v4(),
  distributor_id uuid references auth.users(id) not null,
  order_id text not null,
  type text not null,
  level integer default 0,
  amount_xaf integer not null,
  status text default 'completed',
  created_at timestamptz default now()
);
create index if not exists idx_commissions_distributor_id on commissions(distributor_id);

-- 6. Withdrawals
create table if not exists withdrawals (
  id uuid primary key default uuid_generate_v4(),
  distributor_id uuid references auth.users(id) not null,
  amount_xaf integer not null,
  method text not null,
  status text default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz default now()
);
create index if not exists idx_withdrawals_distributor_id on withdrawals(distributor_id);

-- 7. Orders
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_id text unique not null,
  user_id text not null,
  amount_xaf integer not null,
  pv_points integer default 0,
  phone text,
  provider text,
  cart jsonb default '[]',
  status text default 'pending' check (status in ('pending','paid','failed','refunded')),
  transaction_id text,
  paid_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_orders_order_id on orders(order_id);
create index if not exists idx_orders_user_id on orders(user_id);

-- 8. KYC Documents
create table if not exists kyc_documents (
  id text primary key,
  distributor_id uuid references auth.users(id) not null,
  document_type text,
  file_url text,
  status text default 'pending' check (status in ('pending','verified','rejected')),
  created_at timestamptz default now()
);
create index if not exists idx_kyc_distributor_id on kyc_documents(distributor_id);

-- 9. Processed Payments (idempotency ledger)
create table if not exists processed_payments (
  order_id text primary key,
  transaction_id text,
  processed_at timestamptz default now()
);

-- 10. Audit Logs
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  event text not null,
  payload jsonb,
  created_at timestamptz default now()
);

-- =========================================================
-- RLS
-- =========================================================
alter table profiles enable row level security;
alter table distributors enable row level security;
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table commissions enable row level security;
alter table withdrawals enable row level security;
alter table orders enable row level security;
alter table kyc_documents enable row level security;

-- Profiles
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Distributors: users can read their own row; full list readable for downline queries
create policy "distributors_select_own" on distributors for select using (true);
create policy "distributors_insert_own" on distributors for insert with check (auth.uid() = id);
create policy "distributors_update_own" on distributors for update using (auth.uid() = id);

-- Wallets
create policy "wallets_select_own" on wallets for select using (auth.uid() = id);
create policy "wallets_insert_own" on wallets for insert with check (auth.uid() = id);
create policy "wallets_update_own" on wallets for update using (auth.uid() = id);

-- Wallet Transactions
create policy "wallet_tx_select_own" on wallet_transactions for select using (auth.uid() = wallet_id);
create policy "wallet_tx_insert_own" on wallet_transactions for insert with check (auth.uid() = wallet_id);

-- Commissions
create policy "commissions_select_own" on commissions for select using (auth.uid() = distributor_id);

-- Withdrawals
create policy "withdrawals_select_own" on withdrawals for select using (auth.uid() = distributor_id);
create policy "withdrawals_insert_own" on withdrawals for insert with check (auth.uid() = distributor_id);

-- Orders
create policy "orders_select_own" on orders for select using (auth.uid()::text = user_id);

-- KYC Documents
create policy "kyc_select_own" on kyc_documents for select using (auth.uid() = distributor_id);
create policy "kyc_insert_own" on kyc_documents for insert with check (auth.uid() = distributor_id);
create policy "kyc_upsert_own" on kyc_documents for update using (auth.uid() = distributor_id);

-- =========================================================
-- RPC: Atomic wallet balance increment (replaces Firestore transactions)
-- =========================================================
create or replace function increment_wallet_balance(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
begin
  insert into wallets (id, balance_xaf, updated_at)
  values (p_user_id, p_amount, now())
  on conflict (id) do update set
    balance_xaf = wallets.balance_xaf + p_amount,
    updated_at = now();
end;
$$;

-- =========================================================
-- Enable Realtime for key tables
-- =========================================================
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table wallets;
alter publication supabase_realtime add table wallet_transactions;
alter publication supabase_realtime add table distributors;
alter publication supabase_realtime add table commissions;
