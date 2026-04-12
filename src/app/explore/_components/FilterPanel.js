// app/explore/_components/FilterPanel.js
"use client";

import { useMemo } from 'react';
import MultiSelectDropdown from './MultiSelectDropdown';
import {
    getCityNamesForIndianStates,
    mergeStateOptionsForExplore,
} from '../../../lib/indiaGeoOptions';

/** Avoid loading 10k+ city names when user selects many states (e.g. multi-select many). */
const MAX_STATES_FOR_SYNTHETIC_CITY_LIST = 6;

export default function FilterPanel({
    hoardings,
    filters,
    setFilters,
    onApply,
    canApply,
    isApplying,
    applyCreditCost = 5,
    defaultFiltersForReset,
    /** When set, Reset restores draft + applied + in-memory catalog (SSR slice) without a new Apply. */
    onResetToLanding,
}) {

    const selectedStates = filters.states || [];

    // --- 1. DATA ANALYSIS ---
    const options = useMemo(() => {
        const getUnique = (key) => [...new Set(hoardings.map(h => h[key]).filter(Boolean))];

        const catalogStateLabels = (() => {
            const byKey = new Map();
            for (const h of hoardings) {
                const raw = h.state;
                if (raw == null || raw === '') continue;
                const label = String(raw).trim();
                const key = label.toLowerCase();
                if (!byKey.has(key)) byKey.set(key, label);
            }
            return [...byKey.values()];
        })();

        const states = mergeStateOptionsForExplore(catalogStateLabels);

        const catalogCities = hoardings
            .filter((h) => {
                if (!selectedStates.length) return true;
                const hs = String(h.state || '').toLowerCase();
                return selectedStates.some((s) => String(s).toLowerCase() === hs);
            })
            .map((h) => h.city)
            .filter(Boolean);

        const syntheticCities =
            selectedStates.length > 0 &&
                selectedStates.length <= MAX_STATES_FOR_SYNTHETIC_CITY_LIST
                ? getCityNamesForIndianStates(selectedStates)
                : [];

        const cities = (() => {
            const byKey = new Map();
            for (const c of syntheticCities) {
                const label = String(c).trim();
                if (label) byKey.set(label.toLowerCase(), label);
            }
            for (const c of catalogCities) {
                const label = String(c).trim();
                if (label) byKey.set(label.toLowerCase(), label);
            }
            return [...byKey.values()].sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: 'base' })
            );
        })();

        const mediaTypes = getUnique('mediaType');

        const vendorMap = new Map();
        for (const h of hoardings) {
            const vid = h.vendorId;
            if (vid == null || vid === '') continue;
            const id = String(vid);
            if (vendorMap.has(id)) continue;
            const nm = h.vendorName;
            const label = nm && String(nm).trim() ? String(nm).trim() : `Vendor #${id}`;
            vendorMap.set(id, label);
        }
        const vendorOptions = Array.from(vendorMap.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

        const rates = hoardings.map(h => h.rate).filter(r => r > 0);
        const maxRateData = rates.length > 0 ? Math.max(...rates) : 100000;

        return { states, cities, mediaTypes, vendorOptions, maxRateData };
    }, [hoardings, selectedStates]);

    // --- 2. HANDLERS ---
    const toggleArrayItem = (field, value) => {
        const currentList = filters[field];
        if (currentList.includes(value)) {
            setFilters({ ...filters, [field]: currentList.filter(item => item !== value) });
        } else {
            setFilters({ ...filters, [field]: [...currentList, value] });
        }
    };

    // Vendor dropdown now uses custom component; no native event handler needed.

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

    return (
        <div className="flex flex-col h-full bg-[#111] text-white border-l border-gray-800 font-sans">
            <div className="p-4 border-b border-gray-800 bg-[#111] sticky top-0 z-10">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Filters</h2>
            </div>

            <div className="min-w-0 p-6 space-y-8 overflow-y-auto overflow-x-hidden">

                {/* --- DUAL PRICE SLIDER --- */}
                {options.maxRateData > 0 && (
                    <div className="w-full min-w-0 max-w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">Price Range</h3>
                        </div>

                        <div className="w-full min-w-0 max-w-full px-2 box-border">
                            <div className="relative h-9 w-full max-w-full">
                                <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-0 h-0.5 -translate-y-1/2 rounded bg-gray-700" />
                                <div
                                    className="pointer-events-none absolute top-1/2 z-[1] h-0.5 -translate-y-1/2 rounded bg-green-500"
                                    style={{
                                        left: `${(minPrice / rangeMax) * 100}%`,
                                        width: `${Math.max(0, ((maxPrice - minPrice) / rangeMax) * 100)}%`,
                                    }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max={rangeMax}
                                    step={100}
                                    value={minPrice}
                                    onChange={handleMinChange}
                                    className="thumb-input absolute z-20"
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max={rangeMax}
                                    step={100}
                                    value={maxPrice}
                                    onChange={handleMaxChange}
                                    className="thumb-input absolute z-30"
                                />
                            </div>
                        </div>

                        <style jsx>{`
                            .thumb-input {
                                position: absolute;
                                pointer-events: none;
                                -webkit-appearance: none;
                                top: 50%;
                                transform: translateY(-50%);
                                left: 0;
                                right: 0;
                                width: 100%;
                                max-width: 100%;
                                height: 8px;
                                margin: 0;
                                padding: 0;
                                background: transparent;
                            }
                            .thumb-input::-webkit-slider-thumb {
                                pointer-events: auto;
                                -webkit-appearance: none;
                                height: 14px;
                                width: 14px;
                                border-radius: 50%;
                                background: #22c55e;
                                cursor: pointer;
                                box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
                            }
                            .thumb-input::-moz-range-thumb {
                                pointer-events: auto;
                                height: 14px;
                                width: 14px;
                                border: none;
                                border-radius: 50%;
                                background: #22c55e;
                                cursor: pointer;
                                box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
                            }
                            .thumb-input::-moz-range-track {
                                background: transparent;
                            }
                        `}</style>

                        <div className="mt-3 flex justify-between gap-2 min-w-0">
                            <div className="text-xs font-bold bg-gray-800 text-green-400 px-2 py-1 rounded border border-gray-700 truncate shrink min-w-0">
                                ₹{minPrice.toLocaleString()}
                            </div>
                            <div className="text-xs font-bold bg-gray-800 text-green-400 px-2 py-1 rounded border border-gray-700 truncate shrink min-w-0">
                                ₹{maxPrice.toLocaleString()}
                            </div>
                        </div>
                    </div>
                )}

                {(options.states.length > 0 || options.cities.length > 0) && (
                    <div className="min-w-0 space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase">Location</h3>
                        {options.states.length > 0 && (
                            <div>
                                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                                    States
                                </p>
                                <MultiSelectDropdown
                                    values={filters.states || []}
                                    onChange={(next) => {
                                        const citySet = new Set(
                                            hoardings
                                                .filter((h) => {
                                                    if (!next.length) return true;
                                                    const hs = String(h.state || '').toLowerCase();
                                                    return next.some(
                                                        (s) => String(s).toLowerCase() === hs
                                                    );
                                                })
                                                .map((h) => h.city)
                                                .filter(Boolean)
                                        );
                                        const nextCities = (filters.cities || []).filter((c) =>
                                            citySet.has(c)
                                        );
                                        setFilters({ ...filters, states: next, cities: nextCities });
                                    }}
                                    placeholder="Select states"
                                    options={options.states.map((s) => ({ value: s, label: s }))}
                                    allowSearch
                                    searchPlaceholder="Search states..."
                                />
                            </div>
                        )}
                        {options.cities.length > 0 && (
                            <div>
                                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                                    Cities
                                </p>
                                <MultiSelectDropdown
                                    values={filters.cities || []}
                                    allLabel="ALL"
                                    onChange={(next) => setFilters({ ...filters, cities: next })}
                                    placeholder="All cities"
                                    options={options.cities.map((c) => ({ value: c, label: c }))}
                                    allowSearch
                                    searchPlaceholder="Search cities..."
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* --- MEDIA TYPE --- */}
                {options.mediaTypes.length > 0 && (
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
                {options.vendorOptions.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Vendor</h3>
                        <MultiSelectDropdown
                            values={filters.vendorIds || []}
                            allLabel="ALL"
                            onChange={(next) => setFilters({ ...filters, vendorIds: next.map(String) })}
                            placeholder="All vendors"
                            options={options.vendorOptions}
                            allowSearch
                            searchPlaceholder="Search vendors..."
                        />
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="mt-auto p-4 border-t border-gray-800">
                <button
                    type="button"
                    onClick={() => onApply?.()}
                    disabled={!canApply || isApplying}
                    className="w-full py-2 text-xs text-black bg-green-500 hover:bg-green-400 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed font-bold uppercase tracking-widest"
                    title="Apply filters"
                >
                    {isApplying ? 'Applying...' : `Apply filters (${applyCreditCost} credits)`}
                </button>
                <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
                    More states, cities, or vendors adds +2 credits each beyond the first in that group. Narrowing media type or price range adds +2.
                </p>
                <div className="h-2" />
                <button
                    type="button"
                    onClick={() => {
                        const base = defaultFiltersForReset ?? {
                            states: [],
                            cities: [],
                            vendorIds: [],
                            minPrice: 0,
                            maxPrice: options.maxRateData,
                            mediaTypes: options.mediaTypes,
                        };
                        const next = structuredClone(base);
                        if (onResetToLanding) onResetToLanding(next);
                        else setFilters(next);
                    }}
                    className="w-full py-2 text-xs text-gray-500 hover:text-white underline"
                >
                    Reset Filters
                </button>
            </div>
        </div>
    );
}