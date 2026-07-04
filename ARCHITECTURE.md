# Songtai Life — Architecture Reference

> Generated from codebase analysis. Keep this file updated whenever routes, schema, auth, or SEO patterns change.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 6, TypeScript, Tailwind CSS v4, Framer Motion, i18next (EN/FR) |
| Backend | Node.js + Express (`server.ts`), TypeScript via `tsx` (dev) / `esbuild --format=cjs` (prod) |
| Database / Auth | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| AI | Google Gemini API (`@google/genai`) — `/api/gemini/chat` |
| Payments | MeSomb (MTN Mobile Money + Orange Money) — `/api/payment/*` |
| Sessions | Replit PostgreSQL (Drizzle ORM) — admin OIDC sessions only |

---

## Application Architecture

### SPA Pattern — Critical SEO Implication

This is a **Single-Page Application**. All public content lives at the root route `/`. The `brandPage` state string (managed in `App.tsx`) controls which section renders inside `BrandShowcase`. Navigation between sections does **not** change the URL — it updates React state. This means:

- Google Crawlers see one URL: `/`
- Product detail pages, blog posts, and event pages render at `/` with dynamic state (no canonical per-item URL)
- Googlebot executes JavaScript and sees the correct meta tags via `react-helmet-async`
- Social sharing crawlers (WhatsApp, Facebook, Slack) **do not** execute JS — they see only the static `index.html` fallback OG tags
- Future improvement: Add proper URL routing (e.g. `/products/:slug`) for full per-item SEO

---

## Route Tree

### Public Routes (no auth required, crawlable)

| URL | Component | Notes |
|---|---|---|
| `/` | `BrandShowcase` | Renders all brand sections via `brandPage` state |
| `/` (`brandPage=home`) | `HomeSection` | Hero carousel, featured products, testimonials |
| `/` (`brandPage=about`) | `About` | Company story |
| `/` (`brandPage=products`) | `Products` | Product catalog + detail view |
| `/` (`brandPage=events`) | `Events` | Event listing + detail view |
| `/` (`brandPage=blog`) | `Blog` | Blog listing + post detail view |
| `/` (`brandPage=gallery`) | `Gallery` | Photo gallery |
| `/` (`brandPage=media`) | `MediaCenter` | Documents / catalogues |
| `/` (`brandPage=faq`) | `FAQ` | FAQ with categories, sourced from Supabase |
| `/` (`brandPage=contact`) | `Contact` | Contact form + map |
| `/` (`brandPage=opportunity`) | `Opportunity` | MLM opportunity pitch |
| `/` (`brandPage=join`) | `BecomeDistributor` | Distributor registration pitch |
| `/` (`brandPage=appointment`) | `AppointmentBooking` | Booking form |
| `/tech-spec` | `TechSpecBrowser` | Internal tech spec browser (not marketed) |
| `/robots.txt` | Express route | Dynamically served |
| `/sitemap.xml` | Express route | Dynamically served from Supabase content |

### Auth-Required Routes (noindex + robots.txt disallowed)

| URL | Component | Role Required |
|---|---|---|
| `/distributor/login` | `DistributorLogin` | None (public form — but noindex) |
| `/distributor/signup` | `DistributorSignup` | None (public form — but noindex) |
| `/admin/login` | `AdminLogin` | None (public form — but noindex) |
| `/distributor/dashboard` | `DistributorPortal` | `distributor` |
| `/admin/*` | `AdminLayout` + page components | `admin`, `superadmin`, `content_editor` |

**Auth guard**: `ProtectedRoute` component wraps gated routes. Redirects to `/admin/login` or `/distributor/login` if unauthenticated. No server-side session check on the SPA itself (Supabase client-side auth).

---

## Supabase Schema (key tables)

### MLM Core
| Table | Key columns |
|---|---|
| `distributors` | `id` (→ auth.users), `sponsor_id`, `distributor_code`, `rank`, `pv`, `wallet_balance` |
| `orders` | `id`, `distributor_id`, `status`, `amount_xaf`, `pv_points` |
| `commissions` | `id`, `distributor_id`, `order_id`, `type`, `level`, `amount_xaf` |

### Content (public-facing)
| Table | Key columns |
|---|---|
| `products` | `id`, `slug`, `name_en`, `name_fr`, `description_en`, `description_fr`, `price_xaf`, `pv_points`, `images[]`, `is_active`, `category_id` |
| `product_categories` | `id`, `slug`, `name`, `name_fr`, `image_url`, `is_active`, `display_order` |
| `blog_posts` | `id`, `slug`, `title_en`, `title_fr`, `excerpt_en`, `excerpt_fr`, `featured_image_url`, `status`, `published_at` |
| `events` | `id`, `slug`, `title_en`, `title_fr`, `description_en`, `description_fr`, `image_url`, `start_at`, `end_at`, `location`, `is_active` |
| `gallery_albums` | `id`, `title_en`, `title_fr`, `cover_image_url` |
| `gallery_images` | `id`, `album_id`, `url`, `caption_en`, `caption_fr` |
| `faqs` | `id`, `category_id`, `question_en`, `question_fr`, `answer_en`, `answer_fr`, `display_order`, `is_active` |
| `faq_categories` | `id`, `name_en`, `name_fr`, `display_order` |
| `testimonials` | `id`, `author_name`, `role`, `photo_url`, `video_url`, `content_en`, `content_fr`, `is_active` |
| `hero_carousel` | `id`, `image_url`, `title_en`, `title_fr`, `subtitle_en`, `subtitle_fr`, `sort_order`, `is_active` |

### Settings & CMS
| Table | Key columns |
|---|---|
| `site_settings` | `id`, `branding` (JSON), `seo_defaults` (JSON), `contact` (JSON), `socials` (JSON), `integrations` (JSON) |
| `appointments` | `id`, `name`, `email`, `phone`, `type`, `date`, `time`, `notes`, `status` |
| `contact_submissions` | `id`, `name`, `email`, `phone`, `subject`, `message`, `status` |
| `newsletter_subscribers` | `id`, `email`, `locale`, `status` |
| `audit_logs` | `id`, `action`, `details`, `created_at` |

### RLS Policies (summary)
- Content tables (`products`, `blog_posts`, `events`, `gallery_*`, `faqs`, `testimonials`, `hero_carousel`): public SELECT, admin INSERT/UPDATE/DELETE
- `site_settings`: public SELECT, admin write
- `orders`, `commissions`, `distributors`, `wallets`: authenticated users see own rows; admin sees all
- `site_settings` wallet balance: only server-side service role can write (RLS blocks direct client writes)

### Storage Buckets
| Bucket | Folder structure | Public |
|---|---|---|
| `media` | `products/`, `blog/`, `gallery/`, `hero-carousel/`, `categories/`, `branding/` | Yes |
| `documents` | `media-center/` | Yes |
| `testimonials` | (flat) | Yes |

---

## Auth Flow

### Distributor Auth (Supabase Auth — client-side)
1. `DistributorLogin` → `supabase.auth.signInWithPassword()`
2. Session stored in Supabase client (localStorage)
3. `ProtectedRoute` checks `supabase.auth.getSession()` + `distributor` role in `user_metadata`
4. Logout: `supabase.auth.signOut()`

### Admin Auth (Supabase Auth — client-side)
1. `AdminLogin` → `supabase.auth.signInWithPassword()`
2. Role checked via `profiles` table or `user_metadata.role` in `["admin","superadmin","content_editor"]`
3. `ProtectedRoute` with `allowedRoles` validates role before rendering `AdminLayout`

### Replit Auth (OIDC — server-side, legacy/parallel)
- `server/replit_integrations/auth/` sets up Passport OIDC
- Only used for the Express session; frontend uses Supabase Auth exclusively
- Admin API routes (`/api/distributor/add-downline`, `/api/payment/*`) call `isAuthenticated` middleware

---

## SEO Architecture

### Component: `src/components/SEO.tsx`
- Uses `react-helmet-async` (`<Helmet>` from `react-helmet-async`)
- Sets: `<title>`, `<meta description>`, `<link canonical>`, hreflang (EN/FR/x-default), Open Graph, Twitter Card, JSON-LD
- `noindex` prop: renders `<meta name="robots" content="noindex, nofollow">` on auth-gated pages
- Defaults fall back to `site_settings.seo_defaults` from Supabase, then hardcoded strings
- `jsonLd` prop accepts raw JSON-LD objects; `breadcrumbs` prop generates `BreadcrumbList`
- Organization JSON-LD is included on every page

### SEO Coverage by Section

| Section | Component | Per-item SEO | JSON-LD |
|---|---|---|---|
| Home | `HomeSection` | No (section-level via `BrandShowcase`) | Organization |
| About | `About` | No (section-level) | Organization |
| Products (list) | `Products` | Section-level | Organization |
| Products (detail) | `Products` | ✅ product name/desc/image | Organization + Product (future) |
| Blog (list) | `Blog` | Section-level | Organization |
| Blog (post) | `Blog` | ✅ post title/excerpt/image | Article |
| Events (list) | `Events` | Section-level | Organization |
| Events (detail) | `Events` (future) | — | Event |
| Gallery | `Gallery` | Section-level | Organization |
| Media Center | `MediaCenter` | Section-level | Organization |
| FAQ | `FAQ` | Section-level | Organization + FAQPage |
| Contact | `Contact` | Section-level | LocalBusiness |
| Opportunity | `Opportunity` | Section-level | Organization |
| Appointment | `AppointmentBooking` | ✅ | LocalBusiness |
| Admin (`/admin/*`) | `AdminLayout` | noindex | — |
| Distributor (`/distributor/*`) | `ProtectedRoute` / `DistributorPortal` | noindex | — |
| Login pages | `AuthViews` | noindex | — |

### robots.txt (Express route `/robots.txt`)
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /distributor
Disallow: /api
Sitemap: https://songtailife.cm/sitemap.xml
```

### sitemap.xml (Express route `/sitemap.xml`)
Dynamic — generated from Supabase content:
- Static: `/` (home)
- Products: one entry per active product (referenced by canonical root + brandPage state — no per-slug URLs currently)
- Blog posts: one entry per published post
- Events: one entry per active event
- Note: Until proper URL routing is added, all entries reference `/` since that's the only public URL

---

## API Routes (Express)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/gemini/chat` | None | Gemini AI chat proxy |
| `POST` | `/api/payment/checkout` | None | MeSomb payment initiation |
| `POST` | `/api/payment/webhook` | HMAC sig | MeSomb webhook — triggers commission engine |
| `GET` | `/api/payment/payout` | isAuthenticated | Admin payout initiation |
| `POST` | `/api/distributor/add-downline` | isAuthenticated | Create distributor (calls auth.admin.createUser) |
| `POST` | `/api/media/rehost` | isAuthenticated | Re-host external image to Supabase Storage |
| `GET` | `/robots.txt` | None | Dynamic robots.txt |
| `GET` | `/sitemap.xml` | None | Dynamic sitemap from Supabase |
| `GET` | `*` | None | SPA fallback → `dist/index.html` (production) |

---

## Commission Engine

Triggered by `/api/payment/webhook`. Runs `runCommissionEngine()`:
1. Finds purchaser's `distributors` row
2. Walks up to 5 sponsor levels via `sponsor_id`
3. Awards unilevel override commissions (rates: L1=10%, L2=5%, L3=3%, L4=2%, L5=1%)
4. Updates purchaser rank based on cumulative PV (Bronze→Silver→Gold→Platinum→Diamond)

---

## Key Architectural Decisions

- **Wallet writes server-side only**: RLS blocks direct client mutations to `wallet_balance`. All payouts go through `/api/payment/payout`.
- **Distributor creation server-side**: `auth.admin.createUser()` requires service role key — never exposed client-side. Goes through `/api/distributor/add-downline`.
- **Image hosting**: All admin-uploaded images go to Supabase Storage via `<MediaUploader />`. External URLs are detected and can be re-hosted via `/api/media/rehost`.
- **i18n**: `react-i18next` with `en`/`fr` JSON files. Language stored in `localStorage` and `profiles.locale`. All content tables have `_en`/`_fr` column pairs.
- **Vercel compatibility**: `server.ts` exports a default async handler for `@vercel/node`. `app.listen()` is conditional on `!process.env.VERCEL`.
