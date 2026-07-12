---
name: Songtai Life redesign phase-audit findings
description: Status of the 8-phase redesign brief (design tokens, dashboard, auth, catalog, team viz, content/SEO, performance, security) as of the last audit — avoid re-auditing from scratch.
---

A user-provided 8-phase redesign brief (design system → dashboard → auth/onboarding →
catalog/checkout → team visualization → content/SEO → performance → security) was checked
against the actual codebase rather than assumed greenfield. Findings:

- **Design tokens (Phase 1): DONE.** Tailwind v4 CSS variables in `src/index.css` already
  extend Green `#016934` / Vermillion `#E7380D` with light/dark semantic mapping.
- **Registration/auth/onboarding (Phase 3): DONE.** `src/components/auth/AuthViews.tsx` has
  sponsor/upline selection, login, password reset.
- **Product catalog/checkout (Phase 4): DONE.** `src/components/brand/Products.tsx` +
  MeSomb-integrated checkout in `src/App.tsx`, XAF pricing, MTN/Orange Money.
- **Content & SEO (Phase 6): DONE.** `src/components/SEO.tsx` already has JSON-LD, canonicals,
  per-locale metadata (see also `spa-seo-architecture.md`).
- **Security (Phase 8): mostly DONE, not "missing" as a naive grep suggests.** `server.ts` has
  MeSomb webhook HMAC-SHA256 verification (search "Webhook signature") and multiple in-memory
  rate limiters explicitly commented `Phase 8 security hardening` (payout, downline-add,
  resend, bootstrap, rehost endpoints). Verify current state before re-implementing.
- **Distributor dashboard (Phase 2): PARTIAL.** Core UI + Supabase bindings exist in
  `src/components/DistributorPortal.tsx`, but rank-progression logic is thin.
- **Team/downline visualization (Phase 5): genuinely MISSING.** Only a flat admin list
  (`src/components/admin/pages/DistributorsPage.tsx`) exists — no tree/collapsible mobile view,
  search, or rank filter for distributors' own downline.
- **Performance polish (Phase 7): PARTIAL.** No explicit image optimization pipeline or font
  loading strategy found; no Lighthouse numbers on record.

**Why this matters:** the brief's own appendix assumes a mostly-greenfield build across 8
phases, but this codebase already has substantial prior work (see other topic files in this
directory, e.g. `homepage-chrome-patterns.md`, `admin-dashboard-architecture.md`,
`spa-seo-architecture.md`). Re-running earlier phases wholesale would duplicate working code.

**How to apply:** before starting any phase from this brief, grep the relevant file pointers
above first; only rebuild what is confirmed thin or missing.
