---
name: Songtai Life redesign phase-audit findings
description: Status of the 8-phase redesign brief (design tokens, dashboard, auth, catalog, team viz, content/SEO, performance, security) as of the last audit — avoid re-auditing from scratch.
---

A user-provided 8-phase redesign brief (design system → dashboard → auth/onboarding →
catalog/checkout → team visualization → content/SEO → performance → security) was checked
against the actual codebase rather than assumed greenfield. Findings after two audit passes:

- **Design tokens (Phase 1): DONE.** Tailwind v4 CSS variables in `src/index.css` already
  extend Green `#016934` / Vermillion `#E7380D` with light/dark semantic mapping.
- **Registration/auth/onboarding (Phase 3): DONE.** `src/components/auth/AuthViews.tsx` has
  sponsor/upline selection, login, password reset.
- **Product catalog/checkout (Phase 4): DONE.** `src/components/brand/Products.tsx` +
  MeSomb-integrated checkout in `src/App.tsx`, XAF pricing, MTN/Orange Money.
- **Content & SEO (Phase 6): DONE.** `src/components/SEO.tsx` already has JSON-LD, canonicals,
  per-locale metadata (see also `spa-seo-architecture.md`).
- **Security (Phase 8): mostly DONE.** `server.ts` has MeSomb webhook HMAC-SHA256 verification
  and multiple in-memory rate limiters explicitly commented `Phase 8 security hardening`.
- **Distributor dashboard (Phase 2) + Team visualization (Phase 5): DONE, contrary to an
  earlier shallow audit that called these "partial/missing".** A first-pass explorer subagent
  under-searched and wrongly flagged these as gaps — `src/components/DistributorPortal.tsx`
  already has rank progression, commission/transaction history, and a genealogy panel with
  both list and opt-in tree views. **Lesson: verify explorer subagent findings by reading the
  actual file before proposing follow-up tasks or telling the user something is missing.**
  Real remaining gap in this area: downline query only fetches level-1 (direct) members, no
  search/rank-filter UI yet, and no true multi-level recursive tree.
- **Data-authenticity bugs found and fixed (2026-07-12):** `DistributorPortal.tsx` was
  displaying commissions data mislabeled as "orders"/purchase history, with invented
  `pvPoints`/`status` and a `?? 55000` amount fallback; rank PV was re-derived client-side
  instead of reading `distributors.pv`; team-growth chart used `new Date()` instead of real
  `distributors.joined_at`; client rank thresholds (300/1000/3000/8000) didn't match the
  server's actual thresholds (500/2000/5000/10000) in `calculateUnilevelCommissions()`
  (server.ts). Fixed to query the real `orders` table (filtered by `user_id`) for purchase
  history, use `distributorProfile.pv` for rank progress, use real `joined_at` for the growth
  chart, and align client/server rank thresholds. Also added `pv` to `DistributorProfile` in
  `AuthContext.tsx` and a realtime subscription on the user's own `distributors` row so
  rank/PV changes reflect live.
- **Performance polish (Phase 7): PARTIAL.** No explicit image optimization pipeline or font
  loading strategy found; no Lighthouse numbers on record. Still open.
- Homepage testimonials/blog (`HomeSection.tsx`) and About page team/certs
  (`About.tsx`)/hero slides (`HeroCarousel.tsx`) use a seed-fallback pattern (seed constant →
  live Supabase fetch overrides) — this is the established, intentional CMS pattern in this
  codebase (see `homepage-sections-cms.md`), **not** a mock-data bug. Don't flag it again.

**How to apply:** before starting any phase from this brief, or before proposing a follow-up
task claiming something is "missing", read the actual component file first — a shallow
grep-based audit in this codebase has produced false negatives twice.
