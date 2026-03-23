import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';
import { isValidMediaId } from '../../../../../../lib/genId10';
import { getCurrentUser } from '../../../../../../lib/authServer';

function normalizeVariant(input, index = 0) {
    const option1 = String(input.option1Value ?? input.screenCode ?? '').trim() || 'Default';
    const option2 = String(input.option2Value ?? input.auditorium ?? '').trim() || 'Default';
    const option3 = String(input.option3Value ?? '').trim() || null;
    const customFields = input.customFields && typeof input.customFields === 'object' ? input.customFields : {};
    const rateRaw = input.rate ?? input.monthly_rental ?? input.price;
    const rate = rateRaw != null && String(rateRaw).trim() !== '' ? parseInt(rateRaw) : null;
    const seatingRaw = input.seating;
    const seating = seatingRaw != null && String(seatingRaw).trim() !== '' ? parseInt(seatingRaw) : null;
    return {
        variant_title: String(input.variantTitle ?? [option1, option2, option3].filter(Boolean).join(' / ')).trim(),
        option1_value: option1,
        option2_value: option2,
        option3_value: option3,
        audience_category: null,
        seating: null,
        cinema_format: null,
        size: null,
        rate: Number.isFinite(rate) ? rate : null,
        details: String(input.details ?? '').trim() || null,
        external_links: String(input.externalLinks ?? '').trim() || null,
        photographs: String(input.photographs ?? '').trim() || null,
        custom_fields: customFields,
        is_active: input.isActive !== false,
        display_order: Number.isFinite(Number(input.displayOrder)) ? Number(input.displayOrder) : index,
    };
}

export async function GET(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        if (!isValidMediaId(id)) return NextResponse.json({ success: false, error: 'Invalid media ID' }, { status: 400 });

        const { data: media, error: mediaErr } = await supabaseAdmin
            .from('media')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
        if (mediaErr || !media) return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });

        const { data: variants, error } = await supabaseAdmin
            .from('media_variants')
            .select('*')
            .eq('media_id', id)
            .order('display_order', { ascending: true });
        if (error) throw error;

        return NextResponse.json({ success: true, data: variants || [] });
    } catch (error) {
        console.error('GET variants Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch variants' }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        if (!isValidMediaId(id)) return NextResponse.json({ success: false, error: 'Invalid media ID' }, { status: 400 });
        const { data: media, error: mediaErr } = await supabaseAdmin
            .from('media')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
        if (mediaErr || !media) return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });
        const body = await req.json();
        const variantsInput = Array.isArray(body?.variants) ? body.variants : [body];
        const normalized = variantsInput.map((v, i) => normalizeVariant(v, i));
        const { data, error } = await supabaseAdmin
            .from('media_variants')
            .insert(normalized.map((v) => ({ ...v, media_id: id })))
            .select('*');
        if (error) throw error;
        return NextResponse.json({ success: true, data: data || [] }, { status: 201 });
    } catch (error) {
        console.error('POST variants Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to create variants' }, { status: 500 });
    }
}

