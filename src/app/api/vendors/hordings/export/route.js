// app/api/vendors/hordings/export/route.js
// Bulk-fetches data (no per-row queries) and streams CSV so large exports don't timeout.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { isValidMediaId } from '../../../../../lib/genId10';
import { getCurrentUser } from '../../../../../lib/authServer';

const BATCH_SIZE = 100; // max ids per .in() query to avoid URL/query size limits

function escapeCsv(val) {
    if (val == null || val === '') return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function imagesToPipeString(media) {
    if (Array.isArray(media)) return media.join('|');
    if (typeof media === 'string') {
        try {
            const parsed = JSON.parse(media);
            return Array.isArray(parsed) ? parsed.join('|') : media;
        } catch {
            return media;
        }
    }
    return '';
}

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// Shared export logic: mediaIds = [] means "all"
async function runExport(mediaIds, userId) {
    // 1. Fetch media: explicit limit for "all" (Supabase default is often 1000)
    let query = supabaseAdmin.from('media').select('*').eq('user_id', userId);
    if (mediaIds.length > 0) {
        query = query.in('id', mediaIds);
    } else {
        query = query.range(0, 99999); // fetch up to 100k when exporting "all" (avoids default 1000 limit)
    }
    const { data: list, error: mediaError } = await query.order('created_at', { ascending: false });

    if (mediaError) throw mediaError;
    const rows = list || [];

    // 2. Vendor names – one query
    const vendorIds = [...new Set(rows.map((h) => h.vendor_id).filter(Boolean))];
    let vendorMap = {};
    if (vendorIds.length > 0) {
        const { data: vendors } = await supabaseAdmin.from('vendors').select('id, name').in('id', vendorIds);
        vendorMap = Object.fromEntries((vendors || []).map((v) => [v.id, v.name || '']));
    }

    const ids = rows.map((r) => r.id);

    // 3. Bulk fetch all metafields (batched)
    const metafieldsByMedia = {};
    if (ids.length > 0) {
        const idChunks = chunk(ids, BATCH_SIZE);
        for (const idList of idChunks) {
            const { data: metaRows } = await supabaseAdmin
                .from('media_metafields')
                .select('media_id, key, value')
                .in('media_id', idList);
            for (const m of metaRows || []) {
                if (!metafieldsByMedia[m.media_id]) metafieldsByMedia[m.media_id] = {};
                metafieldsByMedia[m.media_id][m.key] = m.value;
            }
        }
    }

    // 4. Fetch variants
    const variantsByMedia = {};
    if (ids.length > 0) {
        const idChunks = chunk(ids, BATCH_SIZE);
        for (const idList of idChunks) {
            const { data: variantRows } = await supabaseAdmin
                .from('media_variants')
                .select('*')
                .in('media_id', idList)
                .order('display_order', { ascending: true });
            for (const v of variantRows || []) {
                if (!variantsByMedia[v.media_id]) variantsByMedia[v.media_id] = [];
                variantsByMedia[v.media_id].push(v);
            }
        }
    }

    const allMetaKeys = [
        ...new Set(
            Object.values(metafieldsByMedia).flatMap((m) => Object.keys(m))
        ),
    ].sort();

    const baseHeaders = [
        'id', 'vendor_id', 'vendor_name',
        'city', 'state', 'address', 'landmark', 'pincode', 'zone',
        'latitude', 'longitude',
        'road_name',
        'poc_name', 'poc_number', 'poc_email',
        'monthly_rental', 'vendor_rate', 'payment_terms', 'minimum_booking_duration',
        'media_type', 'width', 'height',
        'images',
        'screen_size', 'screen_number', 'screen_placement', 'display_format',
        'slot_time', 'loop_time', 'display_hours',
        'traffic_type', 'visibility', 'dwell_time',
        'condition', 'previous_clientele', 'status',
        'variant_id', 'option1_name', 'option2_name', 'option3_name', 'option1_value', 'option2_value', 'option3_value', 'variant_title',
        'audience_category', 'seating', 'cinema_format', 'size', 'variant_rate',
    ];
    const metaHeaders = allMetaKeys.map((k) => `metafield.${k}`);
    const headers = [...baseHeaders, ...metaHeaders];
    const headerLine = headers.map(escapeCsv).join(',') + '\n';

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            controller.enqueue(encoder.encode(headerLine));
            for (const h of rows) {
                const metas = metafieldsByMedia[h.id] || {};
                const vendorName = vendorMap[h.vendor_id] ?? '';
                const images = imagesToPipeString(h.media);
                const mediaVariants = variantsByMedia[h.id] || [];
                const exportRows = mediaVariants.length > 0 ? mediaVariants : [null];

                for (const v of exportRows) {
                    const base = [
                        h.id,
                        h.vendor_id ?? '',
                        vendorName,
                        h.city ?? '',
                        h.state ?? '',
                        h.address ?? '',
                        h.landmark ?? '',
                        h.pincode ?? '',
                        h.zone ?? '',
                        h.latitude ?? '',
                        h.longitude ?? '',
                        h.road_name ?? '',
                        h.poc_name ?? '',
                        h.poc_number ?? '',
                        h.poc_email ?? '',
                        h.monthly_rental ?? '',
                        h.vendor_rate ?? '',
                        h.payment_terms ?? '',
                        h.minimum_booking_duration ?? '',
                        h.media_type ?? '',
                        h.width ?? '',
                        h.height ?? '',
                        images,
                        h.screen_size ?? '',
                        h.screen_number ?? '',
                        h.screen_placement ?? '',
                        h.display_format ?? '',
                        h.slot_time ?? '',
                        h.loop_time ?? '',
                        h.display_hours ?? '',
                        h.traffic_type ?? '',
                        h.visibility ?? '',
                        h.dwell_time ?? '',
                        h.condition ?? '',
                        h.previous_clientele ?? '',
                        h.status ?? '',
                        v?.id ?? '',
                        h.option1_name ?? '',
                        h.option2_name ?? '',
                        h.option3_name ?? '',
                        v?.option1_value ?? '',
                        v?.option2_value ?? '',
                        v?.option3_value ?? '',
                        v?.variant_title ?? '',
                        v?.audience_category ?? '',
                        v?.seating ?? '',
                        v?.cinema_format ?? '',
                        v?.size ?? '',
                        v?.rate ?? '',
                    ];
                    const metaVals = allMetaKeys.map((k) => metas[k] ?? '');
                    const rowLine = [...base, ...metaVals].map(escapeCsv).join(',') + '\n';
                    controller.enqueue(encoder.encode(rowLine));
                }
            }
            controller.close();
        },
    });

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="media-export-${new Date().toISOString().slice(0, 10)}.csv"`,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
    });
}

function exportError(message) {
    return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export async function GET(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const idsParam = searchParams.get('ids');

        let mediaIds = [];
        if (idsParam?.trim()) {
            // GET with ?ids=... can hit URL length limit (~2–8KB) with many UUIDs
            mediaIds = idsParam.split(',').map((id) => id.trim()).filter(isValidMediaId);
        }

        return await runExport(mediaIds, user.id);
    } catch (error) {
        console.error('GET /api/vendors/hordings/export Error:', error);
        const message = error?.message || error?.error_description || String(error) || 'Export failed';
        return exportError(message);
    }
}

// POST: send ids in body to avoid URL length limit when exporting many selected items
export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        let mediaIds = [];
        try {
            const body = await req.json();
            if (Array.isArray(body?.ids)) {
                mediaIds = body.ids.map((id) => String(id).trim()).filter(isValidMediaId);
            }
        } catch {
            // no body or invalid JSON = export all
        }
        return await runExport(mediaIds, user.id);
    } catch (error) {
        console.error('POST /api/vendors/hordings/export Error:', error);
        const message = error?.message || error?.error_description || String(error) || 'Export failed';
        return exportError(message);
    }
}
