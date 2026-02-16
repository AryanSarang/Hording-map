// app/api/vendors/hordings/export/route.js
// Export hordings to CSV with all fields (vendor, pricing, metafields, images)
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

const MEDIA_TYPES = ['Digital Screens', 'Hoarding', 'Bus Shelter', 'Wall Wrap', 'Kiosk', 'Transit', 'Neon Sign', 'Other'];

function escapeCsv(val) {
    if (val == null || val === '') return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const idsParam = searchParams.get('ids'); // comma-separated, or empty = all

        let hordingIds = [];
        if (idsParam?.trim()) {
            hordingIds = idsParam.split(',').map((id) => parseInt(id.trim())).filter((n) => !isNaN(n));
        }

        let query = supabaseAdmin.from('hordings').select('*, vendor:vendors(id, name)');
        if (hordingIds.length > 0) {
            query = query.in('id', hordingIds);
        }
        const { data: hordings, error } = await query.order('id', { ascending: false });

        if (error) throw error;
        const list = hordings || [];

        // Fetch pricing and metafields for each
        const withPricing = [];
        const withMetafields = [];

        for (const h of list) {
            const [pRes, mRes] = await Promise.all([
                supabaseAdmin.from('hording_pricing').select('price_name, price, duration').eq('hording_id', h.id).order('display_order'),
                supabaseAdmin.from('hording_metafields').select('key, value').eq('hording_id', h.id),
            ]);
            withPricing.push(pRes.data || []);
            withMetafields.push(Object.fromEntries((mRes.data || []).map((r) => [r.key, r.value])));
        }

        // Get all vendor_metafield keys for headers (from first hording's metafields or common set)
        const allMetaKeys = [...new Set(withMetafields.flatMap((m) => Object.keys(m)))].sort();

        // Build CSV headers
        const baseHeaders = [
            'id', 'vendor_id', 'vendor_name',
            'city', 'state', 'address', 'landmark', 'pincode', 'zone',
            'latitude', 'longitude',
            'road_name', 'road_from', 'road_to', 'position_wrt_road',
            'poc_name', 'poc_number', 'poc_email',
            'monthly_rental', 'vendor_rate', 'payment_terms', 'minimum_booking_duration',
            'media_type', 'hording_type', 'width', 'height',
            'images', // pipe-separated URLs
            'screen_size', 'screen_number', 'screen_placement', 'display_format',
            'slot_time', 'loop_time', 'display_hours',
            'traffic_type', 'visibility', 'dwell_time',
            'condition', 'previous_clientele', 'compliance', 'status',
            'pricing', // JSON array string: [{"price_name":"1 Week","price":5000,"duration":"1 week"}]
        ];
        const metaHeaders = allMetaKeys.map((k) => `metafield.${k}`);
        const headers = [...baseHeaders, ...metaHeaders];

        const rows = list.map((h, i) => {
            const pricing = withPricing[i];
            const metas = withMetafields[i];
            const vendorName = h.vendor?.name ?? '';
            const images = Array.isArray(h.media) ? h.media.join('|') : (h.media || '');
            const pricingStr = JSON.stringify(
                pricing.map((p) => ({
                    price_name: p.price_name,
                    price: p.price,
                    duration: p.duration,
                }))
            );

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
                h.road_from ?? '',
                h.road_to ?? '',
                h.position_wrt_road ?? '',
                h.poc_name ?? '',
                h.poc_number ?? '',
                h.poc_email ?? '',
                h.monthly_rental ?? '',
                h.vendor_rate ?? '',
                h.payment_terms ?? '',
                h.minimum_booking_duration ?? '',
                h.media_type ?? '',
                h.hording_type ?? '',
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
                h.compliance ? 'true' : 'false',
                h.status ?? '',
                pricingStr,
            ];
            const metaVals = allMetaKeys.map((k) => metas[k] ?? '');
            return [...base, ...metaVals].map(escapeCsv);
        });

        const csvLines = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))];
        const csv = csvLines.join('\n');

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="hordings-export-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error) {
        console.error('GET /api/vendors/hordings/export Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Export failed',
        }, { status: 500 });
    }
}
