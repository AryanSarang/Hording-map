// src/app/explore/_components/FilterPanel.js
"use client";

import { useMemo } from 'react';

export default function FilterPanel({ hoardings, filters, setFilters }) {

    // --- 1. DATA ANALYSIS ---
    const options = useMemo(() => {
        const getUnique = (key) => [...new Set(hoardings.map(h => h[key]).filter(Boolean))];

        const states = getUnique('state');
        const cities = [...new Set(hoardings
            .filter(h => h.state === filters.state)
            .map(h => h.city)
            .filter(Boolean)
        )];

        const positions = getUnique('positionWRTRoad');
        const mediaTypes = getUnique('mediaType');
        const vendors = getUnique('vendorId');

        const rates = hoardings.map(h => h.rate).filter(r => r > 0);
        const maxRateData = rates.length > 0 ? Math.max(...rates) : 100000;

        return { states, cities, positions, mediaTypes, vendors, maxRateData };
    }, [hoardings, filters.state]);

    // --- 2. HANDLERS ---
    const toggleArrayItem = (field, value) => {
        const currentList = filters[field];
        if (currentList.includes(value)) {
            setFilters({ ...filters, [field]: currentList.filter(item => item !== value) });
        } else {
            setFilters({ ...filters, [field]: [...currentList, value] });
        }
    };

    const handleVendorChange = (e) => {
        setFilters({ ...filters, vendorId: e.target.value });
    };

    // --- 3. DUAL SLIDER LOGIC ---
    const minPrice = filters.minPrice;
    const maxPrice = filters.maxPrice;
    const rangeMax = options.maxRateData;
    const MIN_GAP = 100;

    const handleMinChange = (e) => {
        const value = Math.min(Number(e.target.value), maxPrice - MIN_GAP);
        setFilters({ ...filters, minPrice: value });
    };

    const handleMaxChange = (e) => {
        const value = Math.max(Number(e.target.value), minPrice + MIN_GAP);
        setFilters({ ...filters, maxPrice: value });
    };

    const minPos = ((minPrice) / rangeMax) * 100;
    const maxPos = ((maxPrice) / rangeMax) * 100;

    return (
        <div className="flex flex-col h-full bg-[#111] text-white border-l border-gray-800 font-sans">
            <div className="p-4 border-b border-gray-800 bg-[#111] sticky top-0 z-10">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Filters</h2>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto">

                {/* --- DUAL PRICE SLIDER --- */}
                {options.maxRateData > 0 && (
                    <div className="w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">Price Range</h3>
                        </div>

                        {/* SLIDER CONTAINER */}
                        <div className="relative w-full h-8 flex items-center justify-center">

                            {/* 1. Gray Track */}
                            <div className="absolute w-full h-0.5 bg-gray-700 rounded z-0"></div>

                            {/* 2. Green Active Bar */}
                            <div
                                className="absolute h-0.5 bg-green-500 rounded z-10"
                                style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }}
                            ></div>

                            {/* 3. Inputs (Visible Thumbs, Transparent Tracks) */}
                            <input
                                type="range"
                                min="0" max={rangeMax} step={100}
                                value={minPrice}
                                onChange={handleMinChange}
                                className="thumb-input z-20"
                            />
                            <input
                                type="range"
                                min="0" max={rangeMax} step={100}
                                value={maxPrice}
                                onChange={handleMaxChange}
                                className="thumb-input z-30"
                            />

                            {/* 4. CSS for the Thumbs */}
                            <style jsx>{`
                    .thumb-input {
                        position: absolute;
                        pointer-events: none; /* Allow clicking through the track */
                        -webkit-appearance: none; 
                        z-index: 20;
                        height: 5px;
                        width: 100%;
                        opacity: 1; /* Make sure it's visible */
                        background: transparent; /* Make track invisible */
                    }
                    
                    /* CHROME / SAFARI THUMB */
                    .thumb-input::-webkit-slider-thumb {
                        pointer-events: auto; /* Re-enable clicking on the dot */
                        -webkit-appearance: none;
                        height: 10px;
                        width: 10px;
                        border-radius: 50%;
                        background: #22c55e;
                        {/* border: 1px solid #22c55e; */}
                        cursor: pointer;
                        margin-top: -1px; /* Center vertical */
                        box-shadow: 0 0 4px rgba(0,0,0,0.5);
                    }

                    /* FIREFOX THUMB */
                    .thumb-input::-moz-range-thumb {
                        pointer-events: auto;
                        height: 10px;
                        width: 10px;
                        border: none;
                        border-radius: 50%;
                        background: #22c55e;
                        {/* border: 2px solid #22c55e; */}
                        cursor: pointer;
                        box-shadow: 0 0 4px rgba(0,0,0,0.5);
                    }
                `}</style>
                        </div>

                        {/* Values Display */}
                        <div className="flex justify-between items-center mt-2">
                            <div className="text-xs font-bold bg-gray-800 text-green-400 px-3 py-1 rounded border border-gray-700">
                                ₹{minPrice.toLocaleString()}
                            </div>
                            <div className="text-xs font-bold bg-gray-800 text-green-400 px-3 py-1 rounded border border-gray-700">
                                ₹{maxPrice.toLocaleString()}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- LOCATION --- */}
                {(options.states.length > 1 || options.cities.length > 1) && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase">Location</h3>
                        {options.states.length > 1 && (
                            <select
                                value={filters.state}
                                onChange={(e) => setFilters({ ...filters, state: e.target.value, city: '' })}
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-green-500"
                            >
                                <option value="">All States</option>
                                {options.states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        )}
                        {options.cities.length > 0 && (
                            <select
                                value={filters.city}
                                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-green-500"
                            >
                                <option value="">All Cities</option>
                                {options.cities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                    </div>
                )}

                {/* --- POSITION --- */}
                {options.positions.length > 1 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Road Position</h3>
                        <div className="flex gap-2">
                            {['LHS', 'RHS'].map((pos) => (
                                <button
                                    key={pos}
                                    onClick={() => toggleArrayItem('positions', pos)}
                                    className={`flex-1 py-2 px-3 rounded-md text-xs font-bold border transition-all ${filters.positions.includes(pos)
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    {pos}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- MEDIA TYPE --- */}
                {options.mediaTypes.length > 1 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Media Type</h3>
                        <div className="flex flex-wrap gap-2">
                            {options.mediaTypes.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => toggleArrayItem('mediaTypes', type)}
                                    className={`py-2 px-4 rounded-full text-xs font-medium border transition-all ${filters.mediaTypes.includes(type)
                                        ? 'bg-white text-black border-white'
                                        : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
                                        }`}
                                >
                                    {type.replace(/([A-Z])/g, ' $1').trim()}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- VENDOR --- */}
                {options.vendors.length > 1 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Vendor</h3>
                        <select
                            value={filters.vendorId || "all"}
                            onChange={handleVendorChange}
                            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-green-500"
                        >
                            <option value="all">All Vendors</option>
                            {options.vendors.map(vId => <option key={vId} value={vId}>Vendor #{vId}</option>)}
                        </select>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="mt-auto p-4 border-t border-gray-800">
                <button
                    onClick={() => setFilters({
                        state: '', city: '', minPrice: 0, maxPrice: options.maxRateData,
                        positions: ['LHS', 'RHS'], mediaTypes: options.mediaTypes, vendorId: 'all'
                    })}
                    className="w-full py-2 text-xs text-gray-500 hover:text-white underline"
                >
                    Reset Filters
                </button>
            </div>
        </div>
    );
}