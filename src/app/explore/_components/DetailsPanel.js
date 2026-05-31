// app/explore/_components/DetailsPanel.js
"use client";
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MapPin, X, ListPlus, ListMinus, PlusCircle } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';
import {
    multiplierForSelection,
    normalizePricingSelections,
    withDefaultsForGroups,
} from '../../../lib/pricingConditions';

/**
 * `DetailsPanel` is wrapped in `memo` at the bottom of the file. Skipping
 * re-renders when sibling state (e.g. filter draft inputs) changes saves us
 * re-rendering a virtualized list + heavy detail content for every keystroke
 * in the filter rail. Setter props are stable refs from `useState`, so memo's
 * shallow-prop comparison reliably wins.
 */
function DetailsPanel({
    hoardings,
    selectedId,
    onSelect,
    onAddToPlan,
    onRemoveMediaFromPlan,
    onRemoveVariantFromPlan,
    currentPlan,
    isAuthenticated,
    planMutatingMediaIds,
    exploreMetafieldFilters = [],
}) {
    const selectedHoarding = selectedId
        ? hoardings.find((h) => String(h.id) === String(selectedId))
        : null;

    const normalizedPlanItems = Array.isArray(currentPlan?.items)
        ? currentPlan.items.map((it) => typeof it === 'string' ? { mediaId: it, variantIds: [] } : it)
        : [];
    const currentPlanItem = selectedHoarding
        ? normalizedPlanItems.find((it) => String(it.mediaId) === String(selectedHoarding.id))
        : null;
    const isAdded = !!currentPlanItem;
    const planVariantIdSet = currentPlanItem
        ? new Set((currentPlanItem.variantIds || []).map(String).filter(Boolean))
        : new Set();
    const variants = selectedHoarding?.variants || [];
    const variantIdsKey = useMemo(() => variants.map((v) => v.id).join(','), [variants]);

    const [checkedVariantIds, setCheckedVariantIds] = useState(() => new Set());

    useEffect(() => {
        setCheckedVariantIds(new Set(variants.map((v) => String(v.id))));
    }, [selectedHoarding?.id, variantIdsKey]);

    /**
     * Pricing conditions are a per-media set of dropdowns (e.g. "Duration" → 1w/2w/4w)
     * whose chosen multipliers compound into the displayed rate. Each media carries
     * its own set on `selectedHoarding.pricingRules` (grouped + ordered). We store the
     * picks as `{ [ruleName]: { optionLabel, multiplier } }` so we can later persist
     * exactly that on the plan item.
     *
     * Default behaviour:
     *   - First time the panel sees a media → seed with the first option of every
     *     condition (industry convention: vendors list the "no surcharge" option first).
     *   - If the user already added this media to the current plan and saved picks,
     *     seed with those instead so they don't have to redo the dropdowns.
     */
    const pricingRules = useMemo(
        () => (Array.isArray(selectedHoarding?.pricingRules) ? selectedHoarding.pricingRules : []),
        [selectedHoarding?.pricingRules]
    );
    const planSelections = currentPlanItem?.pricingSelections;
    const [pricingSelections, setPricingSelections] = useState({});
    useEffect(() => {
        setPricingSelections(withDefaultsForGroups(pricingRules, planSelections || {}));
        // We intentionally re-seed whenever the selected media or its rule shape
        // changes — switching media in the list should not leak last media's picks.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedHoarding?.id, pricingRules.length]);

    const pricingMultiplier = useMemo(
        () => multiplierForSelection(pricingRules, pricingSelections),
        [pricingRules, pricingSelections]
    );

    function updatePricingSelection(ruleName, optionLabel) {
        const group = pricingRules.find((g) => g.ruleName === ruleName);
        const opt = group?.options.find((o) => o.optionLabel === optionLabel);
        if (!opt) return;
        setPricingSelections((prev) => ({
            ...prev,
            [ruleName]: { optionLabel: opt.optionLabel, multiplier: opt.multiplier },
        }));
    }

    const isMutating = selectedHoarding ? planMutatingMediaIds?.has(selectedHoarding.id) : false;

    const checkedVariants = useMemo(
        () => variants.filter((v) => checkedVariantIds.has(String(v.id))),
        [variants, checkedVariantIds]
    );

    const displayVariant = checkedVariants[0] || variants[0] || null;

    /**
     * Sum the rates of every variant the user has currently checked. This represents the
     * combined cost of what they would add to the plan right now — more useful for cinema/cafe
     * media (where a media has many bookable screens) than a per-variant min/max range.
     * Falls back to the single rate on the media when no variants exist.
     */
    const rateSummary = useMemo(() => {
        const rates = checkedVariants
            .map((v) => Number(v.rate))
            .filter((r) => Number.isFinite(r) && r > 0);
        let base = null;
        if (rates.length === 0) {
            const fallback = Number(selectedHoarding?.rate);
            base = Number.isFinite(fallback) ? fallback : null;
        } else {
            base = rates.reduce((a, b) => a + b, 0);
        }
        if (base == null) return null;
        const product = Number(pricingMultiplier);
        return Number.isFinite(product) && product > 0 ? base * product : base;
    }, [checkedVariants, selectedHoarding?.rate, pricingMultiplier]);

    /** Show the un-adjusted (base) total alongside, so the user can see what the
     *  conditions are doing to the price. Only render when a multiplier ≠ 1 is active. */
    const baseRateSummary = useMemo(() => {
        const rates = checkedVariants
            .map((v) => Number(v.rate))
            .filter((r) => Number.isFinite(r) && r > 0);
        if (rates.length === 0) {
            const fallback = Number(selectedHoarding?.rate);
            return Number.isFinite(fallback) ? fallback : null;
        }
        return rates.reduce((a, b) => a + b, 0);
    }, [checkedVariants, selectedHoarding?.rate]);

    /**
     * Vendors price Cinema Screen inventory weekly and Cafe Screens (+ everything else) monthly.
     * The numeric `rate` field semantics don't change — we just relabel based on media type so
     * advertisers understand the billing cadence they're seeing.
     */
    const mediaTypeKey = String(selectedHoarding?.mediaType || '').toLowerCase();
    const isCinema = mediaTypeKey.includes('cinema');
    const rateCadenceLabel = isCinema ? 'Weekly Rate' : 'Monthly Rate';
    const variantSectionLabel = isCinema ? 'Auditorium Selector' : 'Variants';
    const variantAllLabel = isCinema
        ? `All ${variants.length} auditoriums`
        : `All ${variants.length} variants`;
    const variantAddLabel = isCinema
        ? 'Add Selected Auditoriums to Plan'
        : 'Add Selected Media to Plan';

    /**
     * Clean up vendor-supplied variant titles so screen codes like `MH40_Audi1` don't push
     * the price out of the truncated dropdown row. Strips state-code prefixes (`MH40_`,
     * `KA12_`, etc.) and expands abbreviated terms (`Audi1` → `Auditorium 1`,
     * `Screen2` → `Screen 2`). Falls back to a sequential `Auditorium N` / `Variant N`
     * label keyed on the variant's display_order or array index so cinema users always
     * see a human-readable name even when the raw title is unusable.
     */
    const cleanVariantName = (v, idx) => {
        const raw = (v.variant_title
            || [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(' / ')
            || '').trim();
        let cleaned = raw.replace(/^[A-Z]{2,4}\d{0,4}_+/, '');
        cleaned = cleaned.replace(/^Audi(?:torium)?[\s_-]?(\d+)$/i, 'Auditorium $1');
        cleaned = cleaned.replace(/^Screen[\s_-]?(\d+)$/i, 'Screen $1');
        if (!cleaned) {
            const ordinal = (v.display_order ?? idx) + 1;
            cleaned = isCinema ? `Auditorium ${ordinal}` : `Variant ${ordinal}`;
        }
        return cleaned;
    };

    /**
     * Move price + seating into the sublabel slot so the truncating MultiSelectDropdown
     * row always shows them on a dedicated line. Earlier we packed everything into the
     * main label (`Screen 1 - ₹1500`) and the price got clipped whenever the vendor
     * title was long.
     */
    const variantOptionSublabel = (v) => {
        const rateNum = Number(v.rate);
        const parts = [];
        if (Number.isFinite(rateNum) && rateNum > 0) parts.push(`₹${rateNum.toLocaleString()}`);
        const seating = v.seating || v.seating_capacity;
        if (seating) parts.push(`Seating ${seating}`);
        return parts.length ? parts.join(' · ') : undefined;
    };

    const fullAddress = [
        selectedHoarding?.address,
        selectedHoarding?.landmark,
        selectedHoarding?.zone,
    ]
        .map((s) => (s == null ? '' : String(s).trim()))
        .filter(Boolean)
        .join(' • ');

    /**
     * Per-media-type whitelist of spec rows so each media type only surfaces the fields
     * advertisers actually care about. Media types without an entry here fall back to the
     * full default spec grid (screen size, dimensions, media type, display, cinema format,
     * audience, seating + all enabled metafields).
     *
     * Keys correspond to internal field identifiers:
     *   - `screenSize`, `dimensions`, `mediaType`, `displayFormat` → media table columns
     *   - `cinema_format`, `audience`, `seating` → variant table columns
     *   - `metafield:<metafield_name>` (case-insensitive) → matched against the vendor
     *      metafield's `name`. Use `metafield:*` to include every metafield.
     */
    const SPEC_WHITELIST_BY_MEDIA_TYPE = {
        'Cinema Screen': ['metafield:cinema chain', 'audience', 'cinema_format'],
    };
    const specWhitelist = SPEC_WHITELIST_BY_MEDIA_TYPE[selectedHoarding?.mediaType] || null;
    const matchesMetafield = (mfName, whitelistEntry) =>
        whitelistEntry === 'metafield:*' ||
        whitelistEntry.toLowerCase() === `metafield:${String(mfName || '').toLowerCase()}`;
    const showSpec = (key) => !specWhitelist || specWhitelist.includes(key);
    const showMetafield = (mfName) =>
        !specWhitelist || specWhitelist.some((w) => w.startsWith('metafield:') && matchesMetafield(mfName, w));

    /**
     * Flatten vendor metafield values attached to the selected media into label/value pairs
     * so they render alongside screen size, cinema format, etc. in the Specifications grid.
     */
    const metafieldSpecs = useMemo(() => {
        const mfObj = selectedHoarding?.metafields;
        if (!mfObj || typeof mfObj !== 'object') return [];
        return (exploreMetafieldFilters || [])
            .map((mf) => {
                const val = mfObj[String(mf.id)];
                if (val == null || String(val).trim() === '') return null;
                return { id: mf.id, name: mf.name || `Field ${mf.id}`, value: String(val) };
            })
            .filter(Boolean);
    }, [selectedHoarding?.metafields, exploreMetafieldFilters]);

    /** Whole media is fully in plan: no variant rows, or "all variants" (empty ids), or every variant id listed. */
    const isAllVariantsInPlan =
        !!currentPlanItem &&
        (variants.length === 0 ||
            (planVariantIdSet.size === 0 ||
                variants.every((v) => planVariantIdSet.has(String(v.id)))));

    const listScrollParentRef = useRef(null);
    const listVirtualizer = useVirtualizer({
        count: hoardings.length,
        getScrollElement: () => listScrollParentRef.current,
        estimateSize: () => 76,
        overscan: 12,
    });

    // ... (Formatting Helpers formatMediaType, formatHoardingType, DisplayValue remain the same) ...
    const formatMediaType = (type) => {
        if (!type) return '-';
        if (type === 'digitalScreen') return 'Digital Screen';
        return type.replace(/([A-Z])/g, ' $1').trim();
    };

    const DisplayValue = ({ label, value, suffix = "" }) => {
        if (value === null || value === undefined || value === "") return null;
        return (
            <div className="bg-[#1a1a1a] p-2 rounded border border-gray-800">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-xs font-medium text-gray-200 truncate">
                    {`${value}${suffix}`}
                </p>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white border-l border-r border-gray-800">

            {/* Header */}
            <div className="p-3 border-b border-gray-800 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-20 flex justify-between items-center">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {selectedId ? "Media Details" : "Explore Sites"}
                </h2>
                {selectedId && (
                    <button onClick={() => onSelect(null)} className="text-[10px] text-green-500 hover:text-green-400 font-medium transition-colors uppercase tracking-wide inline-flex items-center gap-1">
                        <X size={12} />
                        Close
                    </button>
                )}
            </div>

            <div className={`flex-1 min-h-0 flex flex-col ${selectedHoarding ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                <style jsx>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>

                {selectedHoarding ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5 p-4 no-scrollbar overflow-y-auto flex-1">
                        {/* ... (Hero Section, Pills, Specs, Visibility, Playback remain the same) ... */}

                        {/* HERO SECTION
                            Field order (per UX spec): media type → title → city/state → full
                            address → rate. Media type is shown big and bold first because the
                            advertiser typically navigated here looking for a particular format. */}
                        <div>
                            {selectedHoarding.imageUrls && selectedHoarding.imageUrls.length > 0 && (
                                <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-3 relative border border-gray-700">
                                    <img
                                        src={selectedHoarding.imageUrls[0]}
                                        alt="Hoarding View"
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono text-white border border-white/10">#{selectedHoarding.id}</div>
                                </div>
                            )}
                            {selectedHoarding.mediaType && (
                                <p className="text-base font-bold text-white leading-tight mb-1">
                                    {formatMediaType(selectedHoarding.mediaType)}
                                </p>
                            )}
                            <h1 className="text-sm font-medium text-white leading-snug mb-1">
                                {selectedHoarding.displayTitle || selectedHoarding.title || selectedHoarding.address || selectedHoarding.landmark || selectedHoarding.zone || "Site #" + selectedHoarding.id}
                            </h1>
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] mb-2">
                                <MapPin size={12} />
                                <span>{selectedHoarding.city}, {selectedHoarding.state}</span>
                            </div>
                            {fullAddress && (
                                <p className="text-[11px] text-gray-300 leading-snug mb-3">
                                    {fullAddress}
                                </p>
                            )}
                            <div className="flex items-center justify-between p-2 bg-green-500/5 border border-green-500/20 rounded">
                                <span className="text-[10px] text-green-300/70 uppercase">{rateCadenceLabel}</span>
                                <div className="flex items-baseline gap-2">
                                    {pricingMultiplier !== 1 && baseRateSummary != null && (
                                        <span className="text-[10px] text-gray-500 line-through">
                                            ₹{Number(baseRateSummary).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                    )}
                                    <span className="text-sm font-medium text-green-400">
                                        {rateSummary != null
                                            ? `₹${Number(rateSummary).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                            : `₹${(displayVariant?.rate ?? selectedHoarding.rate)?.toLocaleString?.() ?? '—'}`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {variants.length > 1 && (
                            <section>
                                <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
                                    {variantSectionLabel}
                                </h3>
                                <MultiSelectDropdown
                                    values={Array.from(checkedVariantIds)}
                                    onChange={(next) => setCheckedVariantIds(new Set(next.map(String)))}
                                    options={variants.map((v, idx) => ({
                                        value: String(v.id),
                                        label: cleanVariantName(v, idx),
                                        sublabel: variantOptionSublabel(v),
                                    }))}
                                    allLabel={variantAllLabel}
                                    placeholder={isCinema ? 'No auditoriums selected' : 'No variants selected'}
                                    allowSearch={variants.length > 8}
                                    searchPlaceholder={isCinema ? 'Search auditoriums...' : 'Search variants...'}
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5">
                                    {checkedVariantIds.size} of {variants.length} selected
                                </p>
                            </section>
                        )}

                        {/* Pricing conditions — one dropdown per rule. Picks recompute the
                            displayed rate immediately and ride along to the plan on save. */}
                        {pricingRules.length > 0 && (
                            <section>
                                <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
                                    Pricing Conditions
                                </h3>
                                <div className="space-y-2">
                                    {pricingRules.map((g) => {
                                        const current = pricingSelections[g.ruleName]?.optionLabel || g.defaultOptionLabel;
                                        return (
                                            <div
                                                key={g.ruleName}
                                                className="bg-[#1a1a1a] border border-gray-800 rounded px-2 py-1.5"
                                            >
                                                <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                                                    {g.ruleName}
                                                </label>
                                                <select
                                                    value={current}
                                                    onChange={(e) =>
                                                        updatePricingSelection(g.ruleName, e.target.value)
                                                    }
                                                    className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-500"
                                                >
                                                    {g.options.map((o) => (
                                                        <option key={o.optionLabel} value={o.optionLabel}>
                                                            {o.optionLabel}
                                                            {o.multiplier !== 1
                                                                ? ` (×${o.multiplier})`
                                                                : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <hr className="border-gray-800" />

                        {/* SPECS */}
                        {(
                            selectedHoarding.screenSize ||
                            (selectedHoarding.width && selectedHoarding.height) ||
                            selectedHoarding.mediaType ||
                            selectedHoarding.displayFormat ||
                            displayVariant?.size ||
                            displayVariant?.cinema_format ||
                            metafieldSpecs.length > 0
                        ) && (
                                <section>
                                    <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Specifications</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {showSpec('screenSize') && (
                                            <DisplayValue label="Screen Size" value={displayVariant?.size || selectedHoarding.screenSize} />
                                        )}
                                        {showSpec('dimensions') && selectedHoarding.width && selectedHoarding.height && (
                                            <DisplayValue
                                                label="Dimensions"
                                                value={`${selectedHoarding.width}x${selectedHoarding.height}`}
                                                suffix=" ft"
                                            />
                                        )}
                                        {showSpec('mediaType') && (
                                            <DisplayValue label="Media Type" value={formatMediaType(selectedHoarding.mediaType)} />
                                        )}
                                        {showSpec('displayFormat') && (
                                            <DisplayValue label="Display" value={selectedHoarding.displayFormat} />
                                        )}
                                        {showSpec('cinema_format') && (
                                            <DisplayValue label="Cinema Format" value={displayVariant?.cinema_format} />
                                        )}
                                        {showSpec('audience') && (
                                            <DisplayValue label="Audience" value={displayVariant?.audience_category} />
                                        )}
                                        {showSpec('seating') && (
                                            <DisplayValue label="Seating" value={displayVariant?.seating} />
                                        )}
                                        {metafieldSpecs
                                            .filter((mf) => showMetafield(mf.name))
                                            .map((mf) => (
                                                <DisplayValue key={mf.id} label={mf.name} value={mf.value} />
                                            ))}
                                    </div>
                                </section>
                            )}

                        {/* VISIBILITY */}
                        {(selectedHoarding.trafficType || selectedHoarding.landmark || selectedHoarding.roadName) && (
                            <section>
                                <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Visibility</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <DisplayValue label="Traffic" value={selectedHoarding.trafficType} />
                                    <div className="col-span-2">
                                        <DisplayValue label="Landmark" value={selectedHoarding.landmark || selectedHoarding.roadName} />
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* CTA: ADD / REMOVE PLAN — "all variants" only when there is more than one */}
                        <div className="sticky bottom-0 pt-4 bg-[#0a0a0a] border-t border-gray-800 mt-2">
                            <div className="grid grid-cols-1 gap-2">
                                {variants.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            isAllVariantsInPlan
                                                ? onRemoveMediaFromPlan?.(selectedHoarding.id)
                                                : onAddToPlan(
                                                    selectedHoarding.id,
                                                    Array.from(checkedVariantIds),
                                                    normalizePricingSelections(pricingSelections, pricingRules)
                                                )
                                        }
                                        disabled={
                                            !isAuthenticated ||
                                            !currentPlan ||
                                            isMutating ||
                                            checkedVariantIds.size === 0
                                        }
                                        className={`w-full font-bold py-2.5 rounded text-[10px] uppercase tracking-widest shadow-lg transition-all inline-flex items-center justify-center gap-2 border disabled:opacity-60 disabled:cursor-not-allowed ${isAllVariantsInPlan
                                            ? 'bg-red-950/50 text-red-400 border-red-500/45 hover:bg-red-950/70 hover:border-red-400/60'
                                            : isAdded
                                                ? 'bg-green-600 text-black hover:bg-green-500 border-transparent'
                                                : (!isAuthenticated || !currentPlan
                                                    ? 'bg-gray-700 text-gray-300 cursor-not-allowed border-transparent'
                                                    : 'bg-white hover:bg-gray-200 text-black border-transparent')
                                            }`}
                                    >
                                        {isAllVariantsInPlan ? <ListMinus size={14} /> : <ListPlus size={14} />}
                                        {isMutating
                                            ? 'Saving...'
                                            : isAllVariantsInPlan
                                                ? 'Remove All from Plan'
                                                : isAdded
                                                    ? `Update Plan (selected ${isCinema ? 'auditoriums' : 'variants'})`
                                                    : !isAuthenticated
                                                        ? 'Sign in to Add'
                                                        : !currentPlan
                                                            ? 'Create a Plan'
                                                            : variantAddLabel}
                                    </button>
                                )}
                                {variants.length <= 1 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            isAdded
                                                ? onRemoveMediaFromPlan?.(selectedHoarding.id)
                                                : onAddToPlan(
                                                    selectedHoarding.id,
                                                    displayVariant?.id ? [displayVariant.id] : [],
                                                    normalizePricingSelections(pricingSelections, pricingRules)
                                                )
                                        }
                                        disabled={!isAuthenticated || !currentPlan || isMutating}
                                        className={`w-full font-bold py-2.5 rounded text-[10px] uppercase tracking-widest shadow-lg transition-all inline-flex items-center justify-center gap-2 border disabled:opacity-60 disabled:cursor-not-allowed ${isAdded
                                            ? 'bg-red-950/50 text-red-400 border-red-500/45 hover:bg-red-950/70 hover:border-red-400/60'
                                            : 'bg-white hover:bg-gray-200 text-black border-transparent'
                                            }`}
                                    >
                                        {isAdded ? <ListMinus size={14} /> : <PlusCircle size={14} />}
                                        {isMutating
                                            ? 'Saving...'
                                            : isAdded
                                                ? 'Remove from Plan'
                                                : !isAuthenticated
                                                    ? 'Sign in to Add'
                                                    : !currentPlan
                                                        ? 'Create a Plan'
                                                        : 'Add Media to Plan'}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div
                        ref={listScrollParentRef}
                        className="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 pt-3"
                    >
                        <div className="flex justify-between items-baseline mb-2 px-1 shrink-0">
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{hoardings.length} Sites Available</p>
                        </div>
                        <div
                            className="relative w-full"
                            style={{ height: `${listVirtualizer.getTotalSize()}px` }}
                        >
                            {listVirtualizer.getVirtualItems().map((vi) => {
                                const item = hoardings[vi.index];
                                return (
                                    <div
                                        key={item.id}
                                        data-index={vi.index}
                                        ref={listVirtualizer.measureElement}
                                        className="absolute top-0 left-0 w-full px-1 pb-2"
                                        style={{ transform: `translateY(${vi.start}px)` }}
                                    >
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => onSelect(item.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    onSelect(item.id);
                                                }
                                            }}
                                            className="group cursor-pointer bg-[#111] border border-gray-800 hover:border-green-500/50 hover:bg-[#151515] p-2 rounded-lg transition-all duration-200 flex gap-3"
                                        >
                                            <div className="w-10 h-10 bg-gray-800 rounded flex-shrink-0 overflow-hidden border border-gray-700 relative">
                                                {item.imageUrls?.[0] ? (
                                                    <img
                                                        src={item.imageUrls[0]}
                                                        alt=""
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-600">NO IMG</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h3 className="text-xs font-medium text-gray-200 truncate group-hover:text-green-400 transition-colors">
                                                    {item.displayTitle || item.title || item.address || item.landmark || item.zone || `Site #${item.id}`}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-[10px] text-gray-500 truncate max-w-[100px]">
                                                        {item.city} • {item.screenSize}
                                                    </p>
                                                    <p className="text-[10px] font-medium text-green-500 ml-auto">₹{item.rate?.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(DetailsPanel);