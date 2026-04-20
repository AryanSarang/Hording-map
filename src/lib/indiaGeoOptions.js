import { State, City } from 'country-state-city';

let cachedStateNames;

function normKey(s) {
    return String(s ?? '')
        .trim()
        .toLowerCase();
}

/** Official India state/UT names for explore filters (catalog may only load one state on first paint). */
export function getIndianStateNames() {
    if (!cachedStateNames) {
        cachedStateNames = State.getStatesOfCountry('IN')
            .map((s) => s.name.trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }
    return cachedStateNames;
}

/** Union of standard India names + any spellings present in loaded rows (e.g. MAHARASHTRA). */
export function mergeStateOptionsForExplore(catalogStateLabels) {
    const seen = new Set(getIndianStateNames().map((s) => s.toLowerCase()));
    const out = [...getIndianStateNames()];
    for (const raw of catalogStateLabels || []) {
        if (raw == null || raw === '') continue;
        const label = String(raw).trim();
        const k = label.toLowerCase();
        if (!seen.has(k)) {
            seen.add(k);
            out.push(label);
        }
    }
    return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

const stateRowByLower = new Map();

/** Catalog / UI spellings → CSC `State` row (by official name key). */
const STATE_LABEL_ALIASES = new Map([
    ['nct of delhi', 'Delhi'],
    ['national capital territory of delhi', 'Delhi'],
    ['national capital territory', 'Delhi'],
    ['orissa', 'Odisha'],
    ['pondicherry', 'Puducherry'],
    ['pondichéry', 'Puducherry'],
]);

function ensureStateRowIndex() {
    if (stateRowByLower.size > 0) return;
    for (const s of State.getStatesOfCountry('IN')) {
        stateRowByLower.set(s.name.toLowerCase(), s);
    }
}

/** CSC `State` row for a filter or catalog state label, or null if unknown. */
export function resolveIndianStateRow(stateLabel) {
    ensureStateRowIndex();
    const key = normKey(stateLabel);
    if (!key) return null;
    const direct = stateRowByLower.get(key);
    if (direct) return direct;
    const canonName = STATE_LABEL_ALIASES.get(key);
    if (canonName) return stateRowByLower.get(canonName.toLowerCase()) ?? null;
    return null;
}

/** `isoCode` → Set of normalized city names (CSC authority for that state). */
const cityNormSetByIso = new Map();

function ensureCityNormSetsByIso() {
    if (cityNormSetByIso.size > 0) return;
    for (const s of State.getStatesOfCountry('IN')) {
        const set = new Set();
        for (const c of City.getCitiesOfState('IN', s.isoCode)) {
            const n = normKey(c.name);
            if (n) set.add(n);
        }
        cityNormSetByIso.set(s.isoCode, set);
    }
}

/**
 * True iff `cityName` exists in country-state-city for the state identified by `stateLabel`
 * (same module used for explore state → city options).
 */
export function isIndianCityInCscState(stateLabel, cityName) {
    const row = resolveIndianStateRow(stateLabel);
    if (!row) return false;
    const cn = normKey(cityName);
    if (!cn) return false;
    ensureCityNormSetsByIso();
    return cityNormSetByIso.get(row.isoCode)?.has(cn) ?? false;
}

/**
 * Union of authoritative CSC city labels for the given state names (deduped).
 * Unknown state labels are skipped.
 */
export function getAuthoritativeIndianCitiesForStateLabels(stateNames) {
    if (!Array.isArray(stateNames) || stateNames.length === 0) return [];
    ensureCityNormSetsByIso();
    const byNorm = new Map();
    for (const raw of stateNames) {
        const row = resolveIndianStateRow(raw);
        if (!row) continue;
        for (const c of City.getCitiesOfState('IN', row.isoCode)) {
            const label = String(c.name || '').trim();
            if (!label) continue;
            byNorm.set(normKey(label), label);
        }
    }
    return [...byNorm.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * City names for the given Indian state names (draft filter), so users can narrow before Apply.
 * @deprecated Prefer getAuthoritativeIndianCitiesForStateLabels for strict state↔city mapping.
 */
export function getCityNamesForIndianStates(stateNames) {
    return getAuthoritativeIndianCitiesForStateLabels(stateNames);
}
