---
name: Theme system architecture
description: Brand-matched light/dark token system; font, signature motif, and color-token decisions.
---

# Songtai Life Theme System

## How it works
- Dark mode = `:root` defaults (green-tinted dark surfaces)
- Light mode = `.light-theme` class on the main wrapper div in App.tsx (set via `theme === "light"`)
- Theme state persisted in `localStorage("songtai_theme")`; falls back to `prefers-color-scheme`

## Brand colors (sampled from logo pixel data)
- Songtai Green: `#016934` (primary, light mode) / `#1E9A56` (primary, dark mode)
- Songtai Vermillion: `#E7380D` (accent, light mode) / `#FF6B3D` (accent, dark mode)
- Gold: `#B8862E` (light) / `#D9A94B` (dark) — reserved for badges/VIP only

## CSS token pattern
All semantic tokens in `src/index.css`:
- `--color-bg`, `--color-surface`, `--color-fg`, `--color-muted`, `--color-border`
- `--color-primary`, `--color-primary-fg`, `--color-accent`, `--color-accent-fg`
- `--color-gold`, `--color-gold-fg`
- `--text-accent-gold`, `--text-accent-green` (text-safe variants)

Stone palette AND emerald palette both remapped at CSS var level — so `bg-stone-950` and `bg-emerald-600` respond to theme automatically without component changes.

## Typefaces
- Display: **Fraunces** (variable optical-size serif) — loaded in index.html
  - Applied globally to `h1` via CSS; `.font-display` class for opt-in h2/callouts
- Body/UI: **Inter**
- Mono: **JetBrains Mono** (admin panels only)

## Signature motif
`.signature-rule` — 2px tall `linear-gradient(135deg, #E7380D 0%, #016934 100%)`  
Used once in Navbar as the nav's bottom edge (replaces `border-b`).  
`.signature-underline::after` — 40px accent stroke, opt-in for headings.

## Component gold/green token pattern
Use `text-[color:var(--color-gold)]` and `bg-[color:var(--color-gold)]` for Tailwind arbitrary CSS var syntax.  
Use `bg-emerald-600` / `bg-emerald-700` for green buttons (auto-themed via palette remap).

**Why:** Direct hex references (`#ecc246`, `#C9A227`, `#0A7D32`) are hardcoded and don't respond to theme; CSS vars + palette remapping handles both modes in one place.

## Light-mode text exception pattern
`.light-theme .text-white { color: dark !important }` — flips all white text dark.  
Exception list (`.light-theme .bg-emerald-600 *`) preserves white text on solid colored backgrounds.  
Add new solid-BG classes to the exception list in `src/index.css` when needed.

## Reduced-motion
Only decorative `.animate-float-1/2` and `.signature-rule` are suppressed — Framer Motion animations are untouched.
