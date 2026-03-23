-- Generalize variants to support a third option axis (Shopify-style up to 3 options)

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS option3_name text;

ALTER TABLE public.media_variants
  ADD COLUMN IF NOT EXISTS option3_value text;

-- Replace older unique constraint/index (option1+option2) with 3-option uniqueness
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'media_variants'
      AND constraint_name = 'media_variants_option_unique'
  ) THEN
    ALTER TABLE public.media_variants DROP CONSTRAINT media_variants_option_unique;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

DROP INDEX IF EXISTS public.idx_media_variants_option_unique3;
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_variants_option_unique3
  ON public.media_variants (
    media_id,
    option1_value,
    option2_value,
    COALESCE(option3_value, '')
  );

