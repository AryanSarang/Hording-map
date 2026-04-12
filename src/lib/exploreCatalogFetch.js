/**
 * Shared explore catalog loading (SSR page + /api/explore/catalog after Apply).
 */

import { fetchAllSupabasePagesParallel } from './fetchAllSupabasePages';

export const EXPLORE_MEDIA_COLUMNS =
    'id,vendor_id,latitude,longitude,address,locality,landmark,city,zone,state,pincode,media_type,monthly_rental,media,screen_size,display_format,display_hours,title,option1_name,option2_name,option3_name,vendor:vendors(name)';

export const EXPLORE_VARIANT_COLUMNS =
    'id,media_id,rate,display_order,option1_value,option2_value,option3_value,variant_title,size,cinema_format,audience_category,seating';

const VARIANT_IN_CHUNK = 200;

function sanitizeIlikeFragment(s) {
    return String(s ?? '')
        .replace(/%/g, '')
        .replace(/,/g, '')
        .trim();
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ states?: string[]; cities?: string[]; vendorIds?: string[]; mediaTypes?: string[] }} filters
 * Empty array on an axis = no restriction (full table on that axis).
 */
export function buildExploreMediaQuery(admin, filters) {
    const states = Array.isArray(filters.states) ? filters.states : [];
    const cities = Array.isArray(filters.cities) ? filters.cities : [];
    const vendorIds = Array.isArray(filters.vendorIds) ? filters.vendorIds.map(String) : [];
    const mediaTypes = Array.isArray(filters.mediaTypes) ? filters.mediaTypes : [];

    let q = admin
        .from('media')
        .select(EXPLORE_MEDIA_COLUMNS)
        .or('status.eq.active,status.is.null');

    if (states.length > 0) {
        const parts = states
            .map((s) => sanitizeIlikeFragment(s))
            .filter(Boolean)
            .map((s) => `state.ilike.%${s}%`);
        if (parts.length > 0) q = q.or(parts.join(','));
    }
    if (cities.length > 0) {
        const parts = cities
            .map((c) => sanitizeIlikeFragment(c))
            .filter(Boolean)
            .map((c) => `city.ilike.%${c}%`);
        if (parts.length > 0) q = q.or(parts.join(','));
    }
    if (vendorIds.length > 0) {
        q = q.in('vendor_id', vendorIds);
    }
    if (mediaTypes.length > 0) {
        q = q.in('media_type', mediaTypes);
    }

    return q.order('id', { ascending: true });
}

/**
 * Fast first paint: all active media in Maharashtra (not only “Mumbai” substring or cinema).
 * City names like Dombivli / Thane / Navi Mumbai often do not contain “mumbai”; media_type may
 * not include “cinema”. Client landing filters still default to Mumbai + cinema when that data exists.
 */
export function buildInitialExplorePageQuery(admin) {
    return admin
        .from('media')
        .select(EXPLORE_MEDIA_COLUMNS)
        .or('status.eq.active,status.is.null')
        .ilike('state', '%maharashtra%')
        .order('id', { ascending: true });
}

function formatHoardingRows(hoardings, variantsByMedia) {
    return (hoardings || []).map((h) => {
        const mediaVariants = variantsByMedia[h.id] || [];
        const firstVariant = mediaVariants[0] || null;
        return {
            ...h,
            vendorId: h.vendor_id,
            rate: firstVariant?.rate ?? h.monthly_rental,
            mediaType: h.media_type,
            imageUrls: h.media || [],
            latitude: h.latitude != null ? parseFloat(h.latitude) : null,
            longitude: h.longitude != null ? parseFloat(h.longitude) : null,
            roadName: h.road_name,
            screenSize: h.screen_size,
            screenPlacement: h.screen_placement,
            displayFormat: h.display_format,
            width: h.width,
            height: h.height,
            trafficType: h.traffic_type,
            landmark: h.landmark,
            visibility: h.visibility,
            dwellTime: h.dwell_time,
            vendorName: h.vendor?.name,
            title: h.title,
            displayTitle:
                [h.title, h.landmark, h.address, h.zone].find((x) => x && String(x).trim()) ||
                `Site #${h.id}`,
            variants: mediaVariants,
            selectedVariantId: firstVariant?.id || null,
        };
    });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('@supabase/supabase-js').PostgrestFilterBuilder} mediaQuery - query before .range()
 */
export async function fetchVariantsAndFormat(admin, hoardings) {
    const variants = [];
    let variantsError = null;
    if (Array.isArray(hoardings) && hoardings.length > 0) {
        const mediaIds = hoardings.map((h) => h.id);
        const chunks = [];
        for (let i = 0; i < mediaIds.length; i += VARIANT_IN_CHUNK) {
            chunks.push(mediaIds.slice(i, i + VARIANT_IN_CHUNK));
        }
        const settled = await Promise.all(
            chunks.map((chunk) =>
                admin
                    .from('media_variants')
                    .select(EXPLORE_VARIANT_COLUMNS)
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

    if (variantsError) {
        console.error('explore: media_variants fetch failed', variantsError);
        return {
            hoardings: formatHoardingRows(hoardings, {}),
            error: null,
        };
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

    return {
        hoardings: formatHoardingRows(hoardings, variantsByMedia),
        error: null,
    };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {() => import('@supabase/supabase-js').PostgrestFilterBuilder} mediaQueryFactory
 *        Must return a **new** query each call — PostgREST builders mutate; reusing one instance
 *        across parallel `.range()` calls races and yields empty/wrong rows.
 */
export async function fetchExploreCatalogFormatted(admin, mediaQueryFactory) {
    const { data: hoardings, error } = await fetchAllSupabasePagesParallel(
        (from, to) => mediaQueryFactory().range(from, to),
        1000,
        4
    );
    if (error) {
        return { hoardings: [], error };
    }
    return fetchVariantsAndFormat(admin, hoardings || []);
}
