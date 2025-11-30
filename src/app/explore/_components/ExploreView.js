// src/app/explore/_components/ExploreView.js
"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic'; // Required for the map
import DetailsPanel from './DetailsPanel';
import FilterPanel from './FilterPanel';

// 👇 THIS WAS MISSING. We must import MapSection dynamically to avoid window errors.
const MapSection = dynamic(() => import('./MapSection'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-gray-500">Loading Map...</div>
});

export default function ExploreView({ hoardings }) {
    const [selectedId, setSelectedId] = useState(null);

    const [filters, setFilters] = useState({
        minPrice: 0,
        maxPrice: 100000,
        mediaType: 'all',
    });

    const filteredHoardings = hoardings.filter(h => {
        if (h.rate < filters.minPrice || h.rate > filters.maxPrice) return false;
        if (filters.mediaType !== 'all' && h.mediaType !== filters.mediaType) return false;
        return true;
    });

    return (
        // Dark mode background
        <main className="flex h-screen w-screen overflow-hidden bg-black text-white">

            {/* LEFT: Map (60%) */}
            <section className="w-[60%] h-full relative border-r border-gray-800">
                <MapSection
                    hoardings={filteredHoardings}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                />
            </section>

            {/* MIDDLE: Details (20%) */}
            <section className="w-[20%] h-full overflow-y-auto border-r border-gray-800 bg-[#0a0a0a]">
                <DetailsPanel
                    hoardings={filteredHoardings}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                />
            </section>

            {/* RIGHT: Filters (20%) */}
            <section className="w-[20%] h-full overflow-y-auto bg-[#111]">
                <FilterPanel
                    filters={filters}
                    setFilters={setFilters}
                />
            </section>
        </main>
    );
}