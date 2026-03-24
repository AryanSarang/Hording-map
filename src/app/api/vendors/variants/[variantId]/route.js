import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/authServer';

function normalizeVariant(input) {
    const out = {};
    if (input.variantTitle !== undefined) out.variant_title = input.variantTitle || null;
    if (input.option1Value !== undefined) {
        const option1 = String(input.option1Value || '').trim();
        if (option1) out.option1_value = option1;
    }
    if (input.option2Value !== undefined) out.option2_value = String(input.option2Value || '').trim() || null;
    if (input.option3Value !== undefined) out.option3_value = input.option3Value || null;
    if (input.customFields !== undefined) out.custom_fields = (input.customFields && typeof input.customFields === 'object') ? input.customFields : {};
    if (input.audienceCategory !== undefined) out.audience_category = input.audienceCategory || null;
    if (input.seating !== undefined) out.seating = input.seating ? parseInt(input.seating) : null;
    if (input.cinemaFormat !== undefined) out.cinema_format = input.cinemaFormat || null;
    if (input.size !== undefined) out.size = input.size || null;
    if (input.rate !== undefined) out.rate = input.rate ? parseInt(input.rate) : null;
    if (input.details !== undefined) out.details = input.details || null;
    if (input.externalLinks !== undefined) out.external_links = input.externalLinks || null;
    if (input.photographs !== undefined) out.photographs = input.photographs || null;
    if (input.isActive !== undefined) out.is_active = !!input.isActive;
    if (input.displayOrder !== undefined) out.display_order = Number(input.displayOrder) || 0;
    out.updated_at = new Date().toISOString();
    return out;
}

export async function PUT(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { variantId } = await params;
        const { data: variantMeta, error: variantMetaErr } = await supabaseAdmin
            .from('media_variants')
            .select('id, media_id')
            .eq('id', variantId)
            .single();
        if (variantMetaErr || !variantMeta) return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 });

        const { data: ownedMedia, error: ownedErr } = await supabaseAdmin
            .from('media')
            .select('id')
            .eq('id', variantMeta.media_id)
            .eq('user_id', user.id)
            .single();
        if (ownedErr || !ownedMedia) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        const updates = normalizeVariant(body || {});
        if (Object.keys(updates).length === 1 && updates.updated_at) {
            return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
        }
        const { data, error } = await supabaseAdmin
            .from('media_variants')
            .update(updates)
            .eq('id', variantId)
            .select('*')
            .single();
        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('PUT variant Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to update variant' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { variantId } = await params;
        const { data: variantMeta, error: variantMetaErr } = await supabaseAdmin
            .from('media_variants')
            .select('id, media_id')
            .eq('id', variantId)
            .single();
        if (variantMetaErr || !variantMeta) return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 });

        const { data: ownedMedia, error: ownedErr } = await supabaseAdmin
            .from('media')
            .select('id')
            .eq('id', variantMeta.media_id)
            .eq('user_id', user.id)
            .single();
        if (ownedErr || !ownedMedia) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const { error } = await supabaseAdmin.from('media_variants').delete().eq('id', variantId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE variant Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to delete variant' }, { status: 500 });
    }
}

