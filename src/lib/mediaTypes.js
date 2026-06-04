/** Canonical media_type values — must match Supabase `media.media_type_check`. */
export const MEDIA_TYPES = [
    'Bus Shelter',
    'Digital Screens',
    'Cinema Screen',
    'Cafe Screen',
    'Residential',
    'Corporate Screen',
    'Corporate Coffee Machines',
    'Croma Stores',
    'ATM',
    'other',
];

/** @deprecated Import CSVs may still use the old label. */
export const MEDIA_TYPE_ALIASES = {
    Corporate: 'Corporate Screen',
};

/** Normalize legacy labels to canonical values. */
export function normalizeMediaType(raw) {
    const t = String(raw ?? '').trim();
    if (!t) return t;
    return MEDIA_TYPE_ALIASES[t] ?? t;
}

export function isValidMediaType(raw) {
    const normalized = normalizeMediaType(raw);
    return MEDIA_TYPES.includes(normalized);
}
