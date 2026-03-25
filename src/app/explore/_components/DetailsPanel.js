// app/explore/_components/DetailsPanel.js
"use client";
import { useEffect, useMemo, useState } from 'react';
import { MapPin, X, ListPlus, PlusCircle } from 'lucide-react';

export default function DetailsPanel({ hoardings, selectedId, onSelect, onAddToPlan, currentPlan, isAuthenticated, planMutatingMediaIds }) {
    const selectedHoarding = selectedId
        ? hoardings.find(h => h.id === selectedId)
        : null;

    const normalizedPlanItems = Array.isArray(currentPlan?.items)
        ? currentPlan.items.map((it) => typeof it === 'string' ? { mediaId: it, variantIds: [] } : it)
        : [];
    const currentPlanItem = selectedHoarding
        ? normalizedPlanItems.find((it) => it.mediaId === selectedHoarding.id)
        : null;
    const isAdded = !!currentPlanItem;
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const variants = selectedHoarding?.variants || [];

    useEffect(() => {
        setSelectedVariantId(variants[0]?.id || null);
    }, [selectedHoarding?.id]);

    const isMutating = selectedHoarding ? planMutatingMediaIds?.has(selectedHoarding.id) : false;


    const selectedVariant = useMemo(
        () => variants.find((v) => v.id === selectedVariantId) || variants[0] || null,
        [variants, selectedVariantId]
    );

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

            <div className="p-4 space-y-5 overflow-y-auto no-scrollbar flex-1">
                <style jsx>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>

                {selectedHoarding ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                        {/* ... (Hero Section, Pills, Specs, Visibility, Playback remain the same) ... */}

                        {/* HERO SECTION */}
                        <div>
                            {selectedHoarding.imageUrls && selectedHoarding.imageUrls.length > 0 && (
                                <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-3 relative border border-gray-700">
                                    <img src={selectedHoarding.imageUrls[0]} alt="Hoarding View" className="w-full h-full object-cover" />
                                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono text-white border border-white/10">#{selectedHoarding.id}</div>
                                </div>
                            )}
                            <h1 className="text-sm font-medium text-white leading-snug mb-1">{selectedHoarding.address || selectedHoarding.landmark || selectedHoarding.zone || "Site #" + selectedHoarding.id}</h1>
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] mb-3">
                                <MapPin size={12} />
                                <span>{selectedHoarding.city}, {selectedHoarding.state}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-green-500/5 border border-green-500/20 rounded">
                                <span className="text-[10px] text-green-300/70 uppercase">Monthly Rate</span>
                                <div className="flex items-baseline gap-1"><span className="text-sm font-medium text-green-400">₹{(selectedVariant?.rate ?? selectedHoarding.rate)?.toLocaleString()}</span></div>
                            </div>
                        </div>

                        {/* PILLS */}
                        <div className="flex flex-wrap gap-2">
                            {[formatMediaType(selectedHoarding.mediaType), selectedHoarding.screenPlacement, selectedHoarding.displayFormat, selectedVariant?.option1_value, selectedVariant?.option2_value, selectedVariant?.option3_value].filter(Boolean).map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-300 capitalize tracking-wide">{tag}</span>
                            ))}
                        </div>

                        {variants.length > 1 && (
                            <section>
                                <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Variant</h3>
                                <select
                                    className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded p-2 outline-none"
                                    value={selectedVariant?.id || ''}
                                    onChange={(e) => setSelectedVariantId(e.target.value)}
                                >
                                    {variants.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {(v.variant_title || [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(' / '))} {v.rate ? `- ₹${v.rate}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </section>
                        )}

                        <hr className="border-gray-800" />

                        {/* SPECS */}
                        {(
                            selectedHoarding.screenSize ||
                            (selectedHoarding.width && selectedHoarding.height) ||
                            selectedHoarding.mediaType ||
                            selectedHoarding.displayFormat ||
                            selectedVariant?.size ||
                            selectedVariant?.cinema_format
                        ) && (
                                <section>
                                    <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Specifications</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <DisplayValue label="Screen Size" value={selectedVariant?.size || selectedHoarding.screenSize} />
                                        {selectedHoarding.width && selectedHoarding.height && (
                                            <DisplayValue
                                                label="Dimensions"
                                                value={`${selectedHoarding.width}x${selectedHoarding.height}`}
                                                suffix=" ft"
                                            />
                                        )}
                                        <DisplayValue label="Media Type" value={formatMediaType(selectedHoarding.mediaType)} />
                                        <DisplayValue label="Display" value={selectedHoarding.displayFormat} />
                                        <DisplayValue label="Cinema Format" value={selectedVariant?.cinema_format} />
                                        <DisplayValue label="Audience" value={selectedVariant?.audience_category} />
                                        <DisplayValue label="Seating" value={selectedVariant?.seating} />
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

                        {/* CTA: ADD TO PLAN */}
                        <div className="sticky bottom-0 pt-4 bg-[#0a0a0a] border-t border-gray-800 mt-2">
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => onAddToPlan(selectedHoarding.id, variants.map((v) => v.id))}
                                    disabled={!isAuthenticated || !currentPlan || isMutating}
                                    className={`w-full font-bold py-2.5 rounded text-[10px] uppercase tracking-widest shadow-lg transition-all inline-flex items-center justify-center gap-2 ${isAdded
                                        ? 'bg-green-600 text-black hover:bg-green-500'
                                        : (!isAuthenticated || !currentPlan
                                            ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                                            : 'bg-white hover:bg-gray-200 text-black')
                                        }`}
                                >
                                    <ListPlus size={14} />
                                    {isMutating
                                        ? "Saving..."
                                        : isAdded
                                            ? "Update Plan (All Variants)"
                                            : (!isAuthenticated
                                                ? "Sign in to Add"
                                                : (!currentPlan ? "Create a Plan" : "Add All Variants to Plan"))}
                                </button>
                                <button
                                    onClick={() => onAddToPlan(selectedHoarding.id, selectedVariant?.id ? [selectedVariant.id] : [])}
                                    disabled={!isAuthenticated || !currentPlan || isMutating || !selectedVariant?.id}
                                    className="w-full font-bold py-2.5 rounded text-[10px] uppercase tracking-widest shadow-lg transition-all inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white border border-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <PlusCircle size={14} />
                                    Add This Variant to Plan
                                </button>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Empty State List (Same as before) */}
                        <div className="flex justify-between items-baseline mb-1"><p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{hoardings.length} Sites Available</p></div>
                        {hoardings.map((item) => (
                            <div key={item.id} onClick={() => onSelect(item.id)} className="group cursor-pointer bg-[#111] border border-gray-800 hover:border-green-500/50 hover:bg-[#151515] p-2 rounded-lg transition-all duration-200 flex gap-3">
                                <div className="w-10 h-10 bg-gray-800 rounded flex-shrink-0 overflow-hidden border border-gray-700 relative">
                                    {item.imageUrls?.[0] ? <img src={item.imageUrls[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-600">NO IMG</div>}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className="text-xs font-medium text-gray-200 truncate group-hover:text-green-400 transition-colors">{item.address || item.landmark || item.zone || "Site #" + item.id}</h3>
                                    <div className="flex items-center gap-2 mt-0.5"><p className="text-[10px] text-gray-500 truncate max-w-[100px]">{item.city} • {item.screenSize}</p><p className="text-[10px] font-medium text-green-500 ml-auto">₹{item.rate?.toLocaleString()}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}