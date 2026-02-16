// app/api/vendors/hordings/import-template/route.js
// Download CSV template for hording import
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

function escapeCsv(val) {
    if (val == null || val === '') return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export async function GET() {
    try {
        const { data: metas } = await supabaseAdmin
            .from('vendor_metafields')
            .select('key')
            .eq('vendor_id', 1)
            .order('display_order');

        const metaCols = (metas || []).map((m) => `metafield.${m.key}`);

        const headers = [
            'city', 'state', 'address', 'landmark', 'pincode', 'zone',
            'latitude', 'longitude',
            'road_name', 'road_from', 'road_to', 'position_wrt_road',
            'poc_name', 'poc_number', 'poc_email',
            'vendor_id', 'monthly_rental', 'vendor_rate', 'payment_terms', 'minimum_booking_duration',
            'media_type', 'hording_type', 'width', 'height',
            'images',
            'screen_size', 'screen_number', 'screen_placement', 'display_format',
            'slot_time', 'loop_time', 'display_hours',
            'traffic_type', 'visibility', 'dwell_time',
            'condition', 'previous_clientele', 'compliance', 'status',
            'pricing',
            ...metaCols,
        ];

        const example = [
            'Mumbai', 'Maharashtra', '123 MG Road', 'Near City Mall', '400001', 'Central',
            '19.0760', '72.8777',
            'MG Road', 'Gateway', 'Marine Drive', 'Left',
            'John Doe', '+91 9876543210', 'john@example.com',
            '1', '50000', '45000', 'Net 30', '1 month',
            'Hoarding', 'LED', '20', '10',
            'https://example.com/img1.jpg|https://example.com/img2.jpg',
            '10x6', '1', 'Outdoor', '16:9',
            '10 sec', '2 min', '8am-10pm',
            'Pedestrian', 'Prime', '30 sec',
            'Good', 'Brand A, Brand B', 'true', 'active',
            '[{"price_name":"1 Week","price":15000,"duration":"1 week"},{"price_name":"1 Month","price":50000,"duration":"1 month"}]',
            ...(metaCols.map(() => '')),
        ];

        const csv = [headers.map(escapeCsv).join(','), example.map(escapeCsv).join(',')].join('\n');

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="hordings-import-template.csv"',
            },
        });
    } catch (error) {
        console.error('GET import-template Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
