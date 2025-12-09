// src/app/explore/_components/DetailsPanel.js
"use client";

export default function DetailsPanel({ hoardings, selectedId, onSelect, onAddToPlan, currentPlan }) {
    const selectedHoarding = selectedId
        ? hoardings.find(h => h.id === selectedId)
        : null;

    // Check if current item is already in the selected plan
    const isAdded = selectedHoarding && currentPlan?.items.includes(selectedHoarding.id);

    // ... (Formatting Helpers formatMediaType, formatHoardingType, DisplayValue remain the same) ...
    const formatMediaType = (type) => {
        if (!type) return '-';
        if (type === 'digitalScreen') return 'Digital Screen';
        return type.replace(/([A-Z])/g, ' $1').trim();
    };

    const formatHoardingType = (type) => {
        if (!type) return '-';
        if (type.toLowerCase() === 'led') return 'LED';
        return type;
    };

    const DisplayValue = ({ label, value, suffix = "" }) => (
        <div className="bg-[#1a1a1a] p-2 rounded border border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-xs font-medium text-gray-200 truncate">
                {value ? `${value}${suffix}` : <span className="text-gray-600">-</span>}
            </p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white border-l border-r border-gray-800">

            {/* Header */}
            <div className="p-3 border-b border-gray-800 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-20 flex justify-between items-center">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {selectedId ? "Property Details" : "Explore Sites"}
                </h2>
                {selectedId && (
                    <button onClick={() => onSelect(null)} className="text-[10px] text-green-500 hover:text-green-400 font-medium transition-colors uppercase tracking-wide">
                        ✕ Close
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
                            <h1 className="text-sm font-bold text-white leading-snug mb-1 capitalize">{selectedHoarding.description || "No Description"}</h1>
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] mb-3"><span>📍 {selectedHoarding.city}, {selectedHoarding.state}</span></div>
                            <div className="flex items-center justify-between p-2 bg-green-500/5 border border-green-500/20 rounded">
                                <span className="text-[10px] text-green-300/70 uppercase">Monthly Rate</span>
                                <div className="flex items-baseline gap-1"><span className="text-sm font-bold text-green-400">₹{selectedHoarding.rate?.toLocaleString()}</span></div>
                            </div>
                        </div>

                        {/* PILLS */}
                        <div className="flex flex-wrap gap-2">
                            {[formatMediaType(selectedHoarding.mediaType), selectedHoarding.screenPlacement, formatHoardingType(selectedHoarding.hordingType)].filter(Boolean).map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-300 capitalize tracking-wide">{tag}</span>
                            ))}
                        </div>

                        <hr className="border-gray-800" />

                        {/* SPECS */}
                        <section>
                            <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Specifications</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <DisplayValue label="Screen Size" value={selectedHoarding.screenSize} />
                                <DisplayValue label="Dimensions" value={selectedHoarding.width && selectedHoarding.height ? `${selectedHoarding.width}x${selectedHoarding.height}` : null} suffix=" ft" />
                                <DisplayValue label="Media Type" value={formatMediaType(selectedHoarding.mediaType)} />
                                <DisplayValue label="Tech" value={formatHoardingType(selectedHoarding.hordingType)} />
                            </div>
                        </section>

                        {/* VISIBILITY */}
                        <section>
                            <h3 className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Visibility</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <DisplayValue label="Position" value={selectedHoarding.positionWRTRoad} />
                                <DisplayValue label="Traffic" value={selectedHoarding.trafficType} />
                                <div className="col-span-2"><DisplayValue label="Landmark" value={selectedHoarding.landmark || selectedHoarding.roadName} /></div>
                            </div>
                        </section>

                        {/* CTA: ADD TO PLAN */}
                        <div className="sticky bottom-0 pt-4 bg-[#0a0a0a] border-t border-gray-800 mt-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onAddToPlan(selectedHoarding.id)}
                                    disabled={isAdded}
                                    className={`flex-1 font-bold py-2.5 rounded text-[10px] uppercase tracking-widest shadow-lg transition-all ${isAdded
                                        ? 'bg-green-600 text-black cursor-default'
                                        : 'bg-white hover:bg-gray-200 text-black'
                                        }`}
                                >
                                    {isAdded ? "✓ Added to Plan" : "Add to Plan"}
                                </button>
                                <button className="px-3 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700 transition-colors">
                                    ❤️
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
                                    <h3 className="text-xs font-bold text-gray-200 truncate group-hover:text-green-400 transition-colors capitalize">{item.description || "Site #" + item.id}</h3>
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