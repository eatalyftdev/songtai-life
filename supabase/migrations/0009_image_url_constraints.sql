-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0009: DB-level check constraints to enforce Supabase-hosted images
--
-- Uses NOT VALID so the constraint is added without scanning existing rows —
-- this means the migration is safe on a live database with existing external
-- URLs. After manually re-hosting any external images via the Media Library
-- scan tool, run the VALIDATE CONSTRAINT statements (commented at the bottom)
-- to fully enforce the constraint on historical data.
-- ─────────────────────────────────────────────────────────────────────────────

-- blog_posts.image
ALTER TABLE blog_posts
  DROP CONSTRAINT IF EXISTS blog_featured_image_supabase_hosted;
ALTER TABLE blog_posts
  ADD CONSTRAINT blog_featured_image_supabase_hosted
  CHECK (
    image IS NULL
    OR image = ''
    OR image LIKE 'https://auyjxchghtetxpiyecds.supabase.co/storage/%'
  ) NOT VALID;

-- gallery_images.url
ALTER TABLE gallery_images
  DROP CONSTRAINT IF EXISTS gallery_image_url_supabase_hosted;
ALTER TABLE gallery_images
  ADD CONSTRAINT gallery_image_url_supabase_hosted
  CHECK (
    url IS NULL
    OR url = ''
    OR url LIKE 'https://auyjxchghtetxpiyecds.supabase.co/storage/%'
  ) NOT VALID;

-- product_categories.image_url
ALTER TABLE product_categories
  DROP CONSTRAINT IF EXISTS product_category_image_supabase_hosted;
ALTER TABLE product_categories
  ADD CONSTRAINT product_category_image_supabase_hosted
  CHECK (
    image_url IS NULL
    OR image_url = ''
    OR image_url LIKE 'https://auyjxchghtetxpiyecds.supabase.co/storage/%'
  ) NOT VALID;

-- testimonials.image  (photo only — video_url stays external by design)
ALTER TABLE testimonials
  DROP CONSTRAINT IF EXISTS testimonials_image_url_supabase_hosted;
ALTER TABLE testimonials
  ADD CONSTRAINT testimonials_image_url_supabase_hosted
  CHECK (
    image IS NULL
    OR image = ''
    OR image LIKE 'https://auyjxchghtetxpiyecds.supabase.co/storage/%'
  ) NOT VALID;

-- ─────────────────────────────────────────────────────────────────────────────
-- After re-hosting all external images via Media Library → External Images tab,
-- run these to make the constraints fully enforced on all rows:
--
-- ALTER TABLE blog_posts VALIDATE CONSTRAINT blog_featured_image_supabase_hosted;
-- ALTER TABLE gallery_images   VALIDATE CONSTRAINT gallery_image_url_supabase_hosted;
-- ALTER TABLE product_categories VALIDATE CONSTRAINT product_category_image_supabase_hosted;
-- ALTER TABLE testimonials     VALIDATE CONSTRAINT testimonials_image_url_supabase_hosted;
-- ─────────────────────────────────────────────────────────────────────────────
