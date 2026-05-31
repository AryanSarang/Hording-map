/**
 * Shared helpers for the per-media "Pricing Conditions" feature.
 *
 * Data model (DB):
 *   media_pricing_rules rows = flat (rule_name, option_label, multiplier, display_order).
 *   Multiple rows with the same `rule_name` form one condition group with multiple options.
 *
 * Wire format from the API (camelCase, what the FE consumes):
 *   { id, ruleName, optionLabel, multiplier, displayOrder }
 *
 * Grouped shape used by UI + price math (this module produces it):
 *   {
 *     ruleName: string,
 *     options: [{ optionLabel, multiplier, displayOrder }],
 *     defaultOptionLabel: string,   // first option by displayOrder
 *   }
 *
 * Plan-item selection shape (persisted on plan_items.pricingSelections):
 *   { [ruleName]: { optionLabel, multiplier } }
 *
 * We snapshot the multiplier alongside the picked label so a plan's price stays stable
 * even if the vendor later edits a rule. At display time we still try a live lookup so
 * the user sees current pricing if the rule still exists; we fall back to the snapshot
 * otherwise. This matches how invoices and quotes behave in most commerce stacks.
 */

function safeNumber(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}

/** Group a flat list of rule rows by `ruleName`. Preserves option order via `displayOrder`. */
export function groupPricingRules(flatRules) {
    if (!Array.isArray(flatRules) || flatRules.length === 0) return [];
    const byName = new Map();
    for (const r of flatRules) {
        if (!r) continue;
        const ruleName = String(r.ruleName ?? r.rule_name ?? '').trim();
        const optionLabel = String(r.optionLabel ?? r.option_label ?? '').trim();
        const multiplier = safeNumber(r.multiplier);
        if (!ruleName || !optionLabel || multiplier == null || multiplier <= 0) continue;
        const displayOrder = Number.isFinite(Number(r.displayOrder ?? r.display_order))
            ? Number(r.displayOrder ?? r.display_order)
            : 0;
        if (!byName.has(ruleName)) byName.set(ruleName, []);
        byName.get(ruleName).push({ optionLabel, multiplier, displayOrder });
    }
    const groups = [];
    for (const [ruleName, opts] of byName.entries()) {
        opts.sort((a, b) => a.displayOrder - b.displayOrder || a.optionLabel.localeCompare(b.optionLabel));
        // Deduplicate by optionLabel (latest wins) — vendors occasionally produce dupes via CSV.
        const seen = new Map();
        for (const o of opts) seen.set(o.optionLabel, o);
        const dedup = Array.from(seen.values());
        groups.push({
            ruleName,
            options: dedup,
            defaultOptionLabel: dedup[0]?.optionLabel || '',
        });
    }
    groups.sort((a, b) => a.ruleName.localeCompare(b.ruleName));
    return groups;
}

/**
 * Given a list of grouped rules + a (possibly partial) selection map, return a fully
 * populated map where every condition has a chosen option. Missing/invalid picks fall
 * back to the rule's default (first option).
 */
export function withDefaultsForGroups(groupedRules, selectionMap = {}) {
    const out = {};
    if (!Array.isArray(groupedRules)) return out;
    for (const g of groupedRules) {
        const picked = selectionMap?.[g.ruleName];
        let chosen = null;
        if (picked) {
            const pickedLabel = typeof picked === 'string' ? picked : picked.optionLabel;
            chosen = g.options.find((o) => o.optionLabel === pickedLabel) || null;
        }
        if (!chosen) chosen = g.options[0] || null;
        if (chosen) {
            out[g.ruleName] = { optionLabel: chosen.optionLabel, multiplier: chosen.multiplier };
        }
    }
    return out;
}

/**
 * Resolve a stored selection map against live grouped rules. For each `(ruleName,
 * optionLabel)` we look up the live multiplier; if the rule/option has been
 * removed/renamed, we fall back to the snapshot multiplier the plan stored. Returns the
 * concrete numeric product so callers can multiply against a base rate.
 */
export function multiplierForSelection(groupedRules, selectionMap) {
    if (!selectionMap || typeof selectionMap !== 'object') return 1;
    const byName = new Map((groupedRules || []).map((g) => [g.ruleName, g]));
    let product = 1;
    for (const [ruleName, picked] of Object.entries(selectionMap)) {
        if (!picked) continue;
        const pickedLabel = typeof picked === 'string' ? picked : picked.optionLabel;
        const snapshot = safeNumber(typeof picked === 'string' ? null : picked.multiplier);
        const group = byName.get(ruleName);
        const liveOption = group?.options.find((o) => o.optionLabel === pickedLabel);
        const m = liveOption?.multiplier ?? snapshot;
        if (m != null && m > 0) product *= m;
    }
    return product;
}

/**
 * Normalize a user-supplied selection map into the canonical shape we persist on plan
 * items. Drops invalid entries (unknown rules, missing multiplier) when `groupedRules`
 * is supplied; without it, we trust the caller and just coerce types.
 */
export function normalizePricingSelections(input, groupedRules = null) {
    if (!input || typeof input !== 'object') return {};
    const out = {};
    const byName = groupedRules ? new Map(groupedRules.map((g) => [g.ruleName, g])) : null;
    for (const [rawName, raw] of Object.entries(input)) {
        const ruleName = String(rawName || '').trim();
        if (!ruleName) continue;
        const optionLabel = String(raw?.optionLabel ?? raw ?? '').trim();
        if (!optionLabel) continue;
        let multiplier = safeNumber(typeof raw === 'object' ? raw?.multiplier : null);
        if (byName) {
            const group = byName.get(ruleName);
            const liveOption = group?.options.find((o) => o.optionLabel === optionLabel);
            if (!liveOption) continue; // unknown selection — drop
            if (multiplier == null || multiplier <= 0) multiplier = liveOption.multiplier;
        }
        if (multiplier == null || multiplier <= 0) continue;
        out[ruleName] = { optionLabel, multiplier };
    }
    return out;
}

/** Convert grouped rules back into a flat list (handy for snapshotting on plan items). */
export function flattenPricingRules(groupedRules) {
    if (!Array.isArray(groupedRules)) return [];
    const out = [];
    let i = 0;
    for (const g of groupedRules) {
        for (const o of g.options) {
            out.push({
                ruleName: g.ruleName,
                optionLabel: o.optionLabel,
                multiplier: o.multiplier,
                displayOrder: i++,
            });
        }
    }
    return out;
}
