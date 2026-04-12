import { State, City } from 'country-state-city';

let cachedStateNames;

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

function ensureStateRowIndex() {
    if (stateRowByLower.size > 0) return;
    for (const s of State.getStatesOfCountry('IN')) {
        stateRowByLower.set(s.name.toLowerCase(), s);
    }
}

/**
 * City names for the given Indian state names (draft filter), so users can narrow before Apply.
 * Merged with catalog cities in the UI.
 */
export function getCityNamesForIndianStates(stateNames) {
    if (!Array.isArray(stateNames) || stateNames.length === 0) return [];
    ensureStateRowIndex();
    const cityByLower = new Map();
    for (const raw of stateNames) {
        const row = stateRowByLower.get(String(raw).trim().toLowerCase());
        if (!row) continue;
        for (const c of City.getCitiesOfState('IN', row.isoCode)) {
            const n = (c.name || '').trim();
            if (n) cityByLower.set(n.toLowerCase(), n);
        }
    }
    return [...cityByLower.values()].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
}
