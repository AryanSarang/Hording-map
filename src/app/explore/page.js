// app/explore/page.js
import ExploreView from './_components/ExploreView';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/authServer';
import { fetchAllSupabasePages } from '../../lib/fetchAllSupabasePages';

// Force the page to fetch fresh data on every visit
export const revalidate = 0;

/** Narrow columns to shrink payload vs select('*') — keep in sync with `media` table + explore components. */
const MEDIA_COLUMNS =
    'id,vendor_id,latitude,longitude,address,locality,landmark,city,zone,state,pincode,media_type,monthly_rental,media,screen_size,display_format,display_hours,title,option1_name,option2_name,option3_name,vendor:vendors(name)';

const VARIANT_COLUMNS =
    'id,media_id,rate,display_order,option1_value,option2_value,option3_value,variant_title,size,cinema_format,audience_category,seating';

export default async function ExplorePage() {
    // 1. Fetch all rows in pages (PostgREST max ~1000 per request); explicit columns reduce JSON size
    const [{ data: hoardings, error }, { data: variants, error: variantsError }] = await Promise.all([
        fetchAllSupabasePages((from, to) =>
            supabase
                .from('media')
                .select(MEDIA_COLUMNS)
                .order('id', { ascending: true })
                .range(from, to)
        ),
        fetchAllSupabasePages((from, to) =>
            supabase
                .from('media_variants')
                .select(VARIANT_COLUMNS)
                .order('id', { ascending: true })
                .range(from, to)
        ),
    ]);

    // 2. Get current user (may be null; explore is public)
    const user = await getCurrentUser();

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
            variants: mediaVariants,
            selectedVariantId: firstVariant?.id || null,
        };
    });

    return <ExploreView hoardings={formattedHoardings} user={user} />;
}
