---
name: SPA SEO architecture
description: SEO implementation pattern for Songtai Life — React SPA with react-helmet-async; robots.txt + sitemap.xml as Express routes; noindex strategy for auth-gated pages.
---

## The fundamental SPA constraint

All public content lives at `/` — the `brandPage` state (in `App.tsx`) switches sections. There are no separate URLs for products/blog/events. This means:
- Google (executes JS) sees correct meta tags via react-helmet-async per section.
- Social crawlers (WhatsApp, Facebook) only see `index.html` static OG fallbacks.
- Future improvement: add proper URL routing per item for full per-item SEO.

## SEO.tsx props

- `noindex?: boolean` — renders `<meta name="robots" content="noindex, nofollow">`. Use on all auth-gated routes.
- `jsonLd?` — raw JSON-LD object(s); `breadcrumbs?` — generates BreadcrumbList.
- Defaults cascade: prop → `site_settings.seo_defaults` (Supabase) → hardcoded strings.
- Default OG image is still the Unsplash placeholder; replace with a Supabase-hosted image when one is available.

## BrandShowcase PAGE_SEO coverage

All sections now covered: home, about, products, events, blog, gallery, media, opportunity, join, appointment, faq, contact.
Uses i18n translation keys — if a key doesn't exist, i18n returns the key string as fallback (acceptable).

## noindex locations

- `AdminLayout.tsx` — Helmet with noindex + title "Admin — Songtai Life"
- `AuthViews.tsx` — Helmet in each of DistributorLogin, DistributorSignup, AdminLogin
- NOT yet added: `DistributorPortal` (protected by ProtectedRoute, but consider adding noindex for belt-and-suspenders)

## robots.txt and sitemap.xml (Express routes in server.ts)

Both added just before the Vite dev middleware / production static file serving block.

**robots.txt**: disallows /admin, /distributor, /api. Sitemap URL uses `process.env.SITE_URL ?? "https://songtailife.cm"`.

**sitemap.xml**: dynamic — queries Supabase `db` client for active products, published blog_posts, active events. Static section URLs use `/?section=<name>` query param pattern. hreflang alternates use `?lang=en/fr` (separator correctly chosen based on whether URL already has `?`).

## index.html static fallbacks

Added full OG + Twitter Card fallback tags in `index.html` for social scrapers. OG image points to `/og-default.jpg` (needs to be placed in `public/` when a real image is ready).

## FAQPage JSON-LD

`FAQ.tsx` generates `FAQPage` schema from the live Supabase items state. Injected via `<SEO jsonLd={faqPageJsonLd} />` — visible to Googlebot (executes JS) but not social scrapers. This is acceptable since FAQPage schema is a Google Search feature.

**Why:** FAQPage JSON-LD enables rich results in Google Search (expandable Q&A in SERP). Must be derived from actual DB content, not hardcoded.
