// app/api/vendors/hordings/[id]/metafields/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';
import { isValidMediaId } from '../../../../../../lib/genId10';
import { getCurrentUser } from '../../../../../../lib/authServer';

// GET - Fetch metafield values for a hording
export async function GET(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        if (!isValidMediaId(id)) {
            return NextResponse.json({ success: false, error: 'Invalid media ID' }, { status: 400 });
        }

        const { data: media, error: mediaErr } = await supabaseAdmin
            .from('media')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
        if (mediaErr || !media) return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });

        const { data, error } = await supabaseAdmin
            .from('media_metafields')
            .select('vendor_metafield_id, value')
            .eq('media_id', id);

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
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        if (!isValidMediaId(id)) {
            return NextResponse.json({ success: false, error: 'Invalid media ID' }, { status: 400 });
        }

        const { data: media, error: mediaErr } = await supabaseAdmin
            .from('media')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
        if (mediaErr || !media) return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });

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
            await supabaseAdmin.from('media_metafields').delete().eq('media_id', id);
            return NextResponse.json({ success: true, message: 'Metafields saved' }, { status: 200 });
        }

        const { data: vendorMetas } = await supabaseAdmin
            .from('vendor_metafields')
            .select('id, key')
            .in('id', toInsert.map(e => e.vendorMetafieldId));

        const keyMap = Object.fromEntries((vendorMetas || []).map(v => [v.id, v.key]));

        await supabaseAdmin.from('media_metafields').delete().eq('media_id', id);

        const rows = toInsert.map(({ vendorMetafieldId, value }) => ({
            media_id: id,
            vendor_metafield_id: vendorMetafieldId,
            key: keyMap[vendorMetafieldId] || `mf_${vendorMetafieldId}`,
            value: value ?? '',
            value_type: 'string'
        }));

        const { error: insertError } = await supabaseAdmin
            .from('media_metafields')
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
