-- Credits wallet for non-admin users (admins are exempt at the API level)

-- Balance table (lazy init to 50 credits)
CREATE TABLE IF NOT EXISTS public.user_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ledger / transaction history
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at
  ON public.credit_transactions(user_id, created_at DESC);

-- Ensure a user has a balance row (lazy initialization)
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_balance integer;
BEGIN
  INSERT INTO public.user_credit_balances(user_id, credits)
  VALUES (p_user_id, 50)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT ub.credits INTO v_balance
  FROM public.user_credit_balances ub
  WHERE ub.user_id = p_user_id;

  RETURN COALESCE(v_balance, 50);
END;
$$;

-- Apply a credit delta atomically (update balance + insert ledger entry)
CREATE OR REPLACE FUNCTION public.apply_credit_delta(
  p_user_id uuid,
  p_action text,
  p_delta integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- lazy init
  INSERT INTO public.user_credit_balances(user_id, credits)
  VALUES (p_user_id, 50)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credit_balances
  SET credits = credits + p_delta,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits INTO v_new_balance;

  INSERT INTO public.credit_transactions(user_id, action, delta, balance_after, metadata)
  VALUES (p_user_id, p_action, p_delta, v_new_balance, COALESCE(p_metadata, '{}'::jsonb));

  RETURN v_new_balance;
END;
$$;

