---
name: MLM anti-pattern elevation pass
description: Durable rules adopted when auditing Songtai Life against typical Longrich/Norland-style direct-selling site anti-patterns.
---

Rules to keep applying on any future page/feature work on this brand site:

- **No fabricated people with stock photos.** Never pair a named "team member" or default/seed testimonial with a real-looking stock headshot. Use a designed initials-avatar placeholder (`src/components/brand/InitialsAvatar.tsx`) until a real photo is uploaded via the CMS. Applies to team bios, testimonials, and any future "meet the X" content.
- **Every carousel/auto-advancing UI needs an explicit, visible pause control** — not just hover-pause (fails on touch/keyboard). Pattern: local `paused` state, `setInterval` gated on it, plus a small icon button toggling play/pause. Used in `HeroCarousel.tsx` and the testimonial carousel in `HomeSection.tsx`.
- **No native `alert()`/`confirm()` on the public-facing brand site** — jarring, blocks the page, reads as low-trust/spammy. Use inline non-blocking toasts instead (see the `notice` pattern in `MediaCenter.tsx`). Admin-panel `alert()` usage was left alone — internal tool UX, not customer-facing, out of scope for this rule.
- **Sitewide trust/certifications belong in the footer**, not buried on one About page. `src/components/brand/Certifications.tsx` reads the same `page_our_story_certs` CMS record as the About page and renders as a bar at the top of `Footer.tsx` — single source of truth, always visible.
- **No stock "wealth lifestyle" or mismatched documentary photography as a placeholder.** When no real photo/video exists yet (e.g. a corporate video thumbnail), use a branded gradient + icon treatment consistent with the theme's signature-gradient system, not a generic Unsplash image.
- Headless Lighthouse could not run in this sandbox (no Chrome/Chromium binary reachable, `playwright install chromium` fails without sudo/system-deps access here). For Core Web Vitals checks on this project, run Lighthouse from real Chrome DevTools against the preview URL rather than trying to script it in this container.
