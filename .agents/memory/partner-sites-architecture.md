---
name: Partner Sites Multi-Tenant Architecture
description: How the /p/:slug partner site system is structured — context, routing, component hooks, RLS requirements.
---

# Partner Sites Architecture

## Routing decision: path-based (`/p/:slug`)
Wildcard subdomains are not available on Replit dev environment, so `/p/:slug` path routing was chosen. This is documented as a fast-follow item for custom domains / wildcard DNS once deployed.

## How tenant resolution works
- `PartnerProvider` (in `src/context/PartnerContext.tsx`) wraps the entire app inside BrowserRouter + AuthProvider.
- It reads `useLocation().pathname`, matches `/p/([^/]+)`, fetches from Supabase `partners` table.
- If `status !== 'active'` or not found → renders `PartnerNotAvailable` (slug is shown for debugging).
- If found and active → sets `PartnerContext.Provider value={partner}` and renders children normally.
- Components use `usePartner()` hook (returns `null` on main site, `PartnerData` on partner sites).

## What changes on partner sites (via context hook)
- **Navbar**: "Become a Distributor" button hidden (`!isPartnerSite` guard).
- **WhatsAppWidget**: uses `partner.whatsapp_number` instead of site-wide number.
- **HomeSection**: hero title/subtitle override if both EN+FR are set; hero image shows instead of HeroCarousel.
- **BrandShowcase**: `effectivePage` remaps `opportunity`/`join` → `"home"` preventing distributor signup.

## Navigation on partner sites
`setBrandPage` in `AppContent` checks `location.pathname` for `/p/:slug` and navigates to `/p/${slug}` instead of `/` — this keeps the user on the partner site URL rather than dropping back to the main site.

## Admin
`/admin/partners` route added; `PartnersPage.tsx` manages full CRUD with:
- Approve (pending → active), Suspend (active → suspended), Reactivate (suspended → active)
- Soft-delete only via suspension — no hard delete
- Slug is immutable after creation
- Hero image stored as URL (use Media Library to upload first)

## RLS requirement (MUST be done in Supabase dashboard)
The `partners` table needs these policies before the client-side `usePartner()` fetch will work with the anon key:
1. `SELECT` policy: `status = 'active'` — allow anon reads of active partners only
2. `INSERT/UPDATE/DELETE` policy: restrict to admin-role profiles (`auth.jwt() ->> 'role' = 'admin'` or check `profiles.role`)

**Why:** The `PartnerProvider` uses the Supabase anon key (client-side). Without RLS, the anon key cannot read `partners` and all `/p/:slug` routes will show "not available". The server-side `GET /api/partner/:slug` uses the service role key and bypasses RLS.

## Files
- `src/context/PartnerContext.tsx` — context, hook, PartnerProvider
- `src/components/PartnerNotAvailable.tsx` — fallback page
- `src/components/admin/pages/PartnersPage.tsx` — admin CRUD
- `server.ts` — `GET /api/partner/:slug` endpoint (service role, requires SUPABASE_SERVICE_ROLE_KEY)
