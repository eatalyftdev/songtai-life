# Phase 0 — Baseline Audit

**Stack confirmed:** React 19 + Vite 6 (not Next.js — `ARCHITECTURE.md` is the source of truth over the generic prompt series' assumption), Express, Supabase, i18next EN/FR, Tailwind v4.

**Environment note:** At the start of this session the app had no live Supabase connection (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` were unset), so no phase involving real data could have proceeded. This has been fixed — the project's existing Supabase instance (`auyjxchghtetxpiyecds`) is now wired up client- and server-side, and `MESOMB_*` / `GEMINI_API_KEY` secrets were collected for payments and AI chat.

---

## High Priority

1. **Forced overlay on first visit.** `src/App.tsx:88-96` auto-opens the Privacy & Data Security Policy modal 1.5s after page load on every new visitor, blocking the homepage. This is the exact "aggressive pop-up / forced overlay" anti-pattern called out in the elevation brief, even though the content (legal consent) is legitimate. **Fix in Phase 1/6:** convert to a small dismissible footer/banner notice with a link to the full policy, not a blocking modal.
2. **No rate limiting on auth or payment endpoints.** `server.ts` has no `express-rate-limit` (or equivalent) on `/api/payment/checkout`, `/api/payment/webhook`, or distributor auth flows — brute-force/DoS exposure. (Phase 8)
3. **Minimal input validation on API routes.** `/api/payment/checkout`, `/api/distributor/add-downline`, and `/api/gemini/chat` check for field *presence* only, not type/length/format (no zod schemas). (Phase 8)
4. **RLS gaps:**
   - `site_settings` is read/written from server code but has no RLS policy in migrations at all.
   - Several public content tables (`events`, `gallery_images`, `testimonials`, `gallery_albums`, `page_sections`, `homepage_sections`) use `USING (true)` on SELECT — acceptable for public content, but should be reviewed for anything not meant to be fully public (e.g. draft/unpublished rows).
   - `contact_messages`, `newsletter_subscribers` use `WITH CHECK (true)` on INSERT — open to anonymous spam submission with no rate limit. (Phase 8)
5. **EN/FR parity gaps.** Hardcoded English-only strings bypassing i18next in `FAQ.tsx`, `Contact.tsx`, `BecomeDistributor.tsx`, `Events.tsx`, `Blog.tsx`, `Opportunity.tsx` (headings, labels, payment-flow copy). (Phase 6)

## Medium Priority

6. **Missing `alt` text** on images in `HomeSection.tsx` (L526, 662, 866), `Products.tsx` (L277, 415), `HeroCarousel.tsx` (L141).
7. **Icon-only buttons without `aria-label`**: Navbar user/language/cart/menu buttons, cart qty +/- in `App.tsx`, carousel/pagination arrows in `Events.tsx` and `HeroCarousel.tsx`.
8. **No focus-trap/Escape handling** on modal dialogs (checkout modal in `App.tsx`, others) — keyboard users can tab behind the modal.
9. **Duplicated data-fetching boilerplate.** Nearly every `src/components/brand/*` component hand-rolls the same `useEffect` fetch + `supabase.channel(...)` subscribe/unsubscribe pattern (seen in `HomeSection.tsx`, `Blog.tsx`, `Events.tsx`, `Products.tsx`, `HeroCarousel.tsx`). Should become a shared `useRealtimeData` hook.
10. **Duplicated formatting helpers** — local currency formatting in `BecomeDistributor.tsx`, ad hoc date handling in `AppointmentBooking.tsx`/`Events.tsx` instead of one shared util.
11. **Fixed-width decorative elements** (`w-[550px]`, `w-[500px]`) in `BecomeDistributor.tsx`/`Contact.tsx` that aren't clamped for narrow viewports — overflow risk at 375px.
12. **No loading/empty states** in `AppointmentBooking.tsx` (appointment types fetch) and `Blog.tsx` (no "no posts found" message).

## Low Priority

13. Sub-12px text (`text-[10px]`/`text-[11px]`) used broadly for badges/meta info — acceptable for secondary metadata but should not spread to primary content.
14. No `:focus-visible` styling on FAQ accordion triggers.

## Lighthouse

Baseline scores will be captured in Phase 7 once a headless Chromium path is confirmed working in this environment (a Replit-provided Chromium executable is available via `REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE`, unlike the generic `npx lighthouse` attempt in an earlier session which failed).

---

Proceeding to Phase 1 (design tokens) next, since prior sessions already did foundational token work — this phase will audit that work against the current component set rather than starting from zero.
