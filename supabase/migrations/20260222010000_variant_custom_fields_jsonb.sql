-- Store dynamic variant-specific fields (Shopify-like metafields) as JSON
ALTER TABLE public.media_variants
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

