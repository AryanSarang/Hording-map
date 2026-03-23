DROP VIEW IF EXISTS public.hordings_complete;

DROP TABLE IF EXISTS public.media_variant_pricing;
DROP TABLE IF EXISTS public.media_pricing;

CREATE VIEW public.hordings_complete AS
SELECT
  h.id,
  h.vendor_id,
  h.latitude,
  h.longitude,
  h.state,
  h.city,
  h.address,
  h.pincode,
  h.poc_name,
  h.poc_number,
  h.poc_email,
  h.monthly_rental,
  h.vendor_rate,
  h.payment_terms,
  h.minimum_booking_duration,
  h.media_type,
  h.media,
  h.zone,
  h.landmark,
  h.road_name,
  h.traffic_type,
  h.screen_size,
  h.screen_number,
  h.screen_placement,
  h.display_format,
  h.slot_time,
  h.loop_time,
  h.display_hours,
  h.width,
  h.height,
  h.visibility,
  h.condition,
  h.previous_clientele,
  h.dwell_time,
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
