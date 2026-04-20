/**
 * Cascading state → city filter helpers (explore panel).
 */

import {
    getAuthoritativeIndianCitiesForStateLabels,
    isIndianCityInCscState,
} from './indiaGeoOptions';

export function normLoc(s) {
    return String(s ?? '')
        .trim()
        .toLowerCase();
}

export function eqState(a, b) {
    return normLoc(a) === normLoc(b);
}

/**
 * Normalizes filter UI / API values: arrays of strings, or a single non-empty string, → string[].
 * Prevents `states` accidentally being `"Delhi"` (non-array) from being treated as "no states",
 * which would list every city in the loaded catalog (e.g. Mumbai on a Maharashtra SSR slice).
 */
export function coerceLocationStringList(val) {
    if (val == null) return [];
    if (Array.isArray(val)) {
        return val.map((x) => String(x ?? '').trim()).filter(Boolean);
    }
    if (typeof val === 'string') {
        const t = val.trim();
        return t ? [t] : [];
    }
    return [];
}

/** True if hoarding.state matches any selected state label (trimmed, case-insensitive). */
export function hoardingMatchesStateFilter(selectedStates, hoardingState) {
    const list = sanitizeStateNameList(selectedStates);
    if (list.length === 0) return true;
    return list.some((s) => eqState(s, hoardingState));
}

function sanitizeCityNameList(cityNames) {
    return coerceLocationStringList(cityNames);
}

/** True if hoarding.city matches any selected city label (trimmed, case-insensitive). */
export function hoardingMatchesCityFilter(selectedCities, hoardingCity) {
    const list = sanitizeCityNameList(selectedCities);
    if (list.length === 0) return true;
    const hc = normLoc(hoardingCity);
    if (!hc) return false;
    return list.some((c) => normLoc(c) === hc);
}

/** Distinct cities from loaded catalog rows for one state label. */
export function catalogCitiesForState(hoardings, stateName) {
    const out = new Map();
    for (const h of hoardings || []) {
        if (!eqState(h.state, stateName)) continue;
        const c = h.city?.trim();
        if (c) out.set(normLoc(c), c);
    }
    return [...out.values()];
}

function sanitizeStateNameList(stateNames) {
    return coerceLocationStringList(stateNames);
}

/**
 * Cities for selected state(s):
 * - For ≤ `maxSyntheticStates`: full CSC union for those states, plus catalog spellings that pass
 *   `isIndianCityInCscState` (drops wrong state/city rows in DB).
 * - For more states: only catalog cities that pass CSC for their row’s state label (no full CSC union).
 * @param _legacyGetCitiesUnused kept for call-site compatibility; ignored.
 */
export function allCitiesForStates(
    hoardings,
    stateNames,
    _legacyGetCitiesUnused,
    maxSyntheticStates = 6
) {
    const names = sanitizeStateNameList(stateNames);
    const m = new Map();
    if (!names.length) return [];

    const useFullCscUnion = names.length <= maxSyntheticStates;

    if (useFullCscUnion) {
        for (const c of getAuthoritativeIndianCitiesForStateLabels(names)) {
            const t = String(c).trim();
            if (t) m.set(normLoc(t), t);
        }
    }

    for (const st of names) {
        for (const c of catalogCitiesForState(hoardings, st)) {
            const t = String(c ?? '').trim();
            if (!t) continue;
            if (!isIndianCityInCscState(st, t)) continue;
            m.set(normLoc(t), t);
        }
    }

    return [...m.values()].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
}

/**
 * Cities the user may pick given current state selection. Cascading contract:
 * - No states selected → empty (city filter is disabled/hidden upstream). This prevents cities
 *   from a cached catalog slice (e.g. Maharashtra SSR preload) from leaking into the dropdown
 *   after the user deselects that state.
 * - With states → strict CSC union + catalog cities validated against CSC.
 */
export function allowedCityOptionsMap(hoardings, stateNames, getCityNamesForIndianStates, maxSyntheticStates = 6) {
    const m = new Map();
    const names = sanitizeStateNameList(stateNames);
    if (!names.length) return m;
    for (const c of allCitiesForStates(hoardings, names, getCityNamesForIndianStates, maxSyntheticStates)) {
        m.set(normLoc(c), c);
    }
    return m;
}

export function pruneCitiesToMap(selectedCities, allowedMap) {
    return (selectedCities || []).filter((c) => allowedMap.has(normLoc(c)));
}

/**
 * State multiselect onChange: prune invalid cities, auto-add all cities for newly selected states.
 * Clearing all states clears city selection (no location restriction).
 */
export function deriveStateChangeCities({
    hoardings,
    prevStates,
    nextStates,
    prevCities,
    getCityNamesForIndianStates,
}) {
    const prev = sanitizeStateNameList(prevStates);
    const next = sanitizeStateNameList(nextStates);

    if (next.length === 0) {
        return { cities: [] };
    }

    const allowed = allowedCityOptionsMap(hoardings, next, getCityNamesForIndianStates, 6);
    let cities = pruneCitiesToMap(prevCities, allowed);

    const added = next.filter((s) => !prev.some((p) => eqState(p, s)));
    const nextCitySet = new Map();
    for (const c of cities) nextCitySet.set(normLoc(c), String(c).trim());

    for (const st of added) {
        for (const c of allCitiesForStates(hoardings, [st], getCityNamesForIndianStates, 6)) {
            const t = String(c).trim();
            if (t && allowed.has(normLoc(t))) nextCitySet.set(normLoc(t), t);
        }
    }

    return {
        cities: [...nextCitySet.values()].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        ),
    };
}
