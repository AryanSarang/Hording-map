DROP VIEW IF EXISTS public.hordings_complete;

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS locality text,
  DROP COLUMN IF EXISTS screen_number,
  DROP COLUMN IF EXISTS screen_placement,
  DROP COLUMN IF EXISTS slot_time,
  DROP COLUMN IF EXISTS loop_time,
  DROP COLUMN IF EXISTS traffic_type,
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS dwell_time,
  DROP COLUMN IF EXISTS road_name,
  DROP COLUMN IF EXISTS width,
  DROP COLUMN IF EXISTS height,
  DROP COLUMN IF EXISTS payment_terms;

CREATE TABLE IF NOT EXISTS public.media_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  option_label text NOT NULL,
  multiplier numeric(10,4) NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_pricing_rules_media_id
  ON public.media_pricing_rules(media_id);

CREATE VIEW public.hordings_complete AS
SELECT
  h.id,
  h.vendor_id,
  h.user_id,
  h.latitude,
  h.longitude,
  h.state,
  h.city,
  h.locality,
  h.address,
  h.pincode,
  h.poc_name,
  h.poc_number,
  h.poc_email,
  h.monthly_rental,
  h.vendor_rate,
  h.minimum_booking_duration,
  h.media_type,
  h.media,
  h.zone,
  h.landmark,
  h.screen_size,
  h.display_format,
  h.display_hours,
  h.condition,
  h.previous_clientele,
  h.status,
  h.title,
  h.has_variants,
  h.option1_name,
  h.option2_name,
  h.option3_name,
  h.created_at,
  h.updated_at,
  COALESCE(mm.metafields, '{}'::json) AS metafields
FROM public.media h
LEFT JOIN LATERAL (
  SELECT json_object_agg(m.key, m.value) AS metafields
  FROM public.media_metafields m
  WHERE m.media_id = h.id
) mm ON true;
