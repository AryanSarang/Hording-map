// app/explore/page.js
import ExploreView from './_components/ExploreView';
import { supabaseAdmin } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/authServer';
import {
    buildInitialExplorePageQuery,
    fetchExploreCatalogFormatted,
} from '../../lib/exploreCatalogFetch';

// Force the page to fetch fresh data on every visit
export const revalidate = 0;

/** Vercel Pro+: raises serverless limit past 10s if the catalog is large. Hobby stays capped at 10s. */
export const maxDuration = 60;

export default async function ExplorePage() {
    const userPromise = getCurrentUser();

    let exploreMetafieldFilters = [];
    try {
        const { data: mfRows, error: mfErr } = await supabaseAdmin
            .from('vendor_metafields')
            .select('id, name')
            .eq('explore_filter_enabled', true)
            .order('display_order', { ascending: true });
        if (!mfErr && Array.isArray(mfRows)) exploreMetafieldFilters = mfRows;
    } catch (e) {
        console.warn('explore: vendor_metafields explore_filter_enabled', e);
    }

    const exploreMetafieldIds = exploreMetafieldFilters.map((m) => m.id).filter((id) => id != null);

    /**
     * Media-type filter pills must reflect every type that currently has ≥ 1 active media in the
     * database — not just what's in the Maharashtra SSR slice, and not a hardcoded canonical list.
     * We fetch only the `media_type` column (tiny payload) and dedupe on the server so clients
     * always see the full set regardless of what catalog slice is currently loaded.
     */
    let availableMediaTypes = [];
    try {
        const { data: typeRows, error: typeErr } = await supabaseAdmin
            .from('media')
            .select('media_type')
            .or('status.eq.active,status.is.null');
        if (!typeErr && Array.isArray(typeRows)) {
            availableMediaTypes = [
                ...new Set(
                    typeRows
                        .map((r) => (r?.media_type || '').trim())
                        .filter(Boolean)
                ),
            ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        }
    } catch (e) {
        console.warn('explore: distinct media_type fetch', e);
    }

    const { hoardings: formattedHoardings, error } = await fetchExploreCatalogFormatted(
        supabaseAdmin,
        () => buildInitialExplorePageQuery(supabaseAdmin),
        exploreMetafieldIds
    );

    const user = await userPromise;

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
        />
    );
}
