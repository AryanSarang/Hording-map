-- Create plans table to store user-specific plans created from the explore page
-- Each plan is linked to a Supabase auth user and stores selected media IDs in a JSONB array.

CREATE TABLE IF NOT EXISTS public.plans (
    id character varying(10) PRIMARY KEY DEFAULT gen_id10(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans (user_id);

