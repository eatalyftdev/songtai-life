---
name: Homepage Sections CMS
description: homepage_sections table, useHomepageSection hook, and admin editor — design decisions and gotchas.
---

# Homepage Sections CMS

## The rule
Every homepage text string must come from the `homepage_sections` Supabase table, with i18n keys as fallback. Never add hardcoded copy to HomeSection.tsx directly.

**Why:** Admin edits need to reflect live without a code deploy. The hook subscribes to Realtime so changes from HomepagePage appear on the public site within seconds.

## How to apply
- **Hook:** `useHomepageSection(sectionKey, defaults)` — always pass full defaults matching the JSONB shape so missing DB keys don't produce undefined.
- **Pattern:** `locale === "fr" ? (section.headline_fr || t("fallback")) : (section.headline_en || t("fallback"))` — DB value wins if non-empty string, otherwise falls through to i18n.
- **Shallow merge:** The hook merges DB content over defaults at the top level only. Nested arrays (opportunity steps, benefit items) must be replaced wholesale, not merged per-element.
- **Admin panel:** `/admin/homepage` (HomepagePage.tsx) — each section is its own sub-component with its own useState/load/save. Per-section save prevents one failed upsert from blocking all sections.
- **Upsert conflict key:** `section_key` (unique constraint). Always use `onConflict: "section_key"`.

## Icon map for benefits section
`ICON_MAP` in HomeSection.tsx maps string names ("Award", "TrendingUp", "Users", "Star") to Lucide components. Type: `Record<string, typeof Award>` — do NOT use `React.ElementType` or `JSX.Element`; both fail in this project's TS config.

## Migration note
`0010_homepage_sections.sql` references `is_admin()` function for RLS — this function must exist in the DB (added in migration 0004). Seed data uses `on conflict do nothing` so live admin edits survive re-runs.
