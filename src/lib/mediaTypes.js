/**
 * Canonical media_type whitelist — mirrors the check constraint on `public.media`
 * (see migrations 20260324030000 + 20260420120000).
 *
 * This list is the source of truth for:
 *   - /vendor/media list-page filter pills
 *   - /vendor/media/new + /vendor/media/[id] form dropdowns
 *   - /api/vendors/hordings/import validation
 *   - /explore filter panel (always shows every type, even when the currently loaded
 *     catalog has been narrowed server-side to a subset of them).
 *
 * When adding a new type, also add it to the DB check constraint via a migration.
 */
export const MEDIA_TYPES = Object.freeze([
    'Bus Shelter',
    'Digital Screens',
    'Cinema Screen',
    'Cafe Screen',
    'Residential',
    'Corporate',
    'Corporate Coffee Machines',
    'Croma Stores',
    'ATM',
    'other',
]);
