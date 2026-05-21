-- Scope explore-filter metafields to specific media types.
--
-- Without this, any metafield with `explore_filter_enabled = true` shows as a global filter
-- on /explore regardless of the user's selected media type — so e.g. a "Cinema Chain" filter
-- would appear when the user is browsing Cafe Screens. Adding a per-metafield media-type
-- whitelist lets vendors say "this filter only makes sense when these media types are visible".
--
-- Semantics:
--   - NULL / empty array  →  applies to all media types (backward compatible default)
--   - non-empty array     →  filter is only shown when one of these media types is selected
--                            (and is hidden when the user has selected only other media types)
--
-- We use TEXT[] rather than a join table because the canonical media_type values are short,
-- unique, and rarely renamed; the simplicity is worth the trade-off.

ALTER TABLE public.vendor_metafields
    ADD COLUMN IF NOT EXISTS applies_to_media_types text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.vendor_metafields.applies_to_media_types IS
    'When non-empty, the metafield is only offered as a filter on /explore for media whose media_type is in this list. Empty array = applies to all media types.';

NOTIFY pgrst, 'reload schema';
