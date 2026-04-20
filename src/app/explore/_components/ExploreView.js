// app/explore/_components/ExploreView.js
"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import DetailsPanel from './DetailsPanel';
import FilterPanel from './FilterPanel';
import ExploreHeader from './ExploreHeader';
import { toast } from 'sonner';
import {
    computeExploreFilterCreditCost,
    normalizeExploreFiltersForCompare,
} from './exploreFilterCredits';
import { buildDefaultExploreLandingFilters } from './exploreFilterDefaults';
import {
    coerceLocationStringList,
    hoardingMatchesCityFilter,
    hoardingMatchesStateFilter,
    normLoc,
} from '../../../lib/exploreFilterLocation';
import { resolveIndianStateRow, isIndianCityInCscState } from '../../../lib/indiaGeoOptions';

const MapSection = dynamic(() => import('./MapSection'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-gray-500">Loading Map...</div>
});

export default function ExploreView({
    initialCatalog,
    user,
    exploreMetafieldFilters = [],
    availableMediaTypes = [],
}) {
    const [hoardings, setHoardings] = useState(initialCatalog);
    const normalizePlanItems = (items) => {
        if (!Array.isArray(items)) return [];
        const merged = new Map();
        for (const raw of items) {
            if (!raw) continue;
            const mediaId = typeof raw === 'string' ? raw : String(raw.mediaId || raw.id || '').trim();
            if (!mediaId) continue;
            const incomingVariantIds = Array.isArray(raw?.variantIds) ? raw.variantIds.map(String).filter(Boolean) : [];
            if (!merged.has(mediaId)) merged.set(mediaId, { mediaId, variantIds: [] });
            const prev = merged.get(mediaId);
            prev.variantIds = Array.from(new Set([...(prev.variantIds || []), ...incomingVariantIds]));
            merged.set(mediaId, prev);
        }
        return Array.from(merged.values());
    };

    const [selectedId, setSelectedId] = useState(null);

    const isAuthenticated = !!user;

    // --- PLAN MANAGEMENT STATE (persisted per user via API) ---
    const [plans, setPlans] = useState([]);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [planError, setPlanError] = useState(null);
    const [planMutatingMediaIds, setPlanMutatingMediaIds] = useState(new Set());

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
                    const list = (Array.isArray(data.plans) ? data.plans : []).map((p) => ({
                        ...p,
                        items: normalizePlanItems(p.items),
                    }));
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
            return { success: false, error: 'Please log in to create and save plans.' };
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
            return { success: true, plan: newPlan };
        } catch (err) {
            console.error('Create plan error:', err);
            return { success: false, error: err?.message || 'Failed to create plan' };
        }
    };

    const handleAddToPlan = async (hoardingId, selectedVariantIds = []) => {
        if (!isAuthenticated) {
            alert('Sign in to add sites to a plan.');
            return;
        }
        if (!currentPlan) {
            alert('Create a plan to add sites.');
            return;
        }
        setPlanMutatingMediaIds((prev) => new Set(prev).add(hoardingId));
        const currentItems = normalizePlanItems(currentPlan.items);
        const idx = currentItems.findIndex((i) => i.mediaId === hoardingId);
        const safeSelectedVariantIds = Array.isArray(selectedVariantIds)
            ? selectedVariantIds.map(String).filter(Boolean)
            : [];
        let updatedItems = currentItems;
        if (idx === -1) {
            updatedItems = [...currentItems, { mediaId: hoardingId, variantIds: safeSelectedVariantIds }];
        } else {
            const existing = currentItems[idx];
            const mergedVariantIds = Array.from(new Set([...(existing.variantIds || []), ...safeSelectedVariantIds]));
            updatedItems = currentItems.map((it, i) => i === idx ? { ...it, variantIds: mergedVariantIds } : it);
        }
        const optimisticPlan = { ...currentPlan, items: updatedItems };
        const previousPlan = currentPlan;
        const previousPlans = plans;
        setCurrentPlan(optimisticPlan);
        setPlans(plans.map((p) => (p.id === optimisticPlan.id ? optimisticPlan : p)));
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
            const normalized = { ...updatedPlan, items: normalizePlanItems(updatedPlan.items) };
            setPlans((prev) => prev.map((p) => (p.id === normalized.id ? normalized : p)));
            setCurrentPlan(normalized);
        } catch (err) {
            console.error('Add to plan error:', err);
            alert(err?.message || 'Failed to add to plan');
            setCurrentPlan(previousPlan);
            setPlans(previousPlans);
        } finally {
            setPlanMutatingMediaIds((prev) => {
                const next = new Set(prev);
                next.delete(hoardingId);
                return next;
            });
        }
    };

    const handleRemoveMediaFromPlan = async (hoardingId) => {
        if (!isAuthenticated || !currentPlan) return;
        setPlanMutatingMediaIds((prev) => new Set(prev).add(hoardingId));
        const currentItems = normalizePlanItems(currentPlan.items);
        const updatedItems = currentItems.filter((it) => String(it.mediaId) !== String(hoardingId));
        const optimisticPlan = { ...currentPlan, items: updatedItems };
        const previousPlan = currentPlan;
        const previousPlans = plans;
        setCurrentPlan(optimisticPlan);
        setPlans(plans.map((p) => (p.id === optimisticPlan.id ? optimisticPlan : p)));
        try {
            const res = await fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ items: updatedItems }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update plan');
            const updatedPlan = data.plan;
            setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? { ...updatedPlan, items: normalizePlanItems(updatedPlan.items) } : p)));
            setCurrentPlan({ ...updatedPlan, items: normalizePlanItems(updatedPlan.items) });
        } catch (err) {
            console.error('Remove from plan error:', err);
            toast.error(err?.message || 'Failed to remove from plan');
            setCurrentPlan(previousPlan);
            setPlans(previousPlans);
        } finally {
            setPlanMutatingMediaIds((prev) => {
                const next = new Set(prev);
                next.delete(hoardingId);
                return next;
            });
        }
    };

    const handleRemoveVariantFromPlan = async (hoardingId, variantId) => {
        if (!isAuthenticated || !currentPlan || !variantId) return;
        const h = hoardings.find((x) => String(x.id) === String(hoardingId));
        const mediaVariants = Array.isArray(h?.variants) ? h.variants : [];
        setPlanMutatingMediaIds((prev) => new Set(prev).add(hoardingId));
        const currentItems = normalizePlanItems(currentPlan.items);
        const nextItems = currentItems
            .map((it) => {
                if (String(it.mediaId) !== String(hoardingId)) return it;
                const currentIds = Array.isArray(it.variantIds) ? it.variantIds : [];
                const explicitIds = currentIds.length > 0
                    ? currentIds.map(String)
                    : mediaVariants.map((v) => String(v.id));
                const nextVariantIds = explicitIds.filter((id) => id !== String(variantId));
                return { ...it, variantIds: nextVariantIds };
            })
            .filter((it) => {
                if (String(it.mediaId) !== String(hoardingId)) return true;
                return Array.isArray(it.variantIds) && it.variantIds.length > 0;
            });
        const optimisticPlan = { ...currentPlan, items: nextItems };
        const previousPlan = currentPlan;
        const previousPlans = plans;
        setCurrentPlan(optimisticPlan);
        setPlans(plans.map((p) => (p.id === optimisticPlan.id ? optimisticPlan : p)));
        try {
            const res = await fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ items: nextItems }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update plan');
            const updatedPlan = data.plan;
            setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? { ...updatedPlan, items: normalizePlanItems(updatedPlan.items) } : p)));
            setCurrentPlan({ ...updatedPlan, items: normalizePlanItems(updatedPlan.items) });
        } catch (err) {
            console.error('Remove variant from plan error:', err);
            toast.error(err?.message || 'Failed to remove variant');
            setCurrentPlan(previousPlan);
            setPlans(previousPlans);
        } finally {
            setPlanMutatingMediaIds((prev) => {
                const next = new Set(prev);
                next.delete(hoardingId);
                return next;
            });
        }
    };

    const handleCreateAiPlan = async (payload) => {
        if (!isAuthenticated) {
            return { success: false, error: 'Please log in to create and save plans.' };
        }
        try {
            const res = await fetch('/api/plans/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create AI plan');
            }
            const created = data.plan;
            const nextPlans = [created, ...plans];
            setPlans(nextPlans);
            setCurrentPlan(created);
            return { success: true, plan: created, analysis: data.analysis };
        } catch (err) {
            console.error('AI plan creation error:', err);
            return { success: false, error: err?.message || 'Failed to create AI plan' };
        }
    };
    // -----------------------------

    const initialMaxPriceFromSSR = useMemo(() => {
        const rates = initialCatalog.map((h) => h.rate).filter((r) => r > 0);
        return rates.length > 0 ? Math.max(...rates) : 100000;
    }, [initialCatalog]);

    const landingFilters = useMemo(
        () =>
            buildDefaultExploreLandingFilters(
                initialCatalog,
                initialMaxPriceFromSSR || 100000
            ),
        [initialCatalog, initialMaxPriceFromSSR]
    );

    const dataMaxPrice = useMemo(() => {
        const rates = hoardings.map((h) => h.rate).filter((r) => r > 0);
        return rates.length > 0 ? Math.max(...rates) : 100000;
    }, [hoardings]);

    const landingFiltersKey = useMemo(
        () => normalizeExploreFiltersForCompare(landingFilters),
        [landingFilters]
    );

    const [appliedFilters, setAppliedFilters] = useState(landingFilters);
    const [draftFilters, setDraftFilters] = useState(landingFilters);
    const [applyingFilters, setApplyingFilters] = useState(false);

    const prevLandingKeyRef = useRef(null);
    useEffect(() => {
        if (prevLandingKeyRef.current === landingFiltersKey) return;
        prevLandingKeyRef.current = landingFiltersKey;
        setAppliedFilters(landingFilters);
        setDraftFilters(landingFilters);
    }, [landingFiltersKey, landingFilters]);

    const filterHasChanges = useMemo(() => {
        return normalizeExploreFiltersForCompare(draftFilters) !== normalizeExploreFiltersForCompare(appliedFilters);
    }, [draftFilters, appliedFilters]);

    const filterApplyCreditCost = useMemo(
        () => computeExploreFilterCreditCost(draftFilters, hoardings, dataMaxPrice || 100000),
        [draftFilters, hoardings, dataMaxPrice]
    );

    const planMediaIdSet = useMemo(() => {
        const s = new Set();
        const items = currentPlan?.items;
        if (!Array.isArray(items)) return s;
        for (const raw of items) {
            if (!raw) continue;
            const mediaId =
                typeof raw === 'string' ? raw : String(raw.mediaId || raw.id || '').trim();
            if (mediaId) s.add(mediaId);
        }
        return s;
    }, [currentPlan]);

    const handleApplyFilters = async () => {
        if (!filterHasChanges || applyingFilters) return;

        if (!isAuthenticated) {
            toast.error('Please sign in to apply filters');
            window.location.href = '/login';
            return;
        }

        setApplyingFilters(true);
        try {
            const res = await fetch('/api/explore/apply-filters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    states: draftFilters.states ?? [],
                    cities: draftFilters.cities ?? [],
                    mediaTypes: draftFilters.mediaTypes ?? [],
                    minPrice: draftFilters.minPrice ?? 0,
                    maxPrice: draftFilters.maxPrice,
                    metafieldSelections: draftFilters.metafieldSelections ?? {},
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data?.success === false) {
                throw new Error(data?.error || 'Failed to apply filters');
            }

            setHoardings(Array.isArray(data.hoardings) ? data.hoardings : []);
            setAppliedFilters(draftFilters);
            const charged = typeof data?.cost === 'number' ? data.cost : 0;
            toast.success('Filters applied', {
                description: data?.exempt
                    ? 'Admin — no credits charged'
                    : `Charged ${charged} credits`,
            });
        } catch (err) {
            toast.error('Could not apply filters', { description: err?.message || 'Try again' });
        } finally {
            setApplyingFilters(false);
        }
    };

    /**
     * Map + list reflect the LAST APPLIED filter set only — the Apply button is the single source of
     * truth for what the catalog shows. Editing the panel changes draft state but must never mutate
     * the visible map/list until the user confirms via Apply (prevents credit-billed updates from
     * bleeding into free preview changes).
     */
    const filteredHoardings = useMemo(() => {
        return hoardings.filter((h) => {
            const f = appliedFilters;
            if (h.rate !== null && h.rate !== undefined && (h.rate < f.minPrice || h.rate > f.maxPrice)) return false;
            const states = coerceLocationStringList(f.states);
            if (!hoardingMatchesStateFilter(states, h.state)) return false;
            const cities = coerceLocationStringList(f.cities);
            if (!hoardingMatchesCityFilter(cities, h.city)) return false;
            if (states.length > 0 && h.city) {
                const sr = resolveIndianStateRow(h.state);
                if (sr && !isIndianCityInCscState(h.state, h.city)) return false;
            }
            const mediaTypes = Array.isArray(f.mediaTypes) ? f.mediaTypes : [];
            if (mediaTypes.length > 0 && h.mediaType && !mediaTypes.includes(h.mediaType)) {
                return false;
            }
            const mfs = f.metafieldSelections && typeof f.metafieldSelections === 'object' ? f.metafieldSelections : {};
            for (const [mfId, vals] of Object.entries(mfs)) {
                if (!Array.isArray(vals) || vals.length === 0) continue;
                const rowVal = h.metafields?.[String(mfId)];
                const rowNorm = normLoc(rowVal);
                if (!rowNorm || !vals.some((v) => normLoc(v) === rowNorm)) return false;
            }
            return true;
        });
    }, [hoardings, appliedFilters]);

    /** After applying a state/city filter, fit the map to remaining markers (industry-standard map UX). */
    const filterMapFocus = useMemo(() => {
        const f = appliedFilters;
        const st = Array.isArray(f.states) ? f.states : [];
        const ct = Array.isArray(f.cities) ? f.cities : [];
        if (st.length === 0 && ct.length === 0) return null;
        const locKey = JSON.stringify({ s: [...st].sort(), c: [...ct].sort() });
        const coords = [];
        for (const h of filteredHoardings) {
            const lat = h.latitude != null ? Number(h.latitude) : NaN;
            const lng = h.longitude != null ? Number(h.longitude) : NaN;
            if (Number.isFinite(lat) && Number.isFinite(lng)) coords.push([lat, lng]);
        }
        if (coords.length === 0) {
            return { key: `${locKey}|0`, pointCount: 0 };
        }
        if (coords.length === 1) {
            return {
                key: `${locKey}|1`,
                center: coords[0],
                zoom: 12,
                pointCount: 1,
            };
        }
        let minLat = Infinity;
        let maxLat = -Infinity;
        let minLng = Infinity;
        let maxLng = -Infinity;
        for (const [lat, lng] of coords) {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        }
        const pad = 0.05;
        if (maxLat - minLat < pad) {
            minLat -= pad / 2;
            maxLat += pad / 2;
        }
        if (maxLng - minLng < pad) {
            minLng -= pad / 2;
            maxLng += pad / 2;
        }
        return {
            key: `${locKey}|${coords.length}`,
            bounds: [[minLat, minLng], [maxLat, maxLng]],
            pointCount: coords.length,
        };
    }, [appliedFilters.states, appliedFilters.cities, filteredHoardings]);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-black text-white">

            {/* --- LEFT COLUMN: MAP (60%) --- */}
            {/* Map takes full height, independent of the header */}
            <section className="w-[60%] h-full relative border-r border-gray-800">
                <MapSection
                    hoardings={filteredHoardings}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    filterFocus={filterMapFocus}
                    planMediaIds={planMediaIdSet}
                />
                {applyingFilters ? (
                    <div className="absolute inset-0 z-[2400] bg-black/55 flex flex-col items-center justify-center gap-2 pointer-events-auto">
                        <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-green-400 animate-spin" aria-hidden />
                        <p className="text-xs font-semibold text-white uppercase tracking-widest">
                            Updating filters…
                        </p>
                    </div>
                ) : null}
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
                    onCreateAiPlan={handleCreateAiPlan}
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
                            onRemoveMediaFromPlan={handleRemoveMediaFromPlan}
                            onRemoveVariantFromPlan={handleRemoveVariantFromPlan}
                            currentPlan={currentPlan}
                            isAuthenticated={isAuthenticated}
                            planMutatingMediaIds={planMutatingMediaIds}
                            exploreMetafieldFilters={exploreMetafieldFilters}
                        />
                    </div>

                    {/* Filters (Right half of right column = 20% of total) */}
                    <div className="w-1/2 h-full min-w-0 max-w-full bg-[#111] overflow-hidden">
                        <FilterPanel
                            hoardings={hoardings}
                            filters={draftFilters}
                            setFilters={setDraftFilters}
                            onApply={handleApplyFilters}
                            canApply={filterHasChanges}
                            isApplying={applyingFilters}
                            applyCreditCost={filterApplyCreditCost}
                            defaultFiltersForReset={landingFilters}
                            exploreMetafieldFilters={exploreMetafieldFilters}
                            availableMediaTypes={availableMediaTypes}
                            onResetToLanding={(next) => {
                                setDraftFilters(next);
                                setAppliedFilters(next);
                                setHoardings(initialCatalog);
                            }}
                        />
                    </div>

                </div>
            </section>

        </div>
    );
}