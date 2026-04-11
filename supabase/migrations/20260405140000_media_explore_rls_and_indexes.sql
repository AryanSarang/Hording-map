-- Explore/catalog hardening: block anonymous PostgREST reads on media + variants.
-- Application reads catalog via service role (Next.js API / server components only).
-- Vendors signed in with Supabase JWT can still SELECT their own rows (optional client use).

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_select_own ON public.media;
CREATE POLICY media_select_own
  ON public.media
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS media_variants_select_for_owned_media ON public.media_variants;
CREATE POLICY media_variants_select_for_owned_media
  ON public.media_variants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.media m
      WHERE m.id = media_variants.media_id
        AND m.user_id = auth.uid()
    )
  );

-- Performance: map and location filters
CREATE INDEX IF NOT EXISTS idx_media_lat_lng
  ON public.media (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_state_city_lower
  ON public.media (lower(state), lower(city));

CREATE INDEX IF NOT EXISTS idx_media_variants_media_id
  ON public.media_variants (media_id);

COMMENT ON POLICY media_select_own ON public.media IS
  'Anon has no policy = no direct reads; service_role bypasses RLS for server-side catalog APIs.';
