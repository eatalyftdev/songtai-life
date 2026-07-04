---
name: Supabase Realtime live-data pattern for public pages
description: How to add live Supabase Realtime subscriptions to public React pages without breaking fallback seed data.
---

# Supabase Realtime Live-Data Pattern

## Pattern

For every public page that needs live data (Products, Blog, HeroCarousel, HomeSection):

1. Initialize state with **seed data as fallback** — page renders immediately without flash.
2. `useEffect` fires a Supabase fetch; if successful and non-empty, overwrite state.
3. Inside the same `useEffect`, subscribe to a Realtime channel on the table; on any `*` event, re-run the fetch.
4. Return a cleanup function that calls `supabase.removeChannel(channel)`.

```ts
useEffect(() => {
  const fetch = async () => {
    const { data, error } = await supabase.from("products")...
    if (!error && data?.length) setProducts(data.map(mapDbRow));
  };
  fetch();
  const ch = supabase.channel("products_rt")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetch)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [locale]); // re-subscribe when locale changes
```

## Channel naming

Use unique channel names per table per component (e.g. `home_products_rt`, `home_blog_rt`, `home_testimonials_rt`) to avoid conflicts.

## DB→UI field mapping

`products` table uses `name_en`/`name_fr` + `category_id` (FK to `product_categories`). Always use `select("*, product_categories(name)")` for the category name join. Map in `mapDbRow()`.

**Why:** The public-facing component types expect a flat `name` and `category` string; the DB has normalized FK relations.

## Testimonials

`testimonials` table has: `id, name, rank, region, quote, quote_fr, image, video_url, is_featured, display_order`. Public page uses `display_order` for sort, `quote_fr` for FR locale.
