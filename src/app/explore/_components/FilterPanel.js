// app/explore/_components/FilterPanel.js
"use client";

import { useEffect, useMemo } from 'react';
import MultiSelectDropdown from './MultiSelectDropdown';
import {
    getCityNamesForIndianStates,
    mergeStateOptionsForExplore,
} from '../../../lib/indiaGeoOptions';
import {
    allowedCityOptionsMap,
    coerceLocationStringList,
    deriveStateChangeCities,
    normLoc,
    pruneCitiesToMap,
} from '../../../lib/exploreFilterLocation';

/** Avoid loading 10k+ city names when user selects many states (e.g. multi-select many). */
const MAX_STATES_FOR_SYNTHETIC_CITY_LIST = 6;

function uniqueSortedMetafieldValues(hoardings, metafieldId) {
    const id = String(metafieldId);
    const m = new Map();
    for (const h of hoardings || []) {
        const raw = h.metafields?.[id];
        if (raw == null || String(raw).trim() === '') continue;
        const v = String(raw).trim();
        m.set(normLoc(v), v);
    }
    return [...m.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

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
    /** `{ id, name }[]` — metafields flagged for explore (from server). */
    exploreMetafieldFilters = [],
}) {
    const selectedStates = useMemo(
        () => coerceLocationStringList(filters.states),
        [filters.states]
    );

    /** Remount city multiselect when state selection changes so options + search reset immediately. */
    const stateSelectionKey = useMemo(
        () => selectedStates.slice().sort().join('|') || '__none__',
        [selectedStates]
    );

    /**
     * Keep `filters.cities` strictly inside the set of cities allowed by the current state selection.
     * - No states selected → cities must be cleared (city filter is hidden anyway).
     * - States selected → drop any city that isn’t in the CSC-validated allow set for those states.
     * This runs whenever states or catalog change so stale city picks from a prior state never leak.
     */
    useEffect(() => {
        setFilters((f) => {
            const current = coerceLocationStringList(f.cities);
            if (!selectedStates.length) {
                if (current.length === 0) return f;
                return { ...f, cities: [] };
            }
            const allowed = allowedCityOptionsMap(
                hoardings,
                selectedStates,
                getCityNamesForIndianStates,
                MAX_STATES_FOR_SYNTHETIC_CITY_LIST
            );
            const nextCities = pruneCitiesToMap(current, allowed);
            const prevKey = [...new Set(current.map(normLoc))].sort().join('|');
            const nextKey = [...new Set(nextCities.map(normLoc))].sort().join('|');
            if (prevKey === nextKey) return f;
            return { ...f, cities: nextCities };
        });
    }, [hoardings, selectedStates, setFilters]);

    const options = useMemo(() => {
        const getUnique = (key) => [...new Set(hoardings.map((h) => h[key]).filter(Boolean))];

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

        const cityMap = allowedCityOptionsMap(
            hoardings,
            selectedStates,
            getCityNamesForIndianStates,
            MAX_STATES_FOR_SYNTHETIC_CITY_LIST
        );
        const cities = [...cityMap.values()].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        const mediaTypes = getUnique('mediaType');

        const rates = hoardings.map((h) => h.rate).filter((r) => r > 0);
        const maxRateData = rates.length > 0 ? Math.max(...rates) : 100000;

        return { states, cities, mediaTypes, maxRateData };
    }, [hoardings, selectedStates]);

    const toggleArrayItem = (field, value) => {
        const currentList = filters[field];
        if (currentList.includes(value)) {
            setFilters({ ...filters, [field]: currentList.filter((item) => item !== value) });
        } else {
            setFilters({ ...filters, [field]: [...currentList, value] });
        }
    };

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

    const metafieldSelections = filters.metafieldSelections && typeof filters.metafieldSelections === 'object'
        ? filters.metafieldSelections
        : {};

    return (
        <div className="relative flex flex-col h-full bg-[#111] text-white border-l border-gray-800 font-sans">
            {isApplying ? (
                <div
                    className="absolute inset-0 z-[30] bg-black/55 flex items-center justify-center pointer-events-none"
                    aria-hidden
                >
                    <p className="text-xs font-semibold text-white uppercase tracking-widest animate-pulse">
                        Loading catalog…
                    </p>
                </div>
            ) : null}

            <div className="p-4 border-b border-gray-800 bg-[#111] sticky top-0 z-10">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Filters</h2>
            </div>

            <div
                className={`min-w-0 p-6 space-y-8 overflow-y-auto overflow-x-hidden ${isApplying ? 'opacity-50 pointer-events-none' : ''}`}
            >
                {options.maxRateData > 0 && (
                    <div className="w-full min-w-0 max-w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">Price Range</h3>
                        </div>

                        <div className="w-full min-w-0 max-w-full px-2 box-border">
                            {/**
                             * Native range thumbs are clipped so their centers live inside
                             * [thumbRadius, width − thumbRadius]. We inset the track + fill by the
                             * same radius so the green line always stops exactly at the thumb dots.
                             */}
                            <div className="relative h-9 w-full max-w-full">
                                <div
                                    className="pointer-events-none absolute top-1/2 z-0 h-0.5 -translate-y-1/2 rounded bg-gray-700"
                                    style={{ left: 7, right: 7 }}
                                />
                                <div
                                    className="pointer-events-none absolute top-1/2 z-[1] h-0.5 -translate-y-1/2 rounded bg-green-500"
                                    style={{
                                        left: `calc(7px + ${(minPrice / rangeMax) * 100}% - ${(minPrice / rangeMax) * 14}px)`,
                                        width: `calc(${Math.max(0, ((maxPrice - minPrice) / rangeMax) * 100)}% - ${Math.max(0, ((maxPrice - minPrice) / rangeMax) * 14)}px)`,
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
                                height: 14px;
                                margin: 0;
                                padding: 0;
                                background: transparent;
                            }
                            .thumb-input::-webkit-slider-runnable-track {
                                background: transparent;
                                border: none;
                                height: 14px;
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
                                border: none;
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
                                border: none;
                                height: 14px;
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

                {options.states.length > 0 && (
                    <div className="min-w-0 space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase">Location</h3>
                        <div>
                            <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                                States
                            </p>
                            <MultiSelectDropdown
                                values={filters.states || []}
                                onChange={(next) => {
                                    setFilters((prev) => {
                                        const { cities } = deriveStateChangeCities({
                                            hoardings,
                                            prevStates: prev.states || [],
                                            nextStates: next,
                                            prevCities: prev.cities || [],
                                            getCityNamesForIndianStates,
                                        });
                                        return { ...prev, states: next, cities };
                                    });
                                }}
                                placeholder="Select states"
                                options={options.states.map((s) => ({ value: s, label: s }))}
                                allowSearch
                                searchPlaceholder="Search states..."
                            />
                        </div>

                        {/**
                         * Cascading city filter: only rendered once at least one state is selected.
                         * This enforces “city ⊂ state” visually and prevents stale cities from any
                         * previously selected state from appearing.
                         */}
                        {selectedStates.length > 0 && options.cities.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[10px] text-gray-600 uppercase tracking-wide">
                                        Cities
                                    </p>
                                    {(filters.cities?.length ?? 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFilters((prev) => ({ ...prev, cities: [] }))
                                            }
                                            className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-green-400"
                                            title="Clear city selection"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <MultiSelectDropdown
                                    key={`cities-${stateSelectionKey}`}
                                    values={filters.cities || []}
                                    allLabel="ALL"
                                    onChange={(next) =>
                                        setFilters((prev) => ({ ...prev, cities: next }))
                                    }
                                    placeholder="All cities"
                                    options={options.cities.map((c) => ({ value: c, label: c }))}
                                    allowSearch
                                    searchPlaceholder="Search cities..."
                                />
                            </div>
                        )}
                    </div>
                )}

                {options.mediaTypes.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Media Type</h3>
                        <div className="flex flex-wrap gap-2">
                            {options.mediaTypes.map((type) => (
                                <button
                                    key={type}
                                    type="button"
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

                {exploreMetafieldFilters.length > 0 && (
                    <div className="min-w-0 space-y-4">
                        {exploreMetafieldFilters.map((mf) => {
                            const mfId = String(mf.id);
                            const vals = uniqueSortedMetafieldValues(hoardings, mfId);
                            if (vals.length === 0) return null;
                            const selected = Array.isArray(metafieldSelections[mfId])
                                ? metafieldSelections[mfId]
                                : [];
                            return (
                                <div key={mfId}>
                                    <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                                        {mf.name || `Field ${mfId}`}
                                    </p>
                                    <MultiSelectDropdown
                                        values={selected}
                                        allLabel="ALL"
                                        onChange={(next) =>
                                            setFilters({
                                                ...filters,
                                                metafieldSelections: {
                                                    ...metafieldSelections,
                                                    [mfId]: next.map(String),
                                                },
                                            })
                                        }
                                        placeholder={`All ${mf.name || 'values'}`}
                                        options={vals.map((v) => ({ value: v, label: v }))}
                                        allowSearch
                                        searchPlaceholder="Search…"
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

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
                    More states, cities, or custom-field values adds +2 credits each beyond the first in
                    that group. Narrowing media type or price range adds +2.
                </p>
                <div className="h-2" />
                <button
                    type="button"
                    onClick={() => {
                        const base = defaultFiltersForReset ?? {
                            states: [],
                            cities: [],
                            minPrice: 0,
                            maxPrice: options.maxRateData,
                            mediaTypes: options.mediaTypes,
                            metafieldSelections: {},
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
