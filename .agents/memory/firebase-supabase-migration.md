---
name: Firebase-to-Supabase migration
description: Complete migration of Songtai Life MLM platform from Firebase/Firestore to Supabase. Covers auth, realtime, RLS, Node.js 20 WebSocket fix, and server security patterns.
---

## Key decisions

**Node.js 20 + Supabase Realtime:** Node 20 has no native WebSocket. Must install `ws` and pass it via `createClient(url, key, { realtime: { transport: ws } })` in server.ts only.

**Why:** Supabase Realtime's RealtimeClient throws on startup without a WebSocket implementation.

**How to apply:** Any server-side Supabase client on Node <22 needs the `ws` transport option.

---

**Payout and wallet balance writes must go through server endpoints, not direct client Supabase writes.**

**Why:** RLS `wallets_update_own` was removed (too permissive — allowed users to tamper their own balance). All wallet deductions now happen via the service-role server using `POST /api/payment/payout` with `Authorization: Bearer <token>`.

**How to apply:** Any future client flow that modifies wallet balance must route through a server endpoint that verifies the caller's JWT via `db.auth.getUser(token)`.

---

**Downline distributor creation must use the admin SDK (service role) to create auth users first.**

**Why:** `distributors.id` has a FK to `auth.users.id`. Inserting a random UUID will violate the FK constraint. The `POST /api/distributor/add-downline` server endpoint uses `db.auth.admin.createUser()` to create a placeholder auth user first.

**How to apply:** Any operation inserting into `distributors` (or any table with `id uuid references auth.users`) needs a valid auth user created first via the admin SDK.

---

**Webhook HMAC enforcement:** If a signature header is present but mismatches, return 401. If absent in production, return 401. Only allow unsigned webhooks in non-production (sandbox mode).

---

**Admin RLS pattern:** Client-side admin portal (anon key) requires explicit RLS policies checking `is_admin()` (a SECURITY DEFINER function querying `profiles.role`). These are in migration `0004_fix_rls_policies.sql`.

---

**Supabase migrations needed before production:**
- `0002_mlm_tables.sql` — core MLM schema
- `0003_add_missing_columns.sql` — columns missing from initial migration
- `0004_fix_rls_policies.sql` — admin bypass RLS + wallet update restriction

Apply via Supabase dashboard SQL editor or `supabase db push`.

---

**Column name mapping (Firestore camelCase → Supabase snake_case):**
- `distributorCode` → `distributor_code`
- `sponsorId` / `placementId` → `sponsor_id` / `placement_id`
- `kycStatus` → `kyc_status`
- `priceXaf` / `pvPoints` → `price_xaf` / `pv_points`
- `isActive` → `is_active`
- `publishedAt` / `startAt` / `endAt` → `published_at` / `start_at` / `end_at`
- `adminEmail` → `admin_email`
- `createdAt` is now an ISO string, not a Firestore Timestamp with `.seconds`. Use `new Date(val)` not `new Date(val.seconds * 1000)`.
