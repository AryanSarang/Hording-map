// src/app/explore/_components/FilterPanel.js
"use client";

export default function FilterPanel({ filters, setFilters }) {

    const handleRangeChange = (e) => {
        setFilters({ ...filters, maxPrice: parseInt(e.target.value) });
    };

    const handleTypeChange = (type) => {
        setFilters({ ...filters, mediaType: type });
    };

    return (
        <div className="flex flex-col h-full bg-[#111] text-white border-l border-gray-800">
            <div className="p-4 border-b border-gray-800 bg-[#111] sticky top-0">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Filters</h2>
            </div>

            <div className="p-6 space-y-8">

                {/* Filter Group: Media Type */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Media Type</h3>
                    <div className="space-y-2">
                        {['all', 'digitalScreen', 'unipole', 'gantry'].map((type) => (
                            <label key={type} className="flex items-center space-x-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="mediaType"
                                    checked={filters.mediaType === type}
                                    onChange={() => handleTypeChange(type)}
                                    className="form-radio text-green-500 focus:ring-green-500 bg-gray-800 border-gray-600 h-4 w-4"
                                />
                                <span className={`text-sm capitalize group-hover:text-green-400 ${filters.mediaType === type ? 'text-white' : 'text-gray-400'}`}>
                                    {type === 'all' ? 'All Types' : type.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Filter Group: Price Range */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase">Max Price</h3>
                        <span className="text-xs font-bold bg-gray-800 text-green-400 px-2 py-1 rounded border border-gray-700">
                            ₹{filters.maxPrice.toLocaleString()}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100000"
                        step="1000"
                        value={filters.maxPrice}
                        onChange={handleRangeChange}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                        <span>₹0</span>
                        <span>₹1L+</span>
                    </div>
                </div>

                {/* Filter Group: Status (Toggle) */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Availability</h3>
                    <label className="flex items-center cursor-pointer justify-between">
                        <span className="text-sm text-gray-400">Show only active</span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-checked:after:bg-white"></div>
                        </div>
                    </label>
                </div>

            </div>

            {/* Footer Action */}
            <div className="mt-auto p-4 border-t border-gray-800">
                <button
                    onClick={() => setFilters({ minPrice: 0, maxPrice: 100000, mediaType: 'all' })}
                    className="w-full py-2 text-xs text-gray-500 hover:text-white underline"
                >
                    Reset all filters
                </button>
            </div>
        </div>
    );
}