-- Add the "plan intent" columns the new flow needs.
--
-- New /plans landing requires the user to commit to a media type + up to two
-- states before they enter /explore. We persist those choices on the plan so:
--   1. Plan cards can show "Cinema Screen · Maharashtra, Karnataka" at a glance.
--   2. /explore?planId=X can preselect the right filter slice on load.
--   3. A plan stays semantically scoped to its category even after the user
--      removes every line item.
--
-- Constraints:
--   - `media_type` is optional (older plans created before this column was
--     introduced have NULL — UI treats that as "any").
--   - `states` is a non-null text array, capped at 2 elements at the DB level
--     so a malicious client can't bypass the form. Empty array allowed for
--     legacy plans.

ALTER TABLE public.plans
    ADD COLUMN IF NOT EXISTS media_type text,
    ADD COLUMN IF NOT EXISTS states text[] NOT NULL DEFAULT '{}'::text[];

-- Cap on number of states. Two is the product spec; raise this number if the
-- form ever allows more — but never less without backfilling existing plans.
ALTER TABLE public.plans
    DROP CONSTRAINT IF EXISTS plans_states_max_two;
ALTER TABLE public.plans
    ADD CONSTRAINT plans_states_max_two
    CHECK (array_length(states, 1) IS NULL OR array_length(states, 1) <= 2);

-- Surface in PostgREST immediately.
NOTIFY pgrst, 'reload schema';
