---
name: Product video feature
description: Bilingual EN/FR product videos with TUS resumable uploads, admin panel, public player, VideoObject JSON-LD, and video sitemap.
---

## Key decisions

### TUS endpoint pattern
- `${SUPABASE_URL}/storage/v1/upload/resumable` — get token from `supabase.auth.getSession()`
- Chunk size must be exactly 6MB (`6 * 1024 * 1024`) — Supabase requirement
- Auth header: `authorization: Bearer ${token}` + `x-upsert: true`
- Object path: `${folder}/${locale}-${timestamp}-${randomId}.${ext}`, bucket: `product-videos`
- After TUS success, public URL is predictable: `${SUPABASE_URL}/storage/v1/object/public/product-videos/${objectName}`

### Thumbnail capture
- Hidden `<video>` ref + canvas (no npm dep needed)
- Seek to `min(1, duration * 0.05)` seconds on `loadedmetadata`
- Draw to canvas on `onseeked`, get JPEG blob via `canvas.toBlob`
- Upload to `media` bucket under `products/thumbnails/`
- Fallback: if capture fails, proceed without thumbnail (non-fatal)

### Locale fallback logic (public player)
- EN locale: `p.videoUrlEn || p.videoUrlFr`
- FR locale: `p.videoUrlFr || p.videoUrlEn`
- Show amber banner when falling back to other locale's video
- Same pattern applies to thumbnails and titles/descriptions

### VideoObject JSON-LD (schema.org)
- `embedUrl`: `${window.location.origin}/?section=products&slug=${p.slug}` (SPA pattern, not `/products/:slug`)
- `duration`: ISO 8601 format `PT${minutes}M${seconds}S`
- Passed via `jsonLd` prop on existing `SEO.tsx` component (already supports `jsonLd?: Record<string, any>`)
- `og:video` via additional `<Helmet>` tag in `Products.tsx`

### Video sitemap (server.ts)
- `xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"` on `<urlset>`
- `<video:video>` block added to each product URL that has `video_url_en` or `video_url_fr`
- English video preferred; French as fallback (for sitemap)
- `escXml()` helper used to escape XML entities in user-supplied strings
- Products query extended to fetch all 11 video columns + `name_en`

### DB migration
- `supabase/migrations/0013_product_videos.sql` adds 9 columns to `products` table
- Bucket `product-videos` must be created manually in Supabase Dashboard (SQL can't create buckets)
- RLS policies for the bucket are in the migration SQL

### SUPABASE_URL exposure
- Exported from `src/lib/supabase.ts` as `export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || ""`
- Import in VideoUploader: `import { supabase, SUPABASE_URL } from "../lib/supabase"`

**Why:** `tus-js-client` needs the raw Supabase storage URL to construct the TUS endpoint, which the supabase-js client doesn't expose directly.
