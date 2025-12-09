// src/app/explore/_components/ExploreView.js
"use client";

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import DetailsPanel from './DetailsPanel';
import FilterPanel from './FilterPanel';
import ExploreHeader from './ExploreHeader';

const MapSection = dynamic(() => import('./MapSection'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-gray-500">Loading Map...</div>
});

export default function ExploreView({ hoardings }) {
    const [selectedId, setSelectedId] = useState(null);

    // --- PLAN MANAGEMENT STATE ---
    const [plans, setPlans] = useState([
        { id: 'default', name: 'New Campaign 2025', items: [] },
    ]);
    const [currentPlan, setCurrentPlan] = useState(plans[0]);

    const handleCreatePlan = (name) => {
        const newPlan = { id: Date.now().toString(), name: name, items: [] };
        setPlans([...plans, newPlan]);
        setCurrentPlan(newPlan);
    };

    const handleAddToPlan = (hoardingId) => {
        if (currentPlan.items.includes(hoardingId)) return;
        const updatedPlan = { ...currentPlan, items: [...currentPlan.items, hoardingId] };
        setPlans(plans.map(p => p.id === currentPlan.id ? updatedPlan : p));
        setCurrentPlan(updatedPlan);
    };
    // -----------------------------

    const initialMaxPrice = useMemo(() => {
        const rates = hoardings.map(h => h.rate).filter(r => r > 0);
        return rates.length > 0 ? Math.max(...rates) : 100000;
    }, [hoardings]);

    const [filters, setFilters] = useState({
        state: '', city: '',
        minPrice: 0, maxPrice: initialMaxPrice || 100000,
        positions: ['LHS', 'RHS'],
        mediaTypes: [...new Set(hoardings.map(h => h.mediaType).filter(Boolean))],
        vendorId: 'all',
    });

    const filteredHoardings = hoardings.filter(h => {
        if (h.rate !== null && (h.rate < filters.minPrice || h.rate > filters.maxPrice)) return false;
        if (filters.state && h.state?.toLowerCase() !== filters.state.toLowerCase()) return false;
        if (filters.city && h.city?.toLowerCase() !== filters.city.toLowerCase()) return false;
        if (h.positionWRTRoad && !filters.positions.includes(h.positionWRTRoad)) return false;
        if (h.mediaType && !filters.mediaTypes.includes(h.mediaType)) return false;
        if (filters.vendorId !== 'all' && h.vendorId !== Number(filters.vendorId)) return false;
        return true;
    });

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-black text-white">

            {/* --- LEFT COLUMN: MAP (60%) --- */}
            {/* Map takes full height, independent of the header */}
            <section className="w-[60%] h-full relative border-r border-gray-800">
                <MapSection
                    hoardings={filteredHoardings}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                />
                {filteredHoardings.length === 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 p-4 rounded text-center z-[2000] pointer-events-none">
                        <p className="text-white font-bold text-sm">No Hoardings Found</p>
                        <p className="text-[10px] text-gray-400">Try adjusting filters</p>
                    </div>
                )}
            </section>

            {/* --- RIGHT COLUMN: HEADER + PANELS (40%) --- */}
            <section className="w-[40%] h-full flex flex-col bg-[#0a0a0a]">

                {/* 1. HEADER (Top of Right Column) */}
                <ExploreHeader
                    plans={plans}
                    currentPlan={currentPlan}
                    onSwitchPlan={setCurrentPlan}
                    onCreatePlan={handleCreatePlan}
                />

                {/* 2. PANELS AREA (Remaining Height) */}
                <div className="flex flex-1 overflow-hidden border-t border-gray-800">

                    {/* Details (Left half of right column = 20% of total) */}
                    <div className="w-1/2 h-full border-r border-gray-800 bg-[#0a0a0a]">
                        <DetailsPanel
                            hoardings={filteredHoardings}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onAddToPlan={handleAddToPlan}
                            currentPlan={currentPlan}
                        />
                    </div>

                    {/* Filters (Right half of right column = 20% of total) */}
                    <div className="w-1/2 h-full bg-[#111]">
                        <FilterPanel
                            hoardings={hoardings}
                            filters={filters}
                            setFilters={setFilters}
                        />
                    </div>

                </div>
            </section>

        </div>
    );
}