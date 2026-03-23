-- Shopify-style variants for media:
-- 1 parent media record -> many media_variants records
-- This migration is adaptive to the existing media.id type (uuid or varchar).

-- Parent-level variant metadata on media
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS option1_name text NOT NULL DEFAULT 'Screen Code',
  ADD COLUMN IF NOT EXISTS option2_name text NOT NULL DEFAULT 'Auditorium';

DO $$
DECLARE
  media_id_type text;
BEGIN
  SELECT
    CASE
      WHEN data_type = 'USER-DEFINED' THEN udt_name
      WHEN data_type = 'character varying' THEN 'varchar'
      ELSE data_type
    END
  INTO media_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'media'
    AND column_name = 'id';

  IF media_id_type IS NULL THEN
    RAISE EXCEPTION 'Could not detect public.media.id type';
  END IF;

  -- Child variants table
  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS public.media_variants (
      id varchar(10) PRIMARY KEY DEFAULT public.gen_id10(),
      media_id %s NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
      variant_title text,
      option1_value text NOT NULL,
      option2_value text NOT NULL,
      audience_category text,
      seating integer,
      cinema_format text,
      size text,
      rate integer,
      details text,
      external_links text,
      photographs text,
      is_active boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT media_variants_option_unique UNIQUE (media_id, option1_value, option2_value)
    )
  $sql$, media_id_type);

  CREATE INDEX IF NOT EXISTS idx_media_variants_media_id ON public.media_variants(media_id);
  CREATE INDEX IF NOT EXISTS idx_media_variants_rate ON public.media_variants(rate);

  -- Additional price tiers per variant
  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS public.media_variant_pricing (
      id varchar(10) PRIMARY KEY DEFAULT public.gen_id10(),
      media_variant_id varchar(10) NOT NULL REFERENCES public.media_variants(id) ON DELETE CASCADE,
      media_id %s NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
      price_name varchar NOT NULL,
      price integer NOT NULL CHECK (price > 0),
      duration varchar NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  $sql$, media_id_type);

  CREATE INDEX IF NOT EXISTS idx_media_variant_pricing_variant_id ON public.media_variant_pricing(media_variant_id);
  CREATE INDEX IF NOT EXISTS idx_media_variant_pricing_media_id ON public.media_variant_pricing(media_id);
END $$;

-- Backfill one default variant for existing media rows that don't have variants yet
INSERT INTO public.media_variants (
  media_id,
  variant_title,
  option1_value,
  option2_value,
  size,
  rate,
  display_order
)
SELECT
  m.id,
  COALESCE(NULLIF(m.screen_size, ''), 'Default Variant'),
  'Default',
  'Default',
  m.screen_size,
  m.monthly_rental,
  0
FROM public.media m
LEFT JOIN public.media_variants mv ON mv.media_id = m.id
WHERE mv.id IS NULL;

