# Songtai Life — MLM Platform

A full-stack Multi-Level Marketing platform targeting the West African market (Cameroon). Distributors can register, build downline networks, earn commissions, and pay via mobile money.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Recharts, i18next (EN/FR)
- **Backend:** Node.js + Express (`server.ts`), TypeScript via `tsx`
- **Database/Auth:** Supabase (PostgreSQL + Auth + Realtime)
- **AI:** Google Gemini API (`@google/genai`) — powers the "AI Architect" chat assistant
- **Payments:** MeSomb (MTN Mobile Money + Orange Money)

## How to run

```
npm run dev          # starts the Express + Vite dev server on port 5000
npm run build        # production build (vite + esbuild)
npm start            # serve production build
```

The workflow **Start application** runs `npx tsx server.ts` and serves on port 5000.

## Required environment secrets

| Key | Where to get it |
|-----|----------------|
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (service_role) |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |
| `MESOMB_API_KEY` | MeSomb dashboard (optional — only needed for payments) |
| `MESOMB_APPLICATION_KEY` | MeSomb dashboard (optional) |
| `MESOMB_SIGNATURE_KEY` | MeSomb dashboard (optional — webhook HMAC) |

## Database setup

Supabase migrations are in `supabase/migrations/`. Apply them via the Supabase dashboard SQL editor or `supabase db push`:

1. `0002_mlm_tables.sql` — core MLM schema
2. `0003_add_missing_columns.sql` — missing columns
3. `0004_fix_rls_policies.sql` — admin RLS bypass + wallet update restriction

## Key architecture notes

- The server auto-seeds products, blog posts, and events on first start (`hydrateSeeds()`).
- Wallet balance writes **must** go through `/api/payment/payout` (server-side, not direct client writes) — RLS blocks direct client wallet mutations.
- New distributors are created via `/api/distributor/add-downline` which calls `auth.admin.createUser()` first (FK constraint to `auth.users`).
- Commission engine runs on payment webhooks: calculates unilevel payouts up 5 levels and updates distributor rank (Bronze → Silver → Gold → Platinum → Diamond).

## User preferences

<!-- Add user-specific preferences here as they come up -->
