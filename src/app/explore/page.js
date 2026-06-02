// app/explore/page.js
//
// SSR entry for the explore experience. /explore is no longer a public landing —
// it's the "edit a plan" surface in the new flow. We enforce three gates at the
// server before rendering anything:
//   1. The user must be authenticated.
//   2. The user must have `profiles.status` of `approved` (or legacy `active`).
//      Middleware also enforces this, but doubling up here keeps a future
//      refactor of middleware from accidentally opening the route.
//   3. A valid `?planId=…` must be present and belong to the user. Without it,
//      we redirect to /plans so they pick or create one.
//
// Once those pass we use the plan's `media_type` + `states` to slice the
// initial SSR catalog so the user lands directly on the inventory that matches
// their plan intent — no client-side re-fetch on first paint.

import { redirect } from 'next/navigation';
import ExploreView from './_components/ExploreView';
import { supabaseAdmin } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/authServer';
import {
    buildInitialExplorePageQuery,
    fetchExploreCatalogFormatted,
} from '../../lib/exploreCatalogFetch';
import { getOrSetCached } from '../../lib/memoryCache';

export const revalidate = 0;
export const maxDuration = 60;

const CATALOG_TTL_MS = 60_000;
const METAFIELD_LIST_TTL_MS = 5 * 60_000;
const MEDIA_TYPES_TTL_MS = 5 * 60_000;

export default async function ExplorePage({ searchParams }) {
    // --- Gate 1: authenticated user ---
    const user = await getCurrentUser();
    if (!user) {
        redirect('/login?next=/plans');
    }

    // --- Gate 2: approved profile ---
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('status, is_onboarded')
        .eq('id', user.id)
        .maybeSingle();
    if (!profile?.is_onboarded) {
        redirect('/onboarding');
    }
    if (profile.status !== 'approved' && profile.status !== 'active') {
        redirect('/pending');
    }

    // --- Gate 3: plan id present + owned by user ---
    const sp = (await searchParams) || {};
    const planId = typeof sp.planId === 'string' ? sp.planId.trim() : null;
    if (!planId) {
        // The new flow always enters /explore via a plan — there's no anonymous
        // "browse the map" mode any more. Push the user to /plans where they can
        // pick or create one.
        redirect('/plans');
    }
    const { data: planRow, error: planErr } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', user.id)
        .maybeSingle();
    if (planErr || !planRow) {
        // Stale URL or someone else's plan id → bounce.
        redirect('/plans');
    }

    // The plan's intent drives the SSR catalog slice. `states` is the chosen
    // 1–2 array; we slice on the first state for the SSR query because the
    // catalog fetch helper currently takes a single state. Any additional
    // state is enforced client-side after Apply — which keeps the SSR fast
    // and avoids ballooning catalog size on first paint.
    const planStates = Array.isArray(planRow.states) ? planRow.states.filter(Boolean) : [];
    const landingState = planStates[0] || 'Maharashtra';
    const landingMediaType = planRow.media_type || null;

    // --- Shared explore-side caches ---
    const exploreMetafieldFilters = await getOrSetCached(
        'explore:metafield-filter-list',
        METAFIELD_LIST_TTL_MS,
        async () => {
            try {
                const { data: mfRows, error: mfErr } = await supabaseAdmin
                    .from('vendor_metafields')
                    .select('id, name, applies_to_media_types')
                    .eq('explore_filter_enabled', true)
                    .order('display_order', { ascending: true });
                if (mfErr || !Array.isArray(mfRows)) return [];
                return mfRows;
            } catch (e) {
                console.warn('explore: vendor_metafields explore_filter_enabled', e);
                return [];
            }
        }
    );
    const exploreMetafieldIds = exploreMetafieldFilters.map((m) => m.id).filter((id) => id != null);

    const availableMediaTypes = await getOrSetCached(
        'explore:distinct-media-types',
        MEDIA_TYPES_TTL_MS,
        async () => {
            try {
                const { data: typeRows, error: typeErr } = await supabaseAdmin
                    .from('media')
                    .select('media_type')
                    .or('status.eq.active,status.is.null');
                if (typeErr || !Array.isArray(typeRows)) return [];
                return [
                    ...new Set(
                        typeRows.map((r) => (r?.media_type || '').trim()).filter(Boolean)
                    ),
                ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            } catch (e) {
                console.warn('explore: distinct media_type fetch', e);
                return [];
            }
        }
    );

    const catalogCacheKey = [
        'explore:catalog',
        landingState.toLowerCase(),
        (landingMediaType || '').toLowerCase(),
        exploreMetafieldIds.slice().sort().join(','),
    ].join(':');
    const cachedCatalog = await getOrSetCached(catalogCacheKey, CATALOG_TTL_MS, () =>
        fetchExploreCatalogFormatted(
            supabaseAdmin,
            () =>
                buildInitialExplorePageQuery(supabaseAdmin, {
                    state: landingState,
                    mediaType: landingMediaType,
                }),
            exploreMetafieldIds
        )
    );
    const formattedHoardings = cachedCatalog?.hoardings || [];
    const error = cachedCatalog?.error || null;

    if (error) {
        console.error('Supabase Error:', error);
        return <div className="p-10 text-red-500">Error loading data.</div>;
    }

    return (
        <ExploreView
            initialCatalog={formattedHoardings}
            user={user}
            exploreMetafieldFilters={exploreMetafieldFilters}
            availableMediaTypes={availableMediaTypes}
            // The plan that scopes this whole session. ExploreView locks the
            // plan switcher to this one and pre-seeds filters from its intent.
            initialPlan={planRow}
            landingPreferences={{
                state: landingState,
                mediaType: landingMediaType,
                states: planStates,
                source: 'plan',
            }}
        />
    );
}
