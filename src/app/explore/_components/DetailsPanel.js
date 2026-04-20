// app/explore/_components/DetailsPanel.js
"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MapPin, X, ListPlus, ListMinus, PlusCircle } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';

export default function DetailsPanel({
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

    const isMutating = selectedHoarding ? planMutatingMediaIds?.has(selectedHoarding.id) : false;

    const checkedVariants = useMemo(
        () => variants.filter((v) => checkedVariantIds.has(String(v.id))),
        [variants, checkedVariantIds]
    );

    const displayVariant = checkedVariants[0] || variants[0] || null;

    const rateSummary = useMemo(() => {
        const rates = checkedVariants.map((v) => v.rate).filter((r) => r != null && Number(r) > 0);
        if (rates.length === 0) return selectedHoarding?.rate ?? null;
        const nums = rates.map(Number);
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        if (min === max) return min;
        return { min, max };
    }, [checkedVariants, selectedHoarding?.rate]);

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
                    {selectedId ? "Property Details" : "Explore Sites"}
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

                        {/* HERO SECTION */}
                        <div>
                            {selectedHoarding.imageUrls && selectedHoarding.imageUrls.length > 0 && (
                                <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-3 relative border border-gray-700">
                                    <img src={selectedHoarding.imageUrls[0]} alt="Hoarding View" className="w-full h-full object-cover" />
                                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono text-white border border-white/10">#{selectedHoarding.id}</div>
                                </div>
                            )}
                            <h1 className="text-sm font-medium text-white leading-snug mb-1">{selectedHoarding.displayTitle || selectedHoarding.title || selectedHoarding.address || selectedHoarding.landmark || selectedHoarding.zone || "Site #" + selectedHoarding.id}</h1>
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] mb-3">
                                <MapPin size={12} />
                                <span>{selectedHoarding.city}, {selectedHoarding.state}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-green-500/5 border border-green-500/20 rounded">
                                <span className="text-[10px] text-green-300/70 uppercase">Monthly Rate</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-medium text-green-400">
                                        {rateSummary && typeof rateSummary === 'object'
                                            ? `₹${rateSummary.min.toLocaleString()} – ₹${rateSummary.max.toLocaleString()}`
                                            : `₹${(rateSummary ?? displayVariant?.rate ?? selectedHoarding.rate)?.toLocaleString?.() ?? '—'}`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {variants.length > 1 && (
                            <section>
                                <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
                                    Variants (add to plan)
                                </h3>
                                <MultiSelectDropdown
                                    values={Array.from(checkedVariantIds)}
                                    onChange={(next) => setCheckedVariantIds(new Set(next.map(String)))}
                                    options={variants.map((v) => ({
                                        value: String(v.id),
                                        label:
                                            v.variant_title ||
                                            [v.option1_value, v.option2_value, v.option3_value]
                                                .filter(Boolean)
                                                .join(' / ') ||
                                            `Variant ${v.id}`,
                                        sublabel:
                                            v.rate != null
                                                ? `₹${Number(v.rate).toLocaleString()}`
                                                : undefined,
                                    }))}
                                    allLabel={`All ${variants.length} variants`}
                                    placeholder="No variants selected"
                                    allowSearch={variants.length > 8}
                                    searchPlaceholder="Search variants..."
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5">
                                    {checkedVariantIds.size} of {variants.length} selected
                                </p>
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
                                        <DisplayValue label="Screen Size" value={displayVariant?.size || selectedHoarding.screenSize} />
                                        {selectedHoarding.width && selectedHoarding.height && (
                                            <DisplayValue
                                                label="Dimensions"
                                                value={`${selectedHoarding.width}x${selectedHoarding.height}`}
                                                suffix=" ft"
                                            />
                                        )}
                                        <DisplayValue label="Media Type" value={formatMediaType(selectedHoarding.mediaType)} />
                                        <DisplayValue label="Display" value={selectedHoarding.displayFormat} />
                                        <DisplayValue label="Cinema Format" value={displayVariant?.cinema_format} />
                                        <DisplayValue label="Audience" value={displayVariant?.audience_category} />
                                        <DisplayValue label="Seating" value={displayVariant?.seating} />
                                        {metafieldSpecs.map((mf) => (
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
                                                    Array.from(checkedVariantIds)
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
                                                    ? 'Update Plan (selected variants)'
                                                    : !isAuthenticated
                                                        ? 'Sign in to Add'
                                                        : !currentPlan
                                                            ? 'Create a Plan'
                                                            : 'Add Selected Variants to Plan'}
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
                                                    displayVariant?.id ? [displayVariant.id] : []
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
                                                        : 'Add to Plan'}
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
                                                    <img src={item.imageUrls[0]} alt="" className="w-full h-full object-cover" />
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