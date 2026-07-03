---
name: Songtai Life migration decisions
description: Key decisions made when migrating this project from Replit Agent to Replit environment.
---

## Auth
Supabase Auth replaced with Replit Auth (OpenID Connect, passport, express-session). Auth module lives at `server/replit_integrations/auth/`. Sessions stored in Replit Postgres (`sessions` table). Users stored in `users` table. Both created via `npm run db:push` (drizzle schema at `shared/schema.ts` → `shared/models/auth.ts`).

**Why:** Migration guardrails require replacing Supabase Auth with Replit Auth for security (client/server separation).

## Supabase DB client
The Supabase JS client (`@supabase/supabase-js`) is still used server-side only for the MLM/payments/commission engine — it was too deeply integrated to replace in one pass. It is initialized conditionally: if `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are missing, routes return 503 gracefully instead of crashing the server.

**Why:** The MLM schema (distributors, wallets, commissions, orders) lives in Supabase Postgres with RLS. The Replit Postgres only holds auth sessions/users.

## Secrets
All secrets are in Replit Secrets (not `.replit` userenv):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` (user's own key — declined Replit AI upgrade)
- `SESSION_SECRET`, `DATABASE_URL` (auto-provisioned by Replit)
- `MESOMB_API_KEY`, `MESOMB_SIGNATURE_KEY` — optional, not yet set

## Drizzle / Replit Postgres
Only used for Replit Auth tables (`sessions`, `users`). Config at `drizzle.config.ts`. Schema at `shared/schema.ts`. Push with `npm run db:push`.

## Legacy files removed
`firebase-applet-config.json`, `firebase-blueprint.json`, `firestore.rules` deleted.
