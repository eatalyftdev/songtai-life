---
name: Homepage & global chrome patterns
description: Theme default, i18n, Logo component, Footer, CSS import order decisions from the large homepage improvement pass.
---

## Theme default priority order
`localStorage("songtai_theme")` → `prefers-color-scheme` → **light** (not dark).
The old code defaulted to `"dark"` when no stored value existed; the corrected initializer is in `AppContent` inside `src/App.tsx`.

## Google Fonts — put in HTML, not CSS
`@import url(...)` inside `src/index.css` causes a PostCSS error at build time because Tailwind v4's `@import "tailwindcss"` emits rules that make subsequent `@import` statements invalid in PostCSS.
**Fix:** Move the Google Fonts `<link>` tag into `index.html`; remove the `@import url(...)` line from `src/index.css`.

## <html lang> sync
`src/i18n.ts` calls `document.documentElement.lang = lng` on init and listens to `i18n.on("languageChanged", ...)`. No React hook needed; this runs at module level.

## Shared Logo component
`src/components/Logo.tsx` reads `useSiteSettings().branding.{logo_url, logo_dark_url}`. Falls back to the Sprout icon if no URL set. Pass `theme` prop to pick the right variant. Used in Navbar, Footer — do NOT duplicate the logo rendering logic anywhere else.

## Footer
`src/components/Footer.tsx` is the single canonical public footer. It reads contact/social from `useSiteSettings()` live (Supabase realtime). Contains NO admin links in quick-links; has a clearly-labelled "Distributor Login ↗" anchor instead. `BrandShowcase` renders it below all sub-pages.

## useSiteSettings — new keys
Added `contact: ContactSettings` and `branding: BrandingSettings` to the hook shape. Corresponding rows are seeded in `server.ts → hydrateSeeds()` with `ignoreDuplicates: true` so they're safe to run on every boot.

## JSX.Element type in TSX files
Using `JSX.Element` as a return type or map value type causes `TS2503: Cannot find namespace 'JSX'` in strict mode. Use `ReactElement` imported from `"react"` instead.

## hreflang in React JSX
React expects camelCase: `hrefLang`, not `hreflang`. The DOM prop warning comes from `<link rel="alternate" hreflang=...>` — change to `hrefLang`.
