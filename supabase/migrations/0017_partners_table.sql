-- ── Migration 0017: partners table — full schema reconciliation ──────────────
--
-- The partners table was originally created manually in the Supabase dashboard
-- without a tracked migration. This file creates it idempotently (using
-- CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS) so it can be applied
-- safely to both fresh databases and the existing live database.
--
-- Run this in: Supabase Dashboard → SQL Editor, or `supabase db push`
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Create table (no-op if it already exists) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partners (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug            TEXT        NOT NULL UNIQUE,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'suspended')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Add all columns that may be missing (safe to re-run) ─────────────────────
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS whatsapp_number         TEXT,
  ADD COLUMN IF NOT EXISTS contact_email           TEXT,
  ADD COLUMN IF NOT EXISTS hero_title_en           TEXT,
  ADD COLUMN IF NOT EXISTS hero_title_fr           TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle_en        TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle_fr        TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_url          TEXT,
  ADD COLUMN IF NOT EXISTS distributor_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pending_contact_name    TEXT,
  ADD COLUMN IF NOT EXISTS pending_contact_phone   TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain           TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS domain_status           TEXT NOT NULL DEFAULT 'none'
                             CHECK (domain_status IN ('none', 'pending_verification', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS domain_verification_token TEXT,   -- JSON string of DNS records from provider
  ADD COLUMN IF NOT EXISTS domain_check_attempts   INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS domain_last_checked_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vercel_domain_added_at  TIMESTAMPTZ,  -- records domain-attach time for any provider
  ADD COLUMN IF NOT EXISTS created_by_admin        UUID,          -- FK to auth.users; set on row creation
  ADD COLUMN IF NOT EXISTS approved_by             UUID,          -- FK to auth.users; set on status → active
  ADD COLUMN IF NOT EXISTS approved_at             TIMESTAMPTZ;

-- Add domain_status CHECK constraint separately (guards against stale rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema = 'public'
       AND table_name   = 'partners'
       AND constraint_name = 'partners_domain_status_check'
  ) THEN
    ALTER TABLE public.partners
      ADD CONSTRAINT partners_domain_status_check
        CHECK (domain_status IN ('none', 'pending_verification', 'verified', 'failed'));
  END IF;
END $$;

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Service-role key (used server-side) bypasses RLS automatically.
-- Anon/authenticated reads need an explicit policy so the public partner
-- site page (/p/:slug) can call Supabase directly if needed.

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active partner rows (public partner site pages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'partners'
       AND policyname = 'partners_public_read_active'
  ) THEN
    CREATE POLICY partners_public_read_active
      ON public.partners
      FOR SELECT
      TO anon, authenticated
      USING (status = 'active');
  END IF;
END $$;

-- Admins (service role) can do everything — no explicit policy needed because
-- the service-role key bypasses RLS. The policy below covers authenticated
-- admin users making direct Supabase calls (not via the server-side API).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'partners'
       AND policyname = 'partners_admin_full_access'
  ) THEN
    CREATE POLICY partners_admin_full_access
      ON public.partners
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
           WHERE profiles.id = auth.uid()
             AND profiles.role IN ('admin', 'superadmin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
           WHERE profiles.id = auth.uid()
             AND profiles.role IN ('admin', 'superadmin')
        )
      );
  END IF;
END $$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS partners_slug_idx           ON public.partners (slug);
CREATE INDEX IF NOT EXISTS partners_status_idx         ON public.partners (status);
CREATE INDEX IF NOT EXISTS partners_domain_status_idx  ON public.partners (domain_status);
CREATE INDEX IF NOT EXISTS partners_custom_domain_idx  ON public.partners (custom_domain) WHERE custom_domain IS NOT NULL;
