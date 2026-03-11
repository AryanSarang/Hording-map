-- Remove compliance column from media and update view
DROP VIEW IF EXISTS public.hordings_complete;
ALTER TABLE public.media DROP COLUMN IF EXISTS compliance;

CREATE VIEW public.hordings_complete AS
SELECT h.id, h.vendor_id, h.latitude, h.longitude, h.state, h.city, h.address, h.pincode,
  h.poc_name, h.poc_number, h.poc_email, h.monthly_rental, h.vendor_rate, h.payment_terms,
  h.minimum_booking_duration, h.media_type, h.media, h.zone, h.landmark, h.road_name, h.road_from,
  h.road_to, h.position_wrt_road, h.traffic_type, h.screen_size, h.screen_number, h.screen_placement,
  h.display_format, h.slot_time, h.loop_time, h.display_hours, h.width, h.height,
  h.visibility, h.condition, h.previous_clientele, h.dwell_time, h.status, h.created_at, h.updated_at,
  COALESCE(json_object_agg(m.key, m.value), '{}'::json) AS metafields,
  array_agg(p.* ORDER BY p.display_order) AS pricing
FROM media h
LEFT JOIN media_metafields m ON h.id = m.media_id
LEFT JOIN media_pricing p ON h.id = p.media_id
GROUP BY h.id;
