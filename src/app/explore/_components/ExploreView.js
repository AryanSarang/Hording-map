// app/explore/_components/ExploreView.js
"use client";

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import DetailsPanel from './DetailsPanel';
import FilterPanel from './FilterPanel';
import ExploreHeader from './ExploreHeader';

const MapSection = dynamic(() => import('./MapSection'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-gray-500">Loading Map...</div>
});

export default function ExploreView({ hoardings, user }) {
    const [selectedId, setSelectedId] = useState(null);

    const isAuthenticated = !!user;

    // --- PLAN MANAGEMENT STATE (persisted per user via API) ---
    const [plans, setPlans] = useState([]);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [planError, setPlanError] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            // Guest: no server plans, keep empty state
            setPlans([]);
            setCurrentPlan(null);
            setPlanError(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                setLoadingPlans(true);
                setPlanError(null);
                const res = await fetch('/api/plans', { credentials: 'include' });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (!cancelled) {
                        setPlanError(data.error || 'Failed to load plans');
                    }
                    return;
                }
                const data = await res.json();
                if (!cancelled) {
                    const list = Array.isArray(data.plans) ? data.plans : [];
                    setPlans(list);
                    setCurrentPlan(list[0] || null);
                }
            } catch (err) {
                if (!cancelled) setPlanError(err?.message || 'Failed to load plans');
            } finally {
                if (!cancelled) setLoadingPlans(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated]);

    const handleCreatePlan = async (name) => {
        if (!isAuthenticated) {
            alert('Please log in to create and save plans.');
            return;
        }
        try {
            const res = await fetch('/api/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, items: [] }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create plan');
            }
            const newPlan = data.plan;
            const nextPlans = [newPlan, ...plans];
            setPlans(nextPlans);
            setCurrentPlan(newPlan);
        } catch (err) {
            console.error('Create plan error:', err);
            alert(err?.message || 'Failed to create plan');
        }
    };

    const handleAddToPlan = async (hoardingId) => {
        if (!isAuthenticated) {
            alert('Please log in to add sites to a plan.');
            return;
        }
        if (!currentPlan) {
            alert('Create a plan first.');
            return;
        }
        if (currentPlan.items?.includes(hoardingId)) return;
        const updatedItems = [...(currentPlan.items || []), hoardingId];
        try {
            const res = await fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ items: updatedItems }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update plan');
            }
            const updatedPlan = data.plan;
            setPlans(plans.map(p => (p.id === updatedPlan.id ? updatedPlan : p)));
            setCurrentPlan(updatedPlan);
        } catch (err) {
            console.error('Add to plan error:', err);
            alert(err?.message || 'Failed to add to plan');
        }
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
        if (h.rate !== null && h.rate !== undefined && (h.rate < filters.minPrice || h.rate > filters.maxPrice)) return false;
        if (filters.state && h.state?.toLowerCase() !== filters.state.toLowerCase()) return false;
        if (filters.city && h.city?.toLowerCase() !== filters.city.toLowerCase()) return false;
        if (h.positionWRTRoad && !filters.positions.includes(h.positionWRTRoad)) return false;
        if (h.mediaType && !filters.mediaTypes.includes(h.mediaType)) return false;
        if (filters.vendorId !== 'all') {
            const hVendorId = h.vendorId ? Number(h.vendorId) : null;
            const fVendorId = Number(filters.vendorId);
            if (hVendorId !== fVendorId) return false;
        }
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
                    user={user}
                    isAuthenticated={isAuthenticated}
                    loadingPlans={loadingPlans}
                    planError={planError}
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
                            isAuthenticated={isAuthenticated}
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