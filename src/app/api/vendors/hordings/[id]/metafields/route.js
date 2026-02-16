// app/api/vendors/hordings/[id]/metafields/route.js
// Get or save metafield values for a hording
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';

// GET - Fetch metafield values for a hording
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const hordingId = parseInt(id);
        if (isNaN(hordingId)) {
            return NextResponse.json({ success: false, error: 'Invalid hording ID' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('hording_metafields')
            .select('vendor_metafield_id, value')
            .eq('hording_id', hordingId);

        if (error) throw error;

        const values = {};
        (data || []).forEach((row) => {
            if (row.vendor_metafield_id) {
                values[row.vendor_metafield_id] = row.value ?? '';
            }
        });

        return NextResponse.json({ success: true, data: values }, { status: 200 });
    } catch (error) {
        console.error('GET hording metafields Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch metafields'
        }, { status: 500 });
    }
}

// PUT - Save metafield values for a hording
export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const hordingId = parseInt(id);
        if (isNaN(hordingId)) {
            return NextResponse.json({ success: false, error: 'Invalid hording ID' }, { status: 400 });
        }

        const body = await req.json();
        const metafields = body.metafields || body; // { vendorMetafieldId: value } or array

        const entries = Array.isArray(metafields)
            ? metafields
            : Object.entries(metafields).map(([vendorMetafieldId, value]) => ({
                vendorMetafieldId: parseInt(vendorMetafieldId),
                value: String(value ?? '')
            }));

        const toInsert = entries.filter(e => e.vendorMetafieldId);
        if (toInsert.length === 0) {
            await supabaseAdmin.from('hording_metafields').delete().eq('hording_id', hordingId);
            return NextResponse.json({ success: true, message: 'Metafields saved' }, { status: 200 });
        }

        const { data: vendorMetas } = await supabaseAdmin
            .from('vendor_metafields')
            .select('id, key')
            .in('id', toInsert.map(e => e.vendorMetafieldId));

        const keyMap = Object.fromEntries((vendorMetas || []).map(v => [v.id, v.key]));

        await supabaseAdmin.from('hording_metafields').delete().eq('hording_id', hordingId);

        const rows = toInsert.map(({ vendorMetafieldId, value }) => ({
            hording_id: hordingId,
            vendor_metafield_id: vendorMetafieldId,
            key: keyMap[vendorMetafieldId] || `mf_${vendorMetafieldId}`,
            value: value ?? '',
            value_type: 'string'
        }));

        const { error: insertError } = await supabaseAdmin
            .from('hording_metafields')
            .insert(rows);

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, message: 'Metafields saved' }, { status: 200 });
    } catch (error) {
        console.error('PUT hording metafields Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to save metafields'
        }, { status: 500 });
    }
}
