/**
 * Shared explore catalog loading (SSR page + /api/explore/catalog after Apply).
 */

import { fetchAllSupabasePagesParallel } from './fetchAllSupabasePages';
import {
    coerceLocationStringList,
    hoardingMatchesCityFilter,
    hoardingMatchesStateFilter,
} from './exploreFilterLocation';
import { resolveIndianStateRow, isIndianCityInCscState } from './indiaGeoOptions';

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
 * @param {{ states?: string[]; cities?: string[]; mediaTypes?: string[] }} filters
 * Empty array on an axis = no restriction (full table on that axis).
 *
 * When **states** are set, only state (+ status + media type) is narrowed in SQL; **cities** are
 * applied in `fetchExploreCatalogFormatted` so PostgREST never OR-merges state vs city in a way
 * that can return rows outside the selected state(s).
 */
export function buildExploreMediaQuery(admin, filters) {
    const states = coerceLocationStringList(filters?.states);
    const cities = coerceLocationStringList(filters?.cities);
    const mediaTypes = Array.isArray(filters?.mediaTypes) ? filters.mediaTypes : [];

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
    } else if (cities.length > 0) {
        const parts = cities
            .map((c) => sanitizeIlikeFragment(c))
            .filter(Boolean)
            .map((c) => `city.ilike.%${c}%`);
        if (parts.length > 0) q = q.or(parts.join(','));
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

function formatHoardingRows(hoardings, variantsByMedia, metafieldsByMediaId = new Map()) {
    return (hoardings || []).map((h) => {
        const mediaVariants = variantsByMedia[h.id] || [];
        const firstVariant = mediaVariants[0] || null;
        const mfObj = metafieldsByMediaId.get(h.id) || {};
        return {
            ...h,
            metafields: mfObj,
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
async function loadMetafieldsForMedia(admin, hoardingRows, vendorMetafieldIds) {
    const map = new Map();
    if (!hoardingRows?.length || !vendorMetafieldIds?.length) return map;
    const ids = [
        ...new Set(
            vendorMetafieldIds
                .map((x) => Number(x))
                .filter((n) => Number.isFinite(n) && n > 0)
        ),
    ];
    if (!ids.length) return map;
    const mediaIds = hoardingRows.map((h) => h.id);
    // Keep `in()` URL payload small enough to fit Node 22 undici header limits
    // (~8 KiB). With 10-char media IDs that's ≈ 130 per chunk; stay well under.
    const CHUNK = 100;
    for (let i = 0; i < mediaIds.length; i += CHUNK) {
        const chunk = mediaIds.slice(i, i + CHUNK);
        const { data, error } = await admin
            .from('media_metafields')
            .select('media_id, vendor_metafield_id, value')
            .in('media_id', chunk)
            .in('vendor_metafield_id', ids);
        if (error) {
            console.error('explore: media_metafields', error);
            continue;
        }
        for (const row of data || []) {
            const mid = row.media_id;
            const vid = row.vendor_metafield_id;
            if (!map.has(mid)) map.set(mid, {});
            const o = map.get(mid);
            o[String(vid)] = row.value != null ? String(row.value) : '';
        }
    }
    return map;
}

export async function fetchVariantsAndFormat(admin, hoardings, metafieldsByMediaId = new Map()) {
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
            hoardings: formatHoardingRows(hoardings, {}, metafieldsByMediaId),
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
        hoardings: formatHoardingRows(hoardings, variantsByMedia, metafieldsByMediaId),
        error: null,
    };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {() => import('@supabase/supabase-js').PostgrestFilterBuilder} mediaQueryFactory
 *        Must return a **new** query each call — PostgREST builders mutate; reusing one instance
 *        across parallel `.range()` calls races and yields empty/wrong rows.
 */
/**
 * @param {string[]} exploreMetafieldIds - vendor_metafields.id values flagged for explore filters
 * @param {{ states?: string[]; cities?: string[] } | null} locFilters - AND state/city in memory (required when states+cities used together)
 */
export async function fetchExploreCatalogFormatted(
    admin,
    mediaQueryFactory,
    exploreMetafieldIds = [],
    locFilters = null
) {
    const { data: hoardings, error } = await fetchAllSupabasePagesParallel(
        (from, to) => mediaQueryFactory().range(from, to),
        1000,
        4
    );
    if (error) {
        return { hoardings: [], error };
    }
    let rows = hoardings || [];
    const lf = locFilters && typeof locFilters === 'object' ? locFilters : {};
    const st = coerceLocationStringList(lf.states);
    const ct = coerceLocationStringList(lf.cities);
    if (st.length > 0) {
        rows = rows.filter((h) => hoardingMatchesStateFilter(st, h.state));
    }
    if (ct.length > 0) {
        rows = rows.filter((h) => hoardingMatchesCityFilter(ct, h.city));
    }
    if (st.length > 0) {
        rows = rows.filter((h) => {
            if (!h.city) return true;
            const r = resolveIndianStateRow(h.state);
            if (!r) return true;
            return isIndianCityInCscState(h.state, h.city);
        });
    }
    const mfMap = await loadMetafieldsForMedia(admin, rows, exploreMetafieldIds);
    return fetchVariantsAndFormat(admin, rows, mfMap);
}
