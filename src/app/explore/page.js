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

    const { hoardings: formattedHoardings, error } = await fetchExploreCatalogFormatted(
        supabaseAdmin,
        () => buildInitialExplorePageQuery(supabaseAdmin)
    );

    const user = await userPromise;

    if (error) {
        console.error('Supabase Error:', error);
        return <div className="p-10 text-red-500">Error loading data.</div>;
    }

    return <ExploreView initialCatalog={formattedHoardings} user={user} />;
}
