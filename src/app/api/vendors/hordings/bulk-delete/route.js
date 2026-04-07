import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { isValidMediaId } from '../../../../../lib/genId10';
import { getCurrentUser } from '../../../../../lib/authServer';

/**
 * PostgREST sends `.in()` filters on the query string. Cloudflare returns 414 when the URI is too large
 * (common with hundreds of UUIDs). Keep each request under a safe URL size.
 */
const IN_CHUNK = 80;

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const inputIds = Array.isArray(body?.ids) ? body.ids : [];
        const ids = inputIds.map((id) => String(id).trim()).filter(isValidMediaId);

        if (ids.length === 0) {
            return NextResponse.json({ success: false, error: 'No valid media IDs provided' }, { status: 400 });
        }

        const ownedIdSet = new Set();
        for (const idSlice of chunk(ids, IN_CHUNK)) {
            const { data: ownedRows, error: ownedErr } = await supabaseAdmin
                .from('media')
                .select('id')
                .eq('user_id', user.id)
                .in('id', idSlice);
            if (ownedErr) throw ownedErr;
            for (const r of ownedRows || []) {
                if (r?.id) ownedIdSet.add(r.id);
            }
        }
        const ownedIds = Array.from(ownedIdSet);
        if (ownedIds.length === 0) {
            return NextResponse.json({ success: true, deleted: 0, requested: ids.length });
        }

        let deleted = 0;

        for (const idList of chunk(ownedIds, IN_CHUNK)) {
            const { error: e1 } = await supabaseAdmin.from('media_metafields').delete().in('media_id', idList);
            if (e1) throw e1;
            const { error: e2 } = await supabaseAdmin.from('media_variants').delete().in('media_id', idList);
            if (e2) throw e2;

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
