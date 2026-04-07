// app/api/vendors/hordings/[id]/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { isValidMediaId } from '../../../../../lib/genId10';
import { getCurrentUser } from '../../../../../lib/authServer';

// Helper to map DB snake_case to Frontend camelCase
function mapToFrontend(h) {
    if (!h) return null;
    return {
        id: h.id,
        vendorId: h.vendor_id,

        city: h.city,
        state: h.state,
        address: h.address,
        landmark: h.landmark,
        locality: h.locality,
        pincode: h.pincode,
        zone: h.zone,
        latitude: h.latitude,
        longitude: h.longitude,

        pocName: h.poc_name,
        pocNumber: h.poc_number,
        pocEmail: h.poc_email,

        rate: h.monthly_rental,
        ourRate: h.vendor_rate,
        minimumBookingDuration: h.minimum_booking_duration,

        mediaType: h.media_type,
        imageUrls: Array.isArray(h.media) ? h.media.join('\n') : (h.media || ''),

        screenSize: h.screen_size,
        displayFormat: h.display_format,
        displayHours: h.display_hours,
        status: h.status,
        title: h.title,
        hasVariants: h.has_variants,
        option1Name: h.option1_name || '',
        option2Name: h.option2_name || '',
        option3Name: h.option3_name || '',
    };
}

function mapVariantToFrontend(v) {
    return {
        id: v.id,
        variantTitle: v.variant_title,
        option1Value: v.option1_value,
        option2Value: v.option2_value,
        option3Value: v.option3_value,
        audienceCategory: v.audience_category,
        seating: v.seating,
        cinemaFormat: v.cinema_format,
        size: v.size,
        customFields: v.custom_fields || {},
        rate: v.rate,
        details: v.details,
        externalLinks: v.external_links,
        photographs: v.photographs,
        isActive: v.is_active,
        displayOrder: v.display_order,
    };
}

function normalizeVariant(input, index = 0) {
    const option1 = String(input.option1Value ?? input.screenCode ?? '').trim();
    const option2 = String(input.option2Value ?? input.auditorium ?? '').trim() || null;
    const option3 = String(input.option3Value ?? '').trim() || null;
    const rateRaw = input.rate ?? input.monthly_rental ?? input.price;
    const rate = rateRaw != null && String(rateRaw).trim() !== '' ? parseInt(rateRaw) : null;
    const customFields = input.customFields && typeof input.customFields === 'object' ? input.customFields : {};
    return {
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

// GET - Fetch a single hording by ID (including metafield values)
export async function GET(req, { params }) {
    const resolved = await params;
    const { id } = resolved;
    if (!isValidMediaId(id)) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('media')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error) throw error;
        if (!data) return NextResponse.json({ success: false, error: 'Hording not found' }, { status: 404 });

        const [{ data: metafieldRows }, { data: variants }, { data: pricingRules }] = await Promise.all([
            supabaseAdmin.from('media_metafields').select('vendor_metafield_id, value').eq('media_id', data.id),
            supabaseAdmin.from('media_variants').select('*').eq('media_id', data.id).order('display_order'),
            supabaseAdmin.from('media_pricing_rules').select('*').eq('media_id', data.id).order('display_order'),
        ]);

        const metafields = {};
        (metafieldRows || []).forEach((row) => {
            if (row.vendor_metafield_id) metafields[row.vendor_metafield_id] = row.value ?? '';
        });

        return NextResponse.json({
            success: true,
            data: {
                ...mapToFrontend(data),
                metafields,
                variants: (variants || []).map((v) => ({
                    ...mapVariantToFrontend(v),
                })),
                pricingRules: (pricingRules || []).map((r) => ({
                    id: r.id,
                    ruleName: r.rule_name,
                    optionLabel: r.option_label,
                    multiplier: r.multiplier,
                    displayOrder: r.display_order,
                })),
            }
        }, { status: 200 });

    } catch (error) {
        console.error(`GET /api/vendors/hordings/${id} Error:`, error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch hording' }, { status: 500 });
    }
}


// PUT - Update a hording (and metafield values)
export async function PUT(req, { params }) {
    const resolved = await params;
    const { id } = resolved;
    if (!isValidMediaId(id)) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        if (Object.keys(body).length === 0) {
            return NextResponse.json({ success: false, error: 'Missing request body' }, { status: 400 });
        }

        // Map Frontend camelCase -> DB snake_case
        const dbPayload = {};

        if (body.vendorId !== undefined) {
            const vid = (body.vendorId && String(body.vendorId).trim()) || null;
            dbPayload.vendor_id = vid;
            if (vid) {
                const { data: owned, error: vErr } = await supabaseAdmin
                    .from('vendors')
                    .select('id')
                    .eq('id', vid)
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (vErr) throw vErr;
                if (!owned) {
                    return NextResponse.json({ success: false, error: 'Vendor does not belong to your account' }, { status: 400 });
                }
            }
        }
        if (body.city !== undefined) dbPayload.city = body.city;
        if (body.state !== undefined) dbPayload.state = body.state;
        if (body.address !== undefined) dbPayload.address = body.address;
        if (body.landmark !== undefined) dbPayload.landmark = body.landmark;
        if (body.locality !== undefined) dbPayload.locality = body.locality;
        if (body.pincode !== undefined) dbPayload.pincode = body.pincode;
        if (body.zone !== undefined) dbPayload.zone = body.zone;

        if (body.latitude !== undefined) dbPayload.latitude = parseFloat(body.latitude);
        if (body.longitude !== undefined) dbPayload.longitude = parseFloat(body.longitude);

        if (body.pocName !== undefined) dbPayload.poc_name = body.pocName;
        if (body.pocNumber !== undefined) dbPayload.poc_number = body.pocNumber;
        if (body.pocEmail !== undefined) dbPayload.poc_email = body.pocEmail;

        if (body.rate !== undefined) dbPayload.monthly_rental = body.rate ? parseInt(body.rate) : null;
        if (body.ourRate !== undefined) dbPayload.vendor_rate = body.ourRate ? parseInt(body.ourRate) : null;
        if (body.minimumBookingDuration !== undefined) dbPayload.minimum_booking_duration = body.minimumBookingDuration;

        if (body.mediaType !== undefined) dbPayload.media_type = body.mediaType;
        if (body.imageUrls !== undefined) {
            dbPayload.media = typeof body.imageUrls === 'string'
                ? body.imageUrls.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
                : (Array.isArray(body.imageUrls) ? body.imageUrls : []);
        }

        if (body.screenSize !== undefined) dbPayload.screen_size = body.screenSize;
        if (body.displayFormat !== undefined) dbPayload.display_format = body.displayFormat;
        if (body.displayHours !== undefined) dbPayload.display_hours = body.displayHours;
        if (body.status !== undefined) dbPayload.status = body.status;
        if (body.title !== undefined) dbPayload.title = body.title || null;
        if (body.hasVariants !== undefined) dbPayload.has_variants = !!body.hasVariants;
        if (body.option1Name !== undefined) dbPayload.option1_name = body.option1Name || 'Option 1';
        if (body.option2Name !== undefined) dbPayload.option2_name = body.option2Name || null;
        if (body.option3Name !== undefined) dbPayload.option3_name = body.option3Name || null;

        const normalizedVariantsForSave = Array.isArray(body.variants)
            ? body.variants
                .map((v, i) => normalizeVariant(v, i))
                .filter((v) => v.option1_value)
            : null;
        if (Array.isArray(body.variants)) {
            dbPayload.has_variants = normalizedVariantsForSave.length > 0;
            if (!dbPayload.has_variants) {
                dbPayload.option1_name = null;
                dbPayload.option2_name = null;
                dbPayload.option3_name = null;
            } else {
                dbPayload.option1_name = body.option1Name || 'Option 1';
                dbPayload.option2_name = body.option2Name || null;
                dbPayload.option3_name = body.option3Name || null;
            }
        }

        const { data, error } = await supabaseAdmin
            .from('media')
            .update(dbPayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;

        // Save variants set if provided (replace-all strategy)
        if (Array.isArray(body.variants)) {
            const normalized = normalizedVariantsForSave;

            const pairSet = new Set();
            for (const v of normalized) {
                const key = `${v.option1_value}__${v.option2_value || ''}__${v.option3_value || ''}`.toLowerCase();
                if (pairSet.has(key)) {
                    return NextResponse.json({ success: false, error: `Duplicate variant pair: ${v.option1_value} + ${v.option2_value}${v.option3_value ? ` + ${v.option3_value}` : ''}` }, { status: 400 });
                }
                pairSet.add(key);
            }

            await supabaseAdmin.from('media_variants').delete().eq('media_id', id);

            if (normalized.length > 0) {
                const { error: variantInsertError } = await supabaseAdmin
                    .from('media_variants')
                    .insert(normalized.map((v) => ({ ...v, media_id: id })))
                    .select('*');
                if (variantInsertError) throw variantInsertError;
            }

            // Variants now only use fixed rate and custom fields.
        }

        if (Array.isArray(body.pricingRules)) {
            const normalizedRules = body.pricingRules
                .map((r, i) => normalizePricingRule(r, i))
                .filter(Boolean);
            await supabaseAdmin.from('media_pricing_rules').delete().eq('media_id', id);
            if (normalizedRules.length > 0) {
                await supabaseAdmin
                    .from('media_pricing_rules')
                    .insert(normalizedRules.map((r) => ({ ...r, media_id: id })));
            }
        }

        // Save metafield values if provided
        if (body.metafields && typeof body.metafields === 'object') {
            const entries = Object.entries(body.metafields).filter(([k]) => k && parseInt(k));
            await supabaseAdmin.from('media_metafields').delete().eq('media_id', id);
            if (entries.length > 0) {
                const { data: vendorMetas } = await supabaseAdmin
                    .from('vendor_metafields')
                    .select('id, key')
                    .in('id', entries.map(([k]) => parseInt(k)));
                const keyMap = Object.fromEntries((vendorMetas || []).map(v => [v.id, v.key]));
                const rows = entries.map(([vendorMetafieldId, value]) => ({
                    media_id: id,
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
            data: mapToFrontend(data),
            message: 'Hording updated successfully'
        }, { status: 200 });

    } catch (error) {
        console.error(`PUT /api/vendors/hordings/${id} Error:`, error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to update hording' }, { status: 500 });
    }
}


// DELETE - Delete a hording
export async function DELETE(req, { params }) {
    const resolved = await params;
    const { id } = resolved;
    if (!isValidMediaId(id)) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabaseAdmin
            .from('media')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Hording deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error(`DELETE /api/vendors/hordings/${id} Error:`, error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to delete hording' }, { status: 500 });
    }
}
