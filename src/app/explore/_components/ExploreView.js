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
import { haversineDistanceKm } from '../../../lib/haversine';

const MapSection = dynamic(() => import('./MapSection'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-gray-500">Loading Map...</div>
});

export default function ExploreView({
    initialCatalog,
    user,
    exploreMetafieldFilters = [],
    availableMediaTypes = [],
    landingPreferences = null,
    initialPlan = null,
}) {
    // Onboarding modal is gone in the new flow — /plans is the gate, /explore is
    // only ever entered with a planId. `landingPreferences.states/mediaType`
    // already reflect the plan intent.

    /**
     * Radius filter (UX spec #1): a single circle on the map with an adjustable km
     * slider, used to filter the visible catalog down to media within the chosen
     * radius of a user-placed center point. Lives at this level (not inside MapSection)
     * so the list view + apply pipeline can both honor it.
     *
     * Shape:
     *   - active:   user is in "place center" mode; next map click drops the center
     *   - center:   [lat, lng] | null
     *   - radiusKm: 1..500 — slider value when a center is placed
     */
    const [radiusFilter, setRadiusFilter] = useState({
        active: false,
        center: null,
        radiusKm: 10,
    });
    const [hoardings, setHoardings] = useState(initialCatalog);
    /**
     * Normalize plan item shape across legacy/string entries and the current object form.
     * Items collapse on `mediaId`. We additionally preserve `pricingSelections` —
     * the per-condition picks the user made in DetailsPanel — as
     * `{ [ruleName]: { optionLabel, multiplier } }`. When merging duplicates the later
     * occurrence wins for selections (covers re-adds with new picks).
     */
    const normalizePlanItems = (items) => {
        if (!Array.isArray(items)) return [];
        const merged = new Map();
        for (const raw of items) {
            if (!raw) continue;
            const mediaId = typeof raw === 'string' ? raw : String(raw.mediaId || raw.id || '').trim();
            if (!mediaId) continue;
            const incomingVariantIds = Array.isArray(raw?.variantIds) ? raw.variantIds.map(String).filter(Boolean) : [];
            const incomingSelections =
                raw && typeof raw === 'object' && raw.pricingSelections && typeof raw.pricingSelections === 'object'
                    ? raw.pricingSelections
                    : null;
            if (!merged.has(mediaId)) merged.set(mediaId, { mediaId, variantIds: [], pricingSelections: {} });
            const prev = merged.get(mediaId);
            prev.variantIds = Array.from(new Set([...(prev.variantIds || []), ...incomingVariantIds]));
            if (incomingSelections) {
                const cleaned = {};
                for (const [ruleName, picked] of Object.entries(incomingSelections)) {
                    const rn = String(ruleName || '').trim();
                    if (!rn || !picked) continue;
                    const optionLabel = String(picked.optionLabel ?? picked ?? '').trim();
                    const mult = Number(picked.multiplier);
                    if (!optionLabel) continue;
                    cleaned[rn] = { optionLabel, multiplier: Number.isFinite(mult) && mult > 0 ? mult : 1 };
                }
                prev.pricingSelections = { ...(prev.pricingSelections || {}), ...cleaned };
            }
            merged.set(mediaId, prev);
        }
        return Array.from(merged.values());
    };

    const [selectedId, setSelectedId] = useState(null);

    const isAuthenticated = !!user;

    // --- PLAN MANAGEMENT STATE (persisted per user via API) ---
    //
    // The new flow is plan-scoped: SSR resolves the plan from `?planId=` and
    // hands it in via `initialPlan`. We seed `currentPlan` from that so the
    // first paint already shows the right "Add to plan" target — no second
    // round-trip and no auto-pick-first guesswork.
    //
    // We still keep a `plans` list for the header's "Switch plan" menu, but
    // that list is loaded lazily and treated as read-only context.
    const initialPlanWithItems = useMemo(() => {
        if (!initialPlan) return null;
        return { ...initialPlan, items: normalizePlanItems(initialPlan.items) };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPlan?.id]);
    const [plans, setPlans] = useState(initialPlanWithItems ? [initialPlanWithItems] : []);
    const [currentPlan, setCurrentPlan] = useState(initialPlanWithItems);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [planError, setPlanError] = useState(null);
    const [planMutatingMediaIds, setPlanMutatingMediaIds] = useState(new Set());

    useEffect(() => {
        if (!isAuthenticated) {
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
                    // Prefer the SSR-resolved plan; fall back to the first one
                    // only if the URL didn't pin a specific plan (legacy entry).
                    setCurrentPlan((prev) => {
                        if (prev?.id) {
                            const fresh = list.find((p) => p.id === prev.id);
                            return fresh || prev;
                        }
                        return list[0] || null;
                    });
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

    const handleAddToPlan = async (hoardingId, selectedVariantIds = [], pricingSelections = null) => {
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
        // Latest picks fully replace any previously stored picks for this media — we
        // never merge across "Add to plan" clicks because the user has just made a
        // fresh decision on the panel.
        const safePricingSelections =
            pricingSelections && typeof pricingSelections === 'object' ? pricingSelections : {};
        let updatedItems = currentItems;
        if (idx === -1) {
            updatedItems = [
                ...currentItems,
                {
                    mediaId: hoardingId,
                    variantIds: safeSelectedVariantIds,
                    pricingSelections: safePricingSelections,
                },
            ];
        } else {
            const existing = currentItems[idx];
            const mergedVariantIds = Array.from(new Set([...(existing.variantIds || []), ...safeSelectedVariantIds]));
            updatedItems = currentItems.map((it, i) =>
                i === idx
                    ? { ...it, variantIds: mergedVariantIds, pricingSelections: safePricingSelections }
                    : it
            );
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

    /**
     * Seed the landing filters from the plan's intent when we're in plan-scoped
     * mode (the standard new flow). Falls back to the legacy "Mumbai + cinema"
     * default only if no plan was passed in (defensive — shouldn't normally
     * happen now that /explore is gated behind a planId).
     */
    const landingFilters = useMemo(() => {
        const maxPrice = initialMaxPriceFromSSR || 100000;
        const planStates = Array.isArray(initialPlan?.states) ? initialPlan.states.filter(Boolean) : [];
        const planMediaType = initialPlan?.media_type || null;
        if (initialPlan && (planStates.length > 0 || planMediaType)) {
            return {
                states: planStates,
                cities: [], // city sub-filter is opt-in; FilterPanel auto-fills cities for selected states
                minPrice: 0,
                maxPrice,
                // If the plan pinned a single media type, lock the filter to it.
                // Otherwise show everything available in the catalog slice.
                mediaTypes: planMediaType ? [planMediaType] : [
                    ...new Set(initialCatalog.map((h) => h.mediaType).filter(Boolean)),
                ],
                metafieldSelections: {},
            };
        }
        return buildDefaultExploreLandingFilters(initialCatalog, maxPrice);
    }, [initialCatalog, initialMaxPriceFromSSR, initialPlan]);

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
            /**
             * Radius filter — applied client-side because the SSR catalog is already loaded
             * and the user can move the center / change the radius interactively. Falling
             * back to Haversine in JS keeps the round trip zero for what's a sub-millisecond
             * computation per pin.
             */
            if (radiusFilter?.center) {
                const [clat, clng] = radiusFilter.center;
                const dist = haversineDistanceKm(h.latitude, h.longitude, clat, clng);
                if (dist > Number(radiusFilter.radiusKm || 0)) return false;
            }
            return true;
        });
    }, [hoardings, appliedFilters, radiusFilter]);

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
                    radiusFilter={radiusFilter}
                    onRadiusFilterChange={setRadiusFilter}
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
                            radiusFilter={radiusFilter}
                            onRadiusFilterChange={setRadiusFilter}
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