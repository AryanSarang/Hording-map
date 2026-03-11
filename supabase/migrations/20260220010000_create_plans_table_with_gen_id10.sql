-- Create helper function gen_id10() if it doesn't already exist,
-- then create the plans table using 10-character string IDs.

CREATE OR REPLACE FUNCTION public.gen_id10()
RETURNS character varying
LANGUAGE sql
STABLE
AS $$
SELECT substring(replace(gen_random_uuid()::text, '-', ''), 1, 10);
$$;

CREATE TABLE IF NOT EXISTS public.plans (
    id character varying(10) PRIMARY KEY DEFAULT gen_id10(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans (user_id);

