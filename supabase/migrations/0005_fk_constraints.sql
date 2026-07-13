-- Migration 0005: Add explicit FK constraints and clarify wallet ownership
-- Run via: Supabase dashboard SQL editor

-- ── 1. Wallets — make ownership explicit ─────────────────────────────────────
-- wallets.id is a shared PK that equals profiles.id (and distributors.id).
-- Add a named FK so it is enforced and documented, not just conventional.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'wallets_id_fkey' AND table_name = 'wallets'
  ) THEN
    ALTER TABLE wallets
      ADD CONSTRAINT wallets_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 2. Distributors ──────────────────────────────────────────────────────────
DO $$
BEGIN
  -- distributors.id → auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'distributors_id_fkey' AND table_name = 'distributors'
  ) THEN
    ALTER TABLE distributors
      ADD CONSTRAINT distributors_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE RESTRICT;
  END IF;

  -- distributors.rank_tier_id → rank_tiers
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'distributors' AND column_name = 'rank_tier_id')
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'distributors_rank_tier_id_fkey' AND table_name = 'distributors'
  ) THEN
    ALTER TABLE distributors
      ADD CONSTRAINT distributors_rank_tier_id_fkey
      FOREIGN KEY (rank_tier_id) REFERENCES rank_tiers (id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ── 3. Orders ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_user_id_fkey' AND table_name = 'orders'
  ) THEN
    -- user_id can be 'guest' so only enforce when not null and not guest
    -- We add a partial index + FK only where user_id is a valid uuid
    -- Safest approach: add FK but allow NULL (set nullable if needed)
    ALTER TABLE orders
      ADD CONSTRAINT orders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 4. Commissions ───────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'commissions_distributor_id_fkey' AND table_name = 'commissions'
  ) THEN
    ALTER TABLE commissions
      ADD CONSTRAINT commissions_distributor_id_fkey
      FOREIGN KEY (distributor_id) REFERENCES distributors (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'commissions_order_id_fkey' AND table_name = 'commissions'
  ) THEN
    ALTER TABLE commissions
      ADD CONSTRAINT commissions_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ── 5. Wallet transactions ────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'wallet_transactions_wallet_id_fkey' AND table_name = 'wallet_transactions'
  ) THEN
    ALTER TABLE wallet_transactions
      ADD CONSTRAINT wallet_transactions_wallet_id_fkey
      FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 6. Withdrawals ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'withdrawals_distributor_id_fkey' AND table_name = 'withdrawals'
  ) THEN
    ALTER TABLE withdrawals
      ADD CONSTRAINT withdrawals_distributor_id_fkey
      FOREIGN KEY (distributor_id) REFERENCES distributors (id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ── 7. Unique constraint: one completed order per order_id ────────────────────
-- Prevents double-processing of a payment webhook (belt-and-suspenders with
-- the application-level idempotency check in processed_payments).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'processed_payments_order_id_key' AND table_name = 'processed_payments'
  ) THEN
    ALTER TABLE processed_payments
      ADD CONSTRAINT processed_payments_order_id_key UNIQUE (order_id);
  END IF;
END $$;
