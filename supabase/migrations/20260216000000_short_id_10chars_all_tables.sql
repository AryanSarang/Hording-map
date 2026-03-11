-- Migration: 10-char string IDs for vendors, media, media_pricing, media_metafields
-- Run in Supabase SQL Editor. No long UUIDs; all IDs are 10 characters.

CREATE OR REPLACE FUNCTION gen_id10() RETURNS text LANGUAGE sql AS $$
  SELECT encode(gen_random_bytes(5), 'hex');
$$;

DROP VIEW IF EXISTS public.hordings_complete;

-- ========== 1. VENDORS id (integer -> varchar(10)) ==========
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS id_new varchar(10);
UPDATE public.vendors SET id_new = substring(md5('v' || id::text), 1, 10) WHERE id_new IS NULL;

ALTER TABLE public.media ADD COLUMN IF NOT EXISTS vendor_id_new varchar(10);
UPDATE public.media m SET vendor_id_new = v.id_new FROM public.vendors v WHERE v.id = m.vendor_id;
ALTER TABLE public.vendor_metafields ADD COLUMN IF NOT EXISTS vendor_id_new varchar(10);
UPDATE public.vendor_metafields vm SET vendor_id_new = v.id_new FROM public.vendors v WHERE v.id = vm.vendor_id;

ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_vendor_id_fkey;
ALTER TABLE public.vendor_metafields DROP CONSTRAINT IF EXISTS vendor_metafields_vendor_id_fkey;

ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_pkey;
ALTER TABLE public.vendors DROP COLUMN id;
ALTER TABLE public.vendors RENAME COLUMN id_new TO id;
ALTER TABLE public.vendors ALTER COLUMN id SET DEFAULT gen_id10();
ALTER TABLE public.vendors ADD PRIMARY KEY (id);

ALTER TABLE public.media DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE public.media RENAME COLUMN vendor_id_new TO vendor_id;
ALTER TABLE public.vendor_metafields DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE public.vendor_metafields RENAME COLUMN vendor_id_new TO vendor_id;

ALTER TABLE public.media ADD CONSTRAINT media_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);
ALTER TABLE public.vendor_metafields ADD CONSTRAINT vendor_metafields_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);

-- ========== 2. MEDIA id (uuid or integer -> varchar(10)) ==========
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS id_new varchar(10);
-- Backfill: if id is UUID use first 10 hex chars; if integer use hash; else gen_id10()
UPDATE public.media SET id_new = substring(replace(id::text, '-', ''), 1, 10)
  WHERE id_new IS NULL AND id::text ~ '^[0-9a-f-]{36}$';
UPDATE public.media SET id_new = substring(md5('m' || id::text), 1, 10)
  WHERE id_new IS NULL AND id IS NOT NULL;
UPDATE public.media SET id_new = gen_id10() WHERE id_new IS NULL;

ALTER TABLE public.media_pricing ADD COLUMN IF NOT EXISTS media_id_new varchar(10);
UPDATE public.media_pricing mp SET media_id_new = m.id_new FROM public.media m WHERE m.id = mp.media_id;
ALTER TABLE public.media_metafields ADD COLUMN IF NOT EXISTS media_id_new varchar(10);
UPDATE public.media_metafields mm SET media_id_new = m.id_new FROM public.media m WHERE m.id = mm.media_id;

ALTER TABLE public.media_pricing DROP CONSTRAINT IF EXISTS media_pricing_media_id_fkey;
ALTER TABLE public.media_metafields DROP CONSTRAINT IF EXISTS media_metafields_media_id_fkey;

ALTER TABLE public.media_pricing DROP COLUMN media_id;
ALTER TABLE public.media_pricing RENAME COLUMN media_id_new TO media_id;
ALTER TABLE public.media_metafields DROP COLUMN media_id;
ALTER TABLE public.media_metafields RENAME COLUMN media_id_new TO media_id;

ALTER TABLE public.media_pricing ALTER COLUMN media_id SET NOT NULL;
ALTER TABLE public.media_metafields ALTER COLUMN media_id SET NOT NULL;

ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_pkey;
ALTER TABLE public.media DROP CONSTRAINT IF EXISTS hordings_pkey;
ALTER TABLE public.media DROP COLUMN id;
ALTER TABLE public.media RENAME COLUMN id_new TO id;
ALTER TABLE public.media ALTER COLUMN id SET DEFAULT gen_id10();
ALTER TABLE public.media ADD PRIMARY KEY (id);

ALTER TABLE public.media_pricing ADD CONSTRAINT media_pricing_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;
ALTER TABLE public.media_metafields ADD CONSTRAINT media_metafields_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;

-- ========== 3. MEDIA_PRICING id ==========
ALTER TABLE public.media_pricing ADD COLUMN IF NOT EXISTS id_new varchar(10);
UPDATE public.media_pricing SET id_new = substring(md5(id::text || ctid::text), 1, 10) WHERE id_new IS NULL;
ALTER TABLE public.media_pricing DROP CONSTRAINT IF EXISTS media_pricing_pkey;
ALTER TABLE public.media_pricing DROP COLUMN id;
ALTER TABLE public.media_pricing RENAME COLUMN id_new TO id;
ALTER TABLE public.media_pricing ALTER COLUMN id SET DEFAULT gen_id10();
ALTER TABLE public.media_pricing ADD PRIMARY KEY (id);

-- ========== 4. MEDIA_METAFIELDS id ==========
ALTER TABLE public.media_metafields ADD COLUMN IF NOT EXISTS id_new varchar(10);
UPDATE public.media_metafields SET id_new = substring(md5(id::text || ctid::text), 1, 10) WHERE id_new IS NULL;
ALTER TABLE public.media_metafields DROP CONSTRAINT IF EXISTS media_metafields_pkey;
ALTER TABLE public.media_metafields DROP CONSTRAINT IF EXISTS hording_metafields_pkey;
ALTER TABLE public.media_metafields DROP COLUMN id;
ALTER TABLE public.media_metafields RENAME COLUMN id_new TO id;
ALTER TABLE public.media_metafields ALTER COLUMN id SET DEFAULT gen_id10();
ALTER TABLE public.media_metafields ADD PRIMARY KEY (id);

-- ========== View ==========
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
