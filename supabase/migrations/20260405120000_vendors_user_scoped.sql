-- Vendors are scoped per auth user: same name for two users = two rows.
-- CSV import uses vendor_name only; app resolves or creates vendor per user.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Single owning user for this vendor (from media): attach user_id
UPDATE public.vendors v
SET user_id = s.user_id
FROM (
  SELECT m.vendor_id, (MIN(m.user_id::text))::uuid AS user_id
  FROM public.media m
  WHERE m.vendor_id IS NOT NULL
  GROUP BY m.vendor_id
  HAVING COUNT(DISTINCT m.user_id) = 1
) s
WHERE v.id = s.vendor_id
  AND v.user_id IS NULL;

-- Shared vendor row used by multiple users: keep first user on original row, clone vendor for others
DO $$
DECLARE
  v_id text;
  r record;
  new_vid text;
  first_user boolean;
BEGIN
  FOR v_id IN
    SELECT m.vendor_id
    FROM public.media m
    WHERE m.vendor_id IS NOT NULL
    GROUP BY m.vendor_id
    HAVING COUNT(DISTINCT m.user_id) > 1
  LOOP
    first_user := true;
    FOR r IN
      SELECT DISTINCT m.user_id AS uid
      FROM public.media m
      WHERE m.vendor_id = v_id
      ORDER BY m.user_id::text
    LOOP
      IF first_user THEN
        UPDATE public.vendors SET user_id = r.uid WHERE id = v_id;
        first_user := false;
      ELSE
        INSERT INTO public.vendors (id, name, description, contact_email, contact_phone, status, user_id)
        SELECT gen_id10(), v.name, v.description, v.contact_email, v.contact_phone, COALESCE(v.status, 'active'), r.uid
        FROM public.vendors v
        WHERE v.id = v_id
        RETURNING id INTO new_vid;

        UPDATE public.media SET vendor_id = new_vid WHERE vendor_id = v_id AND user_id = r.uid;

        UPDATE public.vendor_metafields vm
        SET vendor_id = new_vid
        WHERE vm.vendor_id = v_id
          AND vm.user_id = r.uid;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Vendors never referenced by media: assign no user (nullable) or leave NULL

CREATE UNIQUE INDEX IF NOT EXISTS vendors_user_id_name_lower
  ON public.vendors (user_id, lower(btrim(name)))
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors (user_id);

COMMENT ON COLUMN public.vendors.user_id IS 'Owner of this vendor row; pair with name is unique per user.';
