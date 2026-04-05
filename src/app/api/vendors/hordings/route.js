// app/api/vendors/hordings/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/authServer';
import { fetchAllSupabasePages } from '../../../../lib/fetchAllSupabasePages';

function normalizeVariant(input, index = 0) {
    const option1 = String(input.option1Value ?? input.screenCode ?? '').trim();
    const option2 = String(input.option2Value ?? input.auditorium ?? '').trim() || null;
    const option3 = String(input.option3Value ?? '').trim() || null;
    const rateRaw = input.rate ?? input.monthly_rental ?? input.price;
    const rate = rateRaw != null && String(rateRaw).trim() !== '' ? parseInt(rateRaw) : null;
    const customFields = input.customFields && typeof input.customFields === 'object' ? input.customFields : {};

    const variant = {
        variant_title: String(input.variantTitle ?? [option1, option2, option3].filter(Boolean).join(' / ')).trim() || null,
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
    return variant;
}

function normalizePricingRule(input, index = 0) {
    const ruleName = String(input.ruleName ?? '').trim();
    const optionLabel = String(input.optionLabel ?? '').trim();
    const multiplier = Number(input.multiplier);
    if (!ruleName || !optionLabel || !Number.isFinite(multiplier) || multiplier <= 0) return null;
    return {
        rule_name: ruleName,
        option_label: optionLabel,
        multiplier,
        display_order: Number.isFinite(Number(input.displayOrder)) ? Number(input.displayOrder) : index,
    };
}

async function saveVariantsForMedia(mediaId, variantsInput = []) {
    const variants = (Array.isArray(variantsInput) ? variantsInput : [])
        .map((v, i) => normalizeVariant(v, i));

    const normalized = variants.filter((v) => v.option1_value);
    if (normalized.length === 0) return [];

    // Dedupe guard for option pair inside one media
    const seen = new Set();
    for (const v of normalized) {
        const key = `${v.option1_value}__${v.option2_value || ''}__${v.option3_value || ''}`.toLowerCase();
        if (seen.has(key)) {
            throw new Error(`Duplicate variant pair: ${v.option1_value} + ${v.option2_value}${v.option3_value ? ` + ${v.option3_value}` : ''}`);
        }
        seen.add(key);
    }

    const toInsert = normalized.map((v) => ({ ...v, media_id: mediaId }));
    const { data: created, error } = await supabaseAdmin
        .from('media_variants')
        .insert(toInsert)
        .select('*');
    if (error) throw error;
    return created || [];
}

// GET - Fetch all vendor hordings (with optional filters)
export async function GET(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const vendorId = searchParams.get('vendorId');
        const status = searchParams.get('status');
        const city = searchParams.get('city');
        const mediaType = searchParams.get('mediaType');

        const buildQuery = () => {
            let q = supabaseAdmin
                .from('media')
                .select('*, vendor:vendors(id, name)')
                .eq('user_id', user.id);
            if (vendorId) q = q.eq('vendor_id', vendorId);
            if (status) q = q.eq('status', status);
            if (city) q = q.ilike('city', `%${city}%`);
            if (mediaType) q = q.eq('media_type', mediaType);
            return q.order('id', { ascending: false });
        };

        const { data: hordings, error } = await fetchAllSupabasePages((from, to) =>
            buildQuery().range(from, to)
        );

        if (error) throw error;

        const items = hordings || [];
        const mediaIds = items.map((m) => m.id);
        let variantCountByMedia = {};
        const IN_CHUNK = 120;
        if (mediaIds.length > 0) {
            for (let i = 0; i < mediaIds.length; i += IN_CHUNK) {
                const slice = mediaIds.slice(i, i + IN_CHUNK);
                const { data: variants, error: vErr } = await supabaseAdmin
                    .from('media_variants')
                    .select('id, media_id')
                    .in('media_id', slice);
                if (vErr) throw vErr;
                (variants || []).forEach((v) => {
                    variantCountByMedia[v.media_id] = (variantCountByMedia[v.media_id] || 0) + 1;
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: items.map((m) => ({
                ...m,
                variant_count: variantCountByMedia[m.id] || 0,
            })),
            count: items.length
        }, { status: 200 });

    } catch (error) {
        console.error('GET /api/vendor/hordings Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch hordings'
        }, { status: 500 });
    }
}

// POST - Create new hording
export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Validate required fields based on schema
        // Required: latitude, longitude, state, city, address, poc_name, poc_number, minimum_booking_duration, media_type
        const requiredFields = [
            'name', // mapped to display name or just identifier? Schema doesn't have 'name' for hording, usually generic desc/address?
            // Wait, schema has NO 'name' column for hordings table! 
            // It has: address, city, state, etc. 
            // Let's check GEMINI.md again... "Name: MG Road Banner"
            // Schema check: hordings table DOES NOT HAVE 'name' column. 
            // It might use 'address' or 'landmark' as the main identifier.
            // OR the schema provided in schema.txt is outdated/incomplete?
            // Let's assume for now we map 'name' to 'address' or 'landmark' if name column is missing,
            // or maybe I missed it in schema.txt? 
            // checking schema.txt again... 
            // hordings table: id, vendor_id, latitude, longitude... NO 'name' column.
            // It has 'road_name', 'landmark', 'address'.
            // I will assume for now we use 'landmark' or 'address' as the primary label.
            // BUT wait, looking at explore page it uses `h.name`? 
            // Let's look at hordings_complete view... 
            // View also doesn't show 'name'. 
            // This is a big mismatch. I will assume 'landmark' is the name for now, or just map it to 'address'.
            // Actually, let's keep 'name' in body but map it to something real or maybe it is there and I missed it?
            // No, strictly following schema.txt, there is no name.

            'city', 'state', 'address', 'latitude', 'longitude',
            'pocName', 'pocNumber', 'minimumBookingDuration', 'mediaType'
        ];

        // Map frontend camelCase to DB snake_case. Let DB generate id.
        const dbPayload = {
            vendor_id: (body.vendorId && String(body.vendorId).trim()) || null,

            city: body.city,
            state: body.state,
            address: body.address,
            landmark: body.landmark,
            locality: body.locality,
            pincode: body.pincode,
            zone: body.zone,

            latitude: parseFloat(body.latitude),
            longitude: parseFloat(body.longitude),

            poc_name: body.pocName,
            poc_number: body.pocNumber,
            poc_email: body.pocEmail,

            monthly_rental: body.rate ? parseInt(body.rate) : null,
            vendor_rate: body.ourRate ? parseInt(body.ourRate) : null,
            minimum_booking_duration: body.minimumBookingDuration,

            media_type: body.mediaType,
            media: body.imageUrls || [],

            screen_size: body.screenSize,
            display_format: body.displayFormat,
            display_hours: body.displayHours,

            status: body.status || 'active'
        };
        dbPayload.user_id = user.id;

        if (body.title !== undefined) dbPayload.title = body.title || null;
        const normalizedVariantsInput = (Array.isArray(body.variants) ? body.variants : [])
            .map((v, i) => normalizeVariant(v, i))
            .filter((v) => v.option1_value);
        dbPayload.has_variants = normalizedVariantsInput.length > 0;
        dbPayload.option1_name = dbPayload.has_variants ? (body.option1Name || 'Option 1') : null;
        dbPayload.option2_name = dbPayload.has_variants ? (body.option2Name || null) : null;
        dbPayload.option3_name = dbPayload.has_variants ? (body.option3Name || null) : null;

        // Basic validation
        for (const field of ['city', 'address', 'latitude', 'longitude', 'minimum_booking_duration', 'media_type']) {
            if (!dbPayload[field]) {
                return NextResponse.json({
                    success: false,
                    error: `Missing required field: ${field}`
                }, { status: 400 });
            }
        }

        const { data: newHording, error } = await supabaseAdmin
            .from('media')
            .insert([dbPayload])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({
                success: false,
                error: error.message || 'Failed to create hording',
                details: error.details
            }, { status: 400 });
        }

        const createdVariants = await saveVariantsForMedia(newHording.id, normalizedVariantsInput);
        const pricingRules = (Array.isArray(body.pricingRules) ? body.pricingRules : [])
            .map((r, i) => normalizePricingRule(r, i))
            .filter(Boolean);
        if (pricingRules.length > 0) {
            await supabaseAdmin
                .from('media_pricing_rules')
                .insert(pricingRules.map((r) => ({ ...r, media_id: newHording.id })));
        }

        // Save metafield values if provided
        const metafields = body.metafields;
        if (metafields && typeof metafields === 'object' && Object.keys(metafields).length > 0) {
            const entries = Object.entries(metafields)
                .filter(([k]) => k && parseInt(k));
            if (entries.length > 0) {
                const { data: vendorMetas } = await supabaseAdmin
                    .from('vendor_metafields')
                    .select('id, key')
                    .in('id', entries.map(([id]) => parseInt(id)));
                const keyMap = Object.fromEntries((vendorMetas || []).map(v => [v.id, v.key]));
                const rows = entries.map(([vendorMetafieldId, value]) => ({
                    media_id: newHording.id,
                    vendor_metafield_id: parseInt(vendorMetafieldId),
                    key: keyMap[vendorMetafieldId] || `mf_${vendorMetafieldId}`,
                    value: String(value ?? ''),
                    value_type: 'string'
                }));
                await supabaseAdmin.from('media_metafields').insert(rows);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                ...newHording,
                variants: createdVariants,
            },
            message: 'Hording created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/vendor/hordings Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to process request'
        }, { status: 500 });
    }
}
