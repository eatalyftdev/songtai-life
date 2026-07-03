---
name: Admin dashboard architecture
description: New sub-routed admin layout at /admin/* replacing old AdminPortal.tsx monolith. Key file paths, MediaUploader gotcha, and routing pattern.
---

# Admin Dashboard Architecture

## Structure
- `src/components/admin/layout/AdminLayout.tsx` — Outlet-based shell, receives theme/toggleTheme from App.tsx
- `src/components/admin/layout/AdminSidebar.tsx` — collapsible (240px/64px), Framer Motion, localStorage persistence, mobile drawer
- `src/components/admin/layout/AdminTopbar.tsx` — breadcrumbs, debounced global search, live notification bell (KYC + appointments), user dropdown
- `src/components/admin/shared/` — PageShell, Card, Td, Btn, Select, SearchInput, StatusBadge, KPICard, SlideOver, Skeleton, EmptyState
- `src/components/admin/pages/` — 16 page components (Dashboard, Products, Orders, Distributors, Wallets, Commissions, Blog, Events, Testimonials, Gallery, Appointments, Contacts, Newsletter, Media, Settings, Audit)

## Routing (App.tsx)
```
<Route path="/admin" element={<ProtectedRoute ...><AdminLayout .../></ProtectedRoute>}>
  <Route index element={<Navigate to="/admin/dashboard" replace />} />
  <Route path="dashboard" element={<DashboardPage />} />
  ... 15 more sub-routes ...
</Route>
```
The old AdminPortal.tsx monolith (2500+ lines) is no longer used in routing — it can be deleted when safe.

## Key gotchas
- **MediaUploader prop is `onUploaded` not `onUpload`** — also takes no `currentUrl` prop; just `bucket`, `onUploaded`, `accept`, `maxSizeMb`, `multiple`, `label`.
- **React.ReactNode / React.FormEvent** — files using these types need `import React from "react"` or import the types explicitly (`import { ReactNode, MouseEventHandler } from "react"`).
- **SkeletonTable** — key must go on the `<tr>` inside, not passed as a prop to SkeletonRow.
- **Td component** — supports optional `onClick` prop typed as `MouseEventHandler<HTMLTableCellElement>`.
- **SUPABASE_SERVICE_ROLE_KEY** — must be set as env var (shared) for server.ts to start; server calls process.exit(1) if missing.

**Why:** The old single-file AdminPortal had all state/data fetched at top level, causing excessive re-renders and making it impossible to add real URL-based navigation. Each page now manages its own data fetch + realtime subscription independently.

**How to apply:** When adding new admin sections, add a new file in `pages/`, add a nav item to `AdminSidebar.tsx` NAV_ITEMS array, and a `<Route path="section-name" element={<SectionPage />} />` inside the /admin Route in App.tsx.
