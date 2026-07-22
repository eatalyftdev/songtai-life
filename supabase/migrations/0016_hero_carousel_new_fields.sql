-- Migration: extend hero_carousel with badge, benefits, CTA, and product link fields
-- Run this in the Supabase SQL editor or via `supabase db push`

ALTER TABLE hero_carousel
  ADD COLUMN IF NOT EXISTS badge_label_en  TEXT,
  ADD COLUMN IF NOT EXISTS badge_label_fr  TEXT,
  ADD COLUMN IF NOT EXISTS benefits        JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_link        TEXT,
  ADD COLUMN IF NOT EXISTS linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

COMMENT ON COLUMN hero_carousel.badge_label_en IS 'Small pill badge shown over the slide, e.g. "Featured Solution" (English)';
COMMENT ON COLUMN hero_carousel.badge_label_fr IS 'Small pill badge shown over the slide (French)';
COMMENT ON COLUMN hero_carousel.benefits IS 'JSON array of {icon: string, label_en: string, label_fr: string} — benefit chips shown under slide copy';
COMMENT ON COLUMN hero_carousel.cta_link IS 'Optional URL the slide links to (overridden by linked_product_id if set)';
COMMENT ON COLUMN hero_carousel.linked_product_id IS 'Optional FK to products — clicking the slide navigates to this product';
