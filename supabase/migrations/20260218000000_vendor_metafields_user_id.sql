-- Metafields are user-specific: add user_id and make vendor_id optional
ALTER TABLE public.vendor_metafields
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.vendor_metafields
  ALTER COLUMN vendor_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_metafields_user_id ON public.vendor_metafields(user_id);
