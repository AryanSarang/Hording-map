-- Extend media_type whitelist to include Cafe Screen.
-- Drop + recreate check constraint so existing rows keep passing.
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
        'Corporate'::text,
        'Corporate Coffee Machines'::text,
        'Croma Stores'::text,
        'ATM'::text,
        'other'::text
      ]
    )
  );
