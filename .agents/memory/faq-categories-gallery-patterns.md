---
name: FAQ / Categories / Gallery admin patterns
description: Shared design decisions for FAQ, ProductCategories, and GalleryAlbums admin pages added in the content-management pass.
---

## Rule
All three new lookup/grouping tables follow an identical shape: bilingual name fields (name_en/name_fr), display_order integer, active/published boolean, RLS via is_admin(), public-read scoped to active/published rows.

## Delete guard pattern
Before deleting a parent row, count dependent children in JS (not a DB constraint) and surface a blocking alert. See ProductCategoriesPage.tsx and FAQPage.tsx handleDelete.

## Featured products fallback (HomeSection.tsx)
Fetch is_featured=true first, then pad with most-recent active by post-filtering in JS using a Set of already-fetched IDs. Minimum threshold = 4. Avoid .not("id","in", constructedString) — fragile with empty arrays.

## Error handling in CRUD saves
All save handlers check { error } from Supabase, alert on failure, and return early keeping the modal open.

## Gallery public page
No longer falls back to GALLERY_SEED — shows empty state when DB has no images. Album filter pills driven by gallery_albums table with fallback to unique album names from image rows.

## CSP + Google Fonts
style-src must include https://fonts.googleapis.com (serves the CSS); font-src must include https://fonts.gstatic.com (serves the font files). Both server.ts and vercel.json need updating together.

## Admin pages use direct supabase (not useAdminResource)
FAQPage, ProductCategoriesPage, GalleryPage use direct supabase calls because they manage 2+ related tables — same as ProductsPage.
