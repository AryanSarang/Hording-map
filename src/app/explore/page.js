// app/explore/page.js
import ExploreView from './_components/ExploreView';
import { supabaseAdmin } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/authServer';
import { fetchAllSupabasePagesParallel } from '../../lib/fetchAllSupabasePages';

// Force the page to fetch fresh data on every visit
export const revalidate = 0;

/** Vercel Pro+: raises serverless limit past 10s if the catalog is large. Hobby stays capped at 10s — keep fetches fast (parallel variants). */
export const maxDuration = 60;

/** Narrow columns to shrink payload vs select('*') — keep in sync with `media` table + explore components. */
const MEDIA_COLUMNS =
    'id,vendor_id,latitude,longitude,address,locality,landmark,city,zone,state,pincode,media_type,monthly_rental,media,screen_size,display_format,display_hours,title,option1_name,option2_name,option3_name,vendor:vendors(name)';

const VARIANT_COLUMNS =
    'id,media_id,rate,display_order,option1_value,option2_value,option3_value,variant_title,size,cinema_format,audience_category,seating';

/** Larger chunks = fewer HTTP round trips (PostgREST URL limits ~8k; UUID × ~200 is safe). */
const VARIANT_IN_CHUNK = 200;

/**
 * Server scope for /explore: small payload + fast Vercel function (national catalog was timing out).
 * Matches Maharashtra + “Mumbai” cities + cinema-style media (see exploreFilterDefaults).
 * Explore filters only see this slice until you add a separate “full catalog” fetch/API.
 */
function exploreMediaQuery() {
    return supabaseAdmin
        .from('media')
        .select(MEDIA_COLUMNS)
        .or('status.eq.active,status.is.null')
        .ilike('state', '%maharashtra%')
        .ilike('city', '%mumbai%')
        .ilike('media_type', '%cinema%')
        .order('id', { ascending: true });
}

export default async function ExplorePage() {
    const userPromise = getCurrentUser();

    // 1. Catalog: parallel windows; query is scoped to Mumbai cinema only.
    const { data: hoardings, error } = await fetchAllSupabasePagesParallel(
        (from, to) => exploreMediaQuery().range(from, to),
        1000,
        4
    );

    const variants = [];
    let variantsError = null;
    if (!error && Array.isArray(hoardings) && hoardings.length > 0) {
        const mediaIds = hoardings.map((h) => h.id);
        const chunks = [];
        for (let i = 0; i < mediaIds.length; i += VARIANT_IN_CHUNK) {
            chunks.push(mediaIds.slice(i, i + VARIANT_IN_CHUNK));
        }
        const settled = await Promise.all(
            chunks.map((chunk) =>
                supabaseAdmin
                    .from('media_variants')
                    .select(VARIANT_COLUMNS)
                    .in('media_id', chunk)
                    .order('display_order', { ascending: true })
            )
        );
        for (const { data: rows, error: ve } of settled) {
            if (ve) {
                variantsError = ve;
                break;
            }
            variants.push(...(rows || []));
        }
    }

    const user = await userPromise;

    if (error || variantsError) {
        console.error("Supabase Error:", error || variantsError);
        return <div className="p-10 text-red-500">Error loading data.</div>;
    }

    const variantsByMedia = {};
    (variants || []).forEach((v) => {
        if (!variantsByMedia[v.media_id]) variantsByMedia[v.media_id] = [];
        variantsByMedia[v.media_id].push(v);
    });
    for (const id of Object.keys(variantsByMedia)) {
        variantsByMedia[id].sort(
            (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
        );
    }

    // 3. Format data (parse JSON strings, ensure numbers, map to camelCase used in explore components)
    const formattedHoardings = (hoardings || []).map(h => {
        const mediaVariants = variantsByMedia[h.id] || [];
        const firstVariant = mediaVariants[0] || null;
        return {
            ...h,
            // Identity / vendor / pricing
            vendorId: h.vendor_id,
            rate: firstVariant?.rate ?? h.monthly_rental,
            mediaType: h.media_type,
            imageUrls: h.media || [],

            // Geometry / location
            latitude: h.latitude != null ? parseFloat(h.latitude) : null,
            longitude: h.longitude != null ? parseFloat(h.longitude) : null,
            roadName: h.road_name,

            // Screen / display details
            screenSize: h.screen_size,
            screenPlacement: h.screen_placement,
            displayFormat: h.display_format,
            width: h.width,
            height: h.height,

            // Visibility / meta
            trafficType: h.traffic_type,
            landmark: h.landmark,
            visibility: h.visibility,
            dwellTime: h.dwell_time,

            // Flatten vendor name if needed
            vendorName: h.vendor?.name,
            title: h.title,
            displayTitle: [h.title, h.landmark, h.address, h.zone].find((x) => x && String(x).trim()) || `Site #${h.id}`,
            variants: mediaVariants,
            selectedVariantId: firstVariant?.id || null,
        };
    });

    return <ExploreView hoardings={formattedHoardings} user={user} />;
}
