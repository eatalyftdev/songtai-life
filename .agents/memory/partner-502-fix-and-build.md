---
name: Partner routes 502 fix + build prompt implementation
description: Root causes and fixes for the partner admin 502s, plus what was built from the build prompt (Gap 1/2/3).
---

## Root causes of 502 on partner admin routes

1. **WebSocket transport in serverless cold-start** — `createClient()` was always passed `{ realtime: { transport: ws } }`. In Netlify/Vercel Lambda the `ws` package (bundled with `--packages=external`) can cause cold-start hangs before any request is handled. **Fix**: detect `process.env.NETLIFY || process.env.VERCEL` and skip the `ws` transport in those environments.

2. **`GET /api/admin/partners` silently swallowed errors** — `const { data }` ignored the Supabase `error` field entirely. If the `partners` table or a column was missing the error disappeared and a stale 502 was returned by the platform. **Fix**: destructure `error` and return `res.status(500).json(...)` with the detail.

3. **`partners` table had no migration** — all columns (`created_by_admin`, `domain_status`, `domain_verification_token`, `domain_check_attempts`, `domain_last_checked_at`, `vercel_domain_added_at`, `pending_contact_name`, `pending_contact_phone`) were added ad-hoc in Supabase. A missing column in the live DB would crash the INSERT. **Fix**: `supabase/migrations/0017_partners_table.sql` with idempotent CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + RLS policies.

**Why:**  Any of the three independently would cause a 502 on a serverless deployment. The ws transport issue would affect ALL routes on cold start; the schema issue would affect only the partners INSERT.

**How to apply:**
- Run `0017_partners_table.sql` in the live Supabase SQL editor before deploying the updated server code.
- Set `NETLIFY=true` or `VERCEL=1` as env vars in the respective platform dashboards (Netlify injects NETLIFY automatically; Vercel injects VERCEL automatically).

## What was already built (Gap 1/2/3 from build prompt)

**Gap 1 — Custom domain tenant resolution:** Already fully implemented in `src/context/PartnerContext.tsx`. `isMainSiteHostname()` detects main site vs custom domain; domain-mode queries `partners` where `custom_domain = hostname AND status = 'active' AND domain_status = 'verified'`. Unmatched custom domains show `notAvailableSlot`, never silently fall through to main site.

**Gap 1 SEO addition (new):** `server.ts` production catch-all now does custom-domain meta injection: reads `dist/index.html`, queries partner by `custom_domain`, injects partner-specific `<title>`, `<meta name="description">`, OG tags, Twitter card, and canonical URL before sending HTML. Unrecognised custom domains get a 404 page, never the main company site.

**Gap 2 — Hero image upload UX:** Already fully built. `HeroImageField` component in `PartnersPage.tsx` (lines 112–155) wraps `MediaUploader` with `bucket="media" folder="partners"`. Shows current image thumbnail with Replace/Remove. Has a "Use URL instead" toggle for already-hosted images. `HeroImageField` is used in the form at line 703.

**Gap 3 — Homepage/hero redesign:** Already substantially built in `HomeSection.tsx`:
- Dimensional hero image (pointer-tracking tilt via spring physics, colored glow shadow)
- Gradient headline (last 2 words of longer headlines get primary→accent clip gradient)
- Blob backgrounds in hero section (animated float-1/float-2 keyframes)
- Elevated product cards and benefit cards (motion whileHover with colored Songtai Green shadow)
- Floating certification (ISO/GMP gold badge) and stat badge on partner hero image

**New additions from this session:**
- Stats cards (section 2) upgraded to `motion.div` with scroll-triggered entrance + colored hover shadows (green for members/products, darker green for countries, gold for awards)
- Opportunity section (section 4) got atmospheric blob backgrounds + `motion.div` entrance animations on heading and each step; step circle now uses `motion.div` with spring hover and gold glow ring shadow

## customDomain not sent on partner create

**Rule:** The `POST /api/admin/partner/create` endpoint no longer accepts `customDomain` in the request body — custom domain setup is a distinct post-creation opt-in step via `/api/admin/partner/:id/domain/attach`. The frontend payload also omits `customDomain` on create. This prevents domain-provider errors from blocking partner creation.

**Why:** Previously the create endpoint included custom_domain in the INSERT. If the domain provider was unavailable or the column was missing, the whole create operation would fail. Separating concerns makes creation reliable.

## Shared domain URL returned on create

`POST /api/admin/partner/create` now returns `shared_domain_url: "${SITE_URL}/p/${slug}"` alongside `partner`. The admin UI already displayed `${window.location.origin}/p/${createdPartner.slug}` — the server value is now also available for programmatic use.
