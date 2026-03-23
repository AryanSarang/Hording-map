ALTER TABLE public.media
  DROP COLUMN IF EXISTS road_from,
  DROP COLUMN IF EXISTS road_to,
  DROP COLUMN IF EXISTS position_wrt_road;
