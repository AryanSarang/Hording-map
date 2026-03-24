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
            'state', 'city', 'zone', 'locality', 'address', 'pincode', 'landmark',
            'latitude', 'longitude',
            'poc_name', 'poc_number', 'poc_email',
            'vendor_id', 'monthly_rental', 'vendor_rate', 'minimum_booking_duration',
            'media_type',
            'images',
            'screen_size', 'display_format', 'display_hours',
            'status',
            'pricing_rules',
            'option1_name', 'option2_name', 'option3_name',
            'option1_value', 'option2_value', 'option3_value',
            'variant_title',
            'cinema_name', 'screen_code', 'auditorium', 'audience_category', 'seating', 'cinema_format', 'size', 'rate',
            'variant.screen_code', 'variant.cinema_format', 'variant.audience_category', 'variant.seating',
            ...metaCols,
        ];

        const example = [
            'Maharashtra', 'Mumbai', 'Central', 'Churchgate', '123 MG Road', '400001', 'Near City Mall',
            '19.0760', '72.8777',
            'John Doe', '+91 9876543210', 'john@example.com',
            '<vendor_id_10chars>', '50000', '45000', '1 month',
            'Cinema Screen',
            'https://example.com/img1.jpg|https://example.com/img2.jpg',
            '10x6', '16:9', '8am-10pm',
            'active',
            'Season:Festive:1.2|Movie Type:Blockbuster:1.5',
            'Auditorium', '', '',
            '1', '', '', 'Auditorium 1',
            'PVR Forum Mall', 'PVR/FOR_1', '1', 'Gold', '180', '3D/J2K', '4096*2160', '2500',
            'PVR/FOR_1', '3D/J2K', 'Gold', '180',
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
