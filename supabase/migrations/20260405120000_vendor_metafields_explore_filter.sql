-- Toggle which vendor metafields appear as optional filters on /explore
ALTER TABLE public.vendor_metafields
ADD COLUMN IF NOT EXISTS explore_filter_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.vendor_metafields.explore_filter_enabled IS
    'When true, values for this metafield are exposed as an explore filter (multi-select).';
