import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { isValidMediaId } from '../../../../../lib/genId10';

const BATCH_SIZE = 200;

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}));
        const inputIds = Array.isArray(body?.ids) ? body.ids : [];
        const ids = inputIds.map((id) => String(id).trim()).filter(isValidMediaId);

        if (ids.length === 0) {
            return NextResponse.json({ success: false, error: 'No valid media IDs provided' }, { status: 400 });
        }

        const idChunks = chunk(ids, BATCH_SIZE);
        let deleted = 0;

        for (const idList of idChunks) {
            await supabaseAdmin.from('media_variant_pricing').delete().in('media_id', idList);
            await supabaseAdmin.from('media_pricing').delete().in('media_id', idList);
            await supabaseAdmin.from('media_metafields').delete().in('media_id', idList);
            await supabaseAdmin.from('media_variants').delete().in('media_id', idList);

            const { data, error } = await supabaseAdmin
                .from('media')
                .delete()
                .in('id', idList)
                .select('id');

            if (error) throw error;
            deleted += (data || []).length;
        }

        return NextResponse.json({
            success: true,
            deleted,
            requested: ids.length,
        });
    } catch (error) {
        console.error('POST /api/vendors/hordings/bulk-delete Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Bulk delete failed',
        }, { status: 500 });
    }
}
