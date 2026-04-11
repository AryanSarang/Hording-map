/**
 * Explore filter panel: stable compare + variable credit cost for apply.
 */

export function normalizeExploreFiltersForCompare(f) {
    return JSON.stringify({
        minPrice: f.minPrice,
        maxPrice: f.maxPrice,
        states: [...(f.states || [])].map(String).sort(),
        cities: [...(f.cities || [])].map(String).sort(),
        vendorIds: [...(f.vendorIds || [])].map(String).sort(),
        mediaTypes: [...(f.mediaTypes || [])].map(String).sort(),
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

    const s = f.states?.length ?? 0;
    const c = f.cities?.length ?? 0;
    const v = f.vendorIds?.length ?? 0;
    if (s > 1) add += 2 * (s - 1);
    if (c > 1) add += 2 * (c - 1);
    if (v > 1) add += 2 * (v - 1);

    const allTypes = [...new Set(hoardings.map((h) => h.mediaType).filter(Boolean))];
    const mt = f.mediaTypes?.length ?? 0;
    if (allTypes.length > 1 && mt > 0 && mt < allTypes.length) add += 2;

    const rates = hoardings.map((h) => h.rate).filter((r) => r > 0);
    const maxRate = rates.length > 0 ? Math.max(...rates) : 100000;
    const cap = Number.isFinite(dataMaxPrice) ? dataMaxPrice : maxRate;
    if (f.minPrice > 0 || f.maxPrice < cap) add += 2;

    return base + add;
}
