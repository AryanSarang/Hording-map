// app/api/vendors/hordings/import-template/route.js
// Download CSV template for hording import. Metafield columns = current user's metafields.
import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/authServer';
import { supabaseAdmin } from '../../../../../lib/supabase';

function escapeCsv(val) {
    if (val == null || val === '') return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export async function GET() {
    try {
        // Use current user's metafields for template columns (so template has metafields even with no media)
        const user = await getCurrentUser();
        let metas = [];
        if (user?.id) {
            const { data } = await supabaseAdmin
                .from('vendor_metafields')
                .select('key')
                .eq('user_id', user.id)
                .order('display_order');
            metas = data || [];
        }

        const metaCols = (metas || []).map((m) => `metafield.${m.key}`);

        const headers = [
            'city', 'state', 'address', 'landmark', 'pincode', 'zone',
            'latitude', 'longitude',
            'road_name',
            'poc_name', 'poc_number', 'poc_email',
            'vendor_id', 'monthly_rental', 'vendor_rate', 'payment_terms', 'minimum_booking_duration',
            'media_type', 'width', 'height',
            'images',
            'screen_size', 'screen_number', 'screen_placement', 'display_format',
            'slot_time', 'loop_time', 'display_hours',
            'traffic_type', 'visibility', 'dwell_time',
            'condition', 'previous_clientele', 'status',
            'option1_name', 'option2_name', 'option3_name',
            'cinema_name', 'screen_code', 'auditorium', 'audience_category', 'seating', 'cinema_format', 'size', 'rate',
            'pricing',
            ...metaCols,
        ];

        const example = [
            'Mumbai', 'Maharashtra', '123 MG Road', 'Near City Mall', '400001', 'Central',
            '19.0760', '72.8777',
            'MG Road',
            'John Doe', '+91 9876543210', 'john@example.com',
            '<vendor_id_10chars>', '50000', '45000', 'Net 30', '1 month',
            'Digital Screens', '20', '10',
            'https://example.com/img1.jpg|https://example.com/img2.jpg',
            '10x6', '1', 'Outdoor', '16:9',
            '10 sec', '2 min', '8am-10pm',
            'Pedestrian', 'Prime', '30 sec',
            'Good', 'Brand A, Brand B', 'active',
            'Screen Code', 'Auditorium', 'Language',
            'PVR Forum Mall', 'PVR/FOR_1', '1', 'Gold', '180', '3D/J2K', '4096*2160', '2500',
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
