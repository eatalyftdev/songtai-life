---
name: Product video — YouTube link support (dual-source)
description: How the YouTube-URL video option coexists with the pre-existing TUS file-upload video system.
---

## Decision
Products support a per-locale (EN/FR) video **source toggle**: `video_source_en`/`video_source_fr`
columns are `'upload'` (default, existing TUS-uploaded file in the `product-videos` bucket) or
`'youtube'` (a pasted YouTube URL). Only one is ever active per locale — switching source in the
admin clears the other source's URL/thumbnail for that locale.

**Why:** user explicitly wanted YouTube-link support added as an alternative, not a replacement,
and wanted only one video type rendering at a time per locale (not both) for response-time reasons.

## How it flows through the app
- `src/lib/youtube.ts` — canonical URL parsing (`extractYouTubeId`, embed/thumbnail helpers). Never
  put a raw URL into an iframe `src` — always pass through `extractYouTubeId`/`getYouTubeEmbedUrl` first.
- Admin (`ProductsPage.tsx`): per-locale "Upload file" vs "YouTube link" toggle; YouTube path skips
  `VideoUploader` and shows a URL input + live thumbnail preview + manual mm:ss duration entry.
- Public product detail (`Products.tsx`) and the new `/videos` showcase page
  (`brand/VideoShowcase.tsx`, wired into `BrandShowcase.tsx` as `brandPage === "videos"`) both branch
  on `video_source_en/fr` to render either a native `<video>` (upload) or a lazy click-to-play
  YouTube embed (`YouTubePlayer.tsx` — iframe only mounts after user clicks, uses youtube-nocookie.com).
- `server.ts` sitemap.xml emits `video:content_loc` for uploads and `video:player_loc` for YouTube
  (Google requires one or the other, not necessarily both) — has its own inlined copy of the
  ID-extraction logic since server.ts doesn't import from `src/`.

## Gotcha: this app has no real URL-based deep linking
Despite the sitemap generating `/?section=products&slug=x` style URLs, the SPA (`brandPage` state in
`App.tsx`) never actually reads `location.search` — confirmed via repo-wide grep, zero matches for
`URLSearchParams`/`location.search`. Screenshotting or curling those sitemap URLs directly just loads
the homepage. This is a pre-existing, site-wide gap (not specific to video), already flagged in
`spa-seo-architecture.md` as a "future improvement." Don't mistake it for a bug introduced by new work.
