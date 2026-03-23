import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';

export async function PUT(req, { params }) {
    try {
        const { variantId } = await params;
        const body = await req.json();
        const pricing = Array.isArray(body?.pricing) ? body.pricing : [];

        const { data: variant, error: variantErr } = await supabaseAdmin
            .from('media_variants')
            .select('id, media_id')
            .eq('id', variantId)
            .single();
        if (variantErr) throw variantErr;

        await supabaseAdmin.from('media_variant_pricing').delete().eq('media_variant_id', variantId);

        const rows = pricing
            .filter((p) => p?.price_name && p?.duration && p?.price)
            .map((p, i) => ({
                media_variant_id: variantId,
                media_id: variant.media_id,
                price_name: p.price_name,
                price: parseInt(p.price),
                duration: p.duration,
                display_order: Number.isFinite(Number(p.display_order)) ? Number(p.display_order) : i,
                is_active: p.is_active !== false,
            }));

        if (rows.length > 0) {
            const { error } = await supabaseAdmin.from('media_variant_pricing').insert(rows);
            if (error) throw error;
        }

        return NextResponse.json({ success: true, count: rows.length });
    } catch (error) {
        console.error('PUT variant pricing Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to save variant pricing' }, { status: 500 });
    }
}

