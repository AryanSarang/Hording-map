-- Rename media_type "Corporate" → "Corporate Screen" (aligns with Cinema Screen / Cafe Screen).

UPDATE public.media
SET media_type = 'Corporate Screen'
WHERE media_type = 'Corporate';

UPDATE public.plans
SET media_type = 'Corporate Screen'
WHERE media_type = 'Corporate';

UPDATE public.vendor_metafields
SET applies_to_media_types = (
    SELECT COALESCE(
        array_agg(
            CASE WHEN x = 'Corporate' THEN 'Corporate Screen' ELSE x END
            ORDER BY ord
        ),
        '{}'::text[]
    )
    FROM unnest(applies_to_media_types) WITH ORDINALITY AS t(x, ord)
)
WHERE 'Corporate' = ANY (applies_to_media_types);

UPDATE public.profiles
SET explore_preferences = jsonb_set(
    explore_preferences,
    '{mediaType}',
    '"Corporate Screen"'::jsonb
)
WHERE explore_preferences->>'mediaType' = 'Corporate';

ALTER TABLE public.media
  DROP CONSTRAINT IF EXISTS media_media_type_check;

ALTER TABLE public.media
  ADD CONSTRAINT media_media_type_check
  CHECK (
    media_type::text = ANY (
      ARRAY[
        'Bus Shelter'::text,
        'Digital Screens'::text,
        'Cinema Screen'::text,
        'Cafe Screen'::text,
        'Residential'::text,
        'Corporate Screen'::text,
        'Corporate Coffee Machines'::text,
        'Croma Stores'::text,
        'ATM'::text,
        'other'::text
      ]
    )
  );

NOTIFY pgrst, 'reload schema';
