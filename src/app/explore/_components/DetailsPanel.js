// src/app/explore/_components/DetailsPanel.js
"use client";

export default function DetailsPanel({ hoardings, selectedId, onSelect }) {
    // Find the selected object
    const selectedHoarding = selectedId
        ? hoardings.find(h => h.id === selectedId)
        : null;

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">

            {/* Header */}
            <div className="p-4 border-b border-gray-800 sticky top-0 bg-[#0a0a0a] z-10 flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                    {selectedId ? "Selected Site" : "Suggestions"}
                </h2>
                {selectedId && (
                    <button
                        onClick={() => onSelect(null)}
                        className="text-xs text-green-500 hover:text-green-400 underline"
                    >
                        Back to List
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {selectedHoarding ? (
                    // --- VIEW 1: SELECTED ITEM DETAILS ---
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Image */}
                        <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-3 relative border border-gray-700">
                            {selectedHoarding.imageUrls?.[0] ? (
                                <img
                                    src={selectedHoarding.imageUrls[0]}
                                    alt="Hoarding"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-600 text-xs">No Image</div>
                            )}
                        </div>

                        {/* Details */}
                        <h1 className="text-lg font-bold text-white leading-tight mb-1">
                            {selectedHoarding.address || "Unknown Location"}
                        </h1>
                        <p className="text-xs text-gray-400 mb-3 uppercase font-semibold">
                            {selectedHoarding.screenSize} • {selectedHoarding.mediaType}
                        </p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-green-500">₹{selectedHoarding.rate?.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">/mo</span>
                        </div>

                        {/* Extra Metadata */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="bg-gray-900 p-2 rounded border border-gray-800">
                                <p className="text-[10px] text-gray-500 uppercase">Traffic</p>
                                <p className="text-xs font-medium">{selectedHoarding.trafficType || "N/A"}</p>
                            </div>
                            <div className="bg-gray-900 p-2 rounded border border-gray-800">
                                <p className="text-[10px] text-gray-500 uppercase">Placement</p>
                                <p className="text-xs font-medium">{selectedHoarding.screenPlacement || "N/A"}</p>
                            </div>
                        </div>

                        <hr className="my-4 border-gray-800" />

                        <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold text-sm transition">
                            Request Booking
                        </button>
                    </div>

                ) : (
                    // --- VIEW 2: SUGGESTIONS LIST ---
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500 mb-2">
                            Showing {hoardings.length} results
                        </p>

                        {hoardings.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => onSelect(item.id)}
                                className="group cursor-pointer border border-gray-800 bg-gray-900/50 rounded-lg p-2 hover:border-green-500/50 hover:bg-gray-900 transition duration-200 flex gap-3 items-center"
                            >
                                {/* Tiny Thumbnail */}
                                <div className="w-12 h-12 bg-gray-800 rounded flex-shrink-0 overflow-hidden border border-gray-700">
                                    {item.imageUrls?.[0] && (
                                        <img src={item.imageUrls[0]} className="w-full h-full object-cover" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-gray-200 truncate group-hover:text-green-500 transition-colors">
                                        {item.address || "Unknown Location"}
                                    </h3>
                                    <p className="text-xs text-gray-500 truncate">
                                        ₹{item.rate?.toLocaleString()}/mo • {item.mediaType}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}