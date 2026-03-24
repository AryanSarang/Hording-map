DROP VIEW IF EXISTS public.hordings_complete;

ALTER TABLE public.media
  DROP COLUMN IF EXISTS condition,
  DROP COLUMN IF EXISTS previous_clientele;

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
