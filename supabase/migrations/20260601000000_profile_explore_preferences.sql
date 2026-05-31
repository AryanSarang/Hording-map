-- First-visit explore onboarding choices stored on the profile.
--
-- Used by /explore to pre-filter the landing slice to the user's preferred state and
-- media type. The form is single-step and has no skip button (see UX spec #6), so an
-- empty `{}` here means the user hasn't seen the modal yet — the page will show it
-- on their next visit until they pick.
--
-- Shape:
--   {
--     "state":     "Maharashtra",       // string, must be a valid state name
--     "mediaType": "Cinema Screen"      // string, must match a canonical MEDIA_TYPES value
--   }
--
-- Extra keys are tolerated for forward compatibility (e.g. when we add price ceiling
-- or "always show me" defaults later).

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS explore_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.explore_preferences IS
    'First-visit explore onboarding choices (state, mediaType). Used to pre-filter /explore for returning users.';

NOTIFY pgrst, 'reload schema';
