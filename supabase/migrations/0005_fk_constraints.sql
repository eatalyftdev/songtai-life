-- Migration 0005: Add the FK constraints that are genuinely missing.
--
-- Most FKs already exist in the original schema:
--   distributors.id      → auth.users(id)  ✓ (0000_complete_schema.sql:142)
--   wallets.id           → auth.users(id)  ✓ (0000_complete_schema.sql:156)
--   wallet_transactions.wallet_id → auth.users(id)  ✓ (0000_complete_schema.sql:164)
--   commissions.distributor_id   → auth.users(id)  ✓ (0000_complete_schema.sql:177)
--   withdrawals.distributor_id   → auth.users(id)  ✓ (0000_complete_schema.sql:190)
--   processed_payments.order_id  is PRIMARY KEY (unique already implied)
--
-- orders.user_id is intentionally TEXT (supports "guest" orders) so it
-- cannot reference auth.users(id) which is UUID. No FK added there.
--
-- What we ARE adding:
--   1. commissions.order_id → orders.order_id  (both text, genuinely missing)
--   2. distributors.rank_tier_id → rank_tiers.id  (if the column exists)

-- ── 1. commissions.order_id → orders.order_id ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'commissions_order_id_fkey'
      AND table_name = 'commissions'
  ) THEN
    ALTER TABLE commissions
      ADD CONSTRAINT commissions_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ── 2. distributors.rank_tier_id → rank_tiers.id  (column added in 0003) ─────
DO $$
BEGIN
  -- Only attempt if the column actually exists (added by a later migration)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'distributors' AND column_name = 'rank_tier_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'distributors_rank_tier_id_fkey'
      AND table_name = 'distributors'
  ) THEN
    ALTER TABLE distributors
      ADD CONSTRAINT distributors_rank_tier_id_fkey
      FOREIGN KEY (rank_tier_id) REFERENCES rank_tiers (id) ON DELETE SET NULL;
  END IF;
END $$;
