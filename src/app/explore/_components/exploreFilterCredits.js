/**
 * Explore filter panel: stable compare + variable credit cost for apply.
 */

import { coerceLocationStringList } from '../../../lib/exploreFilterLocation';

function stableMetafieldSelectionsCompare(m) {
    const obj = m && typeof m === 'object' ? m : {};
    return Object.keys(obj)
        .map(String)
        .sort()
        .map((k) => ({
            k,
            v: [...(obj[k] || [])].map(String).sort(),
        }));
}

export function normalizeExploreFiltersForCompare(f) {
    return JSON.stringify({
        minPrice: f.minPrice,
        maxPrice: f.maxPrice,
        states: coerceLocationStringList(f.states).map(String).sort(),
        cities: coerceLocationStringList(f.cities).map(String).sort(),
        mediaTypes: [...(f.mediaTypes || [])].map(String).sort(),
        metafieldSelections: stableMetafieldSelectionsCompare(f.metafieldSelections),
    });
}

/**
 * Base 5 credits + surcharges for multi-select breadth and narrowed dimensions.
 * @param {object} f - draft or applied filters
 * @param {object[]} hoardings - full explore list (for media types + max rate)
 * @param {number} dataMaxPrice - slider ceiling used in UI (initial max)
 */
export function computeExploreFilterCreditCost(f, hoardings, dataMaxPrice) {
    const base = 5;
    let add = 0;

    const s = coerceLocationStringList(f.states).length;
    const c = coerceLocationStringList(f.cities).length;
    if (s > 1) add += 2 * (s - 1);
    if (c > 1) add += 2 * (c - 1);

    const mfs = f.metafieldSelections && typeof f.metafieldSelections === 'object' ? f.metafieldSelections : {};
    for (const vals of Object.values(mfs)) {
        const n = Array.isArray(vals) ? vals.length : 0;
        if (n > 1) add += 2 * (n - 1);
    }

    const allTypes = [...new Set(hoardings.map((h) => h.mediaType).filter(Boolean))];
    const mt = f.mediaTypes?.length ?? 0;
    if (allTypes.length > 1 && mt > 0 && mt < allTypes.length) add += 2;

    const rates = hoardings.map((h) => h.rate).filter((r) => r > 0);
    const maxRate = rates.length > 0 ? Math.max(...rates) : 100000;
    const cap = Number.isFinite(dataMaxPrice) ? dataMaxPrice : maxRate;
    if (f.minPrice > 0 || f.maxPrice < cap) add += 2;

    return base + add;
}
