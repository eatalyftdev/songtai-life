# Songtai Life — Architecture Reference

> **Every Agent session must read this file first.**
> Confirm the design token system before proposing any new colors — extend it, don't replace it.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 (`@theme`), Framer Motion, Recharts, i18next |
| Backend | Node.js + Express (`server.ts`), TypeScript via `tsx` |
| Database / Auth | Supabase (PostgreSQL + Supabase Auth + Realtime) |
| AI | Google Gemini API (`@google/genai`) — "Ask AI" floating assistant |
| Payments | MeSomb (MTN MoMo + Orange Money) — `server/mesomb.ts` |
| Notifications | Twilio WhatsApp (fire-and-forget order alerts) |

---

## Design Token System

**Source of truth: `src/index.css`** — do NOT replace; extend only.

### Brand Colors
| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--color-primary` | `#1E9A56` | `#016934` | Primary buttons, links |
| `--color-accent` | `#FF6B3D` | `#E7380D` | Secondary CTAs, alerts |
| `--color-gold` | `#D9A94B` | `#B8862E` | Rank badges, VIP tiers |
| `--color-bg` | `#0B1410` | `#FCFBF8` | Page background |
| `--color-surface` | `#111C16` | `#FFFFFF` | Cards, panels |
| `--color-fg` | `#F2F5F3` | `#141A17` | Primary text |
| `--color-muted` | `#9CA9A2` | `#5B655F` | Secondary text |
| `--color-border` | `#22322A` | `#E4E2DB` | Dividers, input borders |

### Typography
| Token | Value | Usage |
|-------|-------|-------|
| `--font-display` | Fraunces (serif) | Hero headlines, section titles |
| `--font-sans` | Inter | Body, UI, nav, buttons |
| `--font-mono` | JetBrains Mono | Admin metrics, code |

### Theme Toggle
- Dark mode: `:root` defaults (green-tinted dark)
- Light mode: `.light-theme` overrides on root `<div>`
- Theme stored in `localStorage("songtai_theme")`

### Reusable UI Components — `src/components/ui/`
Button, Card, Input, Badge, StatCard, Skeleton, EmptyState — always use these instead of one-off Tailwind classes for atoms.

---

## Routing

| Path | Component | Auth Guard |
|------|-----------|-----------|
| `/` | `BrandShowcase` → `brandPage` state machine | Public |
| `/distributor/login` | `DistributorLogin` | Public |
| `/distributor/signup` | `DistributorSignup` | Public |
| `/admin/login` | `AdminLogin` | Public |
| `/distributor/dashboard` | `DistributorPortal` | `role: distributor` |
| `/admin/*` | `AdminLayout` + nested pages | `role: admin / superadmin / content_editor` |
| `/tech-spec` | `TechSpecBrowser` | Public |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User metadata: email, phone, role, locale, `must_change_password` |
| `distributors` | MLM data: `distributor_code`, `sponsor_id`, `placement_id`, rank, PV, KYC |
| `wallets` | One wallet per user: `balance_xaf` |
| `wallet_transactions` | Audit trail: type (commission/withdrawal/adjustment/refund), `amount_xaf` |
| `commissions` | Multi-level override records per order |
| `products` | Catalog: bilingual name/description, `price_xaf`, `pv_points`, image, video |
| `product_categories` | Category lookup: `slug`, bilingual name |
| `orders` | Sales: `order_id`, `amount_xaf`, `pv_points`, status, cart JSON |
| `site_settings` | KV config: `order_notifications`, `payment_config`, etc. |
| `homepage_sections` | CMS blocks: `section_key`, `content` JSON (admin-editable, Realtime) |
| `blog_posts` | Wellness hub: bilingual title/body, category, slug |
| `blog_categories` | Blog category lookup |
| `events` | Community events: `start_at`, `end_at`, location, capacity |
| `media` | Asset library: URL, type, uploader |
| `audit_logs` | Admin action trail |
| `mesomb_webhook_events` | Payment webhook dedup log |

---

## Authentication Flow

- **Email/Password**: Standard Supabase Auth `signInWithPassword`
- **Phone OTP (simulated)**: generates 6-digit code, maps phone → synthetic email `[phone]@songtailife.otp`
- **RBAC roles**: `customer` | `distributor` | `content_editor` | `admin` | `superadmin`
- **Force password change**: `must_change_password` flag → `ForcePasswordChange.tsx`
- **Distributor creation**: Server-only `auth.admin.createUser()` (FK constraint)

---

## Compensation Plan (Unilevel, 5 levels)

**Ranks**: `bronze` → `silver` → `gold` → `platinum` → `diamond`

| Level | Relationship | Rate |
|-------|-------------|------|
| 0 | Direct sponsor | 10% |
| 1 | Sponsor's sponsor | 5% |
| 2 | 3rd upline | 3% |
| 3 | 4th upline | 2% |
| 4 | 5th upline | 1% |

Commissions computed **server-side only** on `POST /api/payment/webhook`.

---

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/gemini/chat` | None | AI chat |
| POST | `/api/payment/checkout` | None | Initiate MeSomb payment |
| POST | `/api/payment/webhook` | HMAC-SHA256 | Commission engine trigger |
| POST | `/api/payment/payout` | Session | Wallet withdrawal |
| POST | `/api/distributor/add-downline` | Session | Create downline member |
| POST | `/api/kyc/upload` | Session | KYC document upload |
| GET/POST | `/api/bootstrap` | `ADMIN_BOOTSTRAP_KEY` | One-time superadmin seed |

---

## i18n

- Library: `i18next` + `react-i18next`
- Languages: `en`, `fr` (fr = default for Cameroon)
- All public-facing content requires EN/FR parity

---

## Security Notes

- Webhook HMAC-SHA256 via `crypto.timingSafeEqual` — do not remove
- Wallet writes blocked for clients via RLS — must go through `/api/payment/payout`
- CSP headers in `server.ts` — must allow Supabase Realtime WSS origin
- Bootstrap route: `ADMIN_BOOTSTRAP_KEY` + "no superadmin exists" guard + rate limit
