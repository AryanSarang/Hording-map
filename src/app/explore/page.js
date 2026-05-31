// app/explore/page.js
import ExploreView from './_components/ExploreView';
import { supabaseAdmin } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/authServer';
import {
    buildInitialExplorePageQuery,
    fetchExploreCatalogFormatted,
} from '../../lib/exploreCatalogFetch';
import { getOrSetCached } from '../../lib/memoryCache';

// Force the page to fetch fresh data on every visit
export const revalidate = 0;

/** Vercel Pro+: raises serverless limit past 10s if the catalog is large. Hobby stays capped at 10s. */
export const maxDuration = 60;

/**
 * The page reads the current user (cookies) so it can't go full ISR. Instead we cache the
 * three public sub-queries that don't depend on the user — together they're ~80% of the
 * per-visit time. TTLs deliberately differ:
 *   - Catalog (60s)  — biggest query, changes when vendors add inventory; OK to be a minute stale.
 *   - Metafield list (5 min) — only changes when an admin toggles `explore_filter_enabled`.
 *   - Distinct media types (5 min) — only changes when a brand-new media_type appears.
 *
 * Side effect: this means a freshly published media won't show on /explore for up to 60s.
 * We accept that trade-off because the alternative is the multi-second cold load every visit.
 */
const CATALOG_TTL_MS = 60_000;
const METAFIELD_LIST_TTL_MS = 5 * 60_000;
const MEDIA_TYPES_TTL_MS = 5 * 60_000;

export default async function ExplorePage({ searchParams }) {
    const userPromise = getCurrentUser();

    /**
     * Resolve the landing-slice filters in priority order:
     *   1. URL params (`?state=&type=`)   — explicit user / external link
     *   2. Profile.explore_preferences    — saved from the onboarding modal
     *   3. Default (Maharashtra)           — first-time / unauthenticated visitor
     *
     * We do this before SSR so the first paint reflects the user's actual selection
     * (no flash of Maharashtra data for someone who picked UP). The profile read is
     * a single tiny query and the user fetch is already in-flight.
     */
    const sp = (await searchParams) || {};
    const urlState = typeof sp.state === 'string' ? sp.state : null;
    const urlMediaType = typeof sp.type === 'string' ? sp.type : null;

    let resolvedState = urlState;
    let resolvedMediaType = urlMediaType;
    let userPrefsForClient = null;
    let needsOnboarding = false;
    const userForPrefs = await userPromise;
    if (userForPrefs && !urlState) {
        try {
            const { data: prof } = await supabaseAdmin
                .from('profiles')
                .select('explore_preferences')
                .eq('id', userForPrefs.id)
                .maybeSingle();
            const prefs = prof?.explore_preferences || {};
            if (prefs?.state) {
                resolvedState = resolvedState || prefs.state;
                resolvedMediaType = resolvedMediaType || prefs.mediaType || null;
                userPrefsForClient = prefs;
            } else {
                // Authenticated but never completed onboarding — modal will gate /explore.
                needsOnboarding = true;
            }
        } catch (e) {
            console.warn('explore: profile prefs read', e);
        }
    }
    const landingState = resolvedState || 'Maharashtra';
    const landingMediaType = resolvedMediaType || null;

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

    /**
     * Media-type filter pills must reflect every type that currently has ≥ 1 active media in the
     * database. The old implementation full-scanned the media table on every /explore visit;
     * caching here drops that to ~1 fetch per 5 minutes per serverless instance.
     */
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

    /**
     * Catalog cache is keyed by:
     *   - the landing state + media type (per-user onboarding slice)
     *   - the metafield-id list (the formatter merges metafield values; toggling an
     *     `explore_filter_enabled` flag should invalidate older permutations)
     *
     * Different users with the same chosen (state, mediaType, metafields) tuple
     * will share a single Supabase fetch — which is the entire point of caching.
     */
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

    const user = userForPrefs;

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
            landingPreferences={{
                state: landingState,
                mediaType: landingMediaType,
                source: urlState ? 'url' : userPrefsForClient?.state ? 'profile' : 'default',
            }}
            needsOnboarding={needsOnboarding}
        />
    );
}
