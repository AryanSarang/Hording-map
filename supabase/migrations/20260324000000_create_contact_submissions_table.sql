CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id bigserial PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  company_name text,
  phone text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at
  ON public.contact_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status
  ON public.contact_submissions(status);
