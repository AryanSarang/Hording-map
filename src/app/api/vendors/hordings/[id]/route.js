// app/api/vendors/hordings/[id]/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

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
        pincode: h.pincode,
        zone: h.zone,
        latitude: h.latitude,
        longitude: h.longitude,

        roadName: h.road_name,
        roadFrom: h.road_from,
        roadTo: h.road_to,
        positionWrtRoad: h.position_wrt_road,

        pocName: h.poc_name,
        pocNumber: h.poc_number,
        pocEmail: h.poc_email,

        rate: h.monthly_rental,
        ourRate: h.vendor_rate,
        paymentTerms: h.payment_terms,
        minimumBookingDuration: h.minimum_booking_duration,

        mediaType: h.media_type,
        hordingType: h.hording_type,
        width: h.width,
        height: h.height,
        imageUrls: Array.isArray(h.media) ? h.media.join('\n') : (h.media || ''),

        screenSize: h.screen_size,
        screenNumber: h.screen_number,
        screenPlacement: h.screen_placement,
        displayFormat: h.display_format,
        slotTime: h.slot_time,
        loopTime: h.loop_time,
        displayHours: h.display_hours,

        trafficType: h.traffic_type,
        visibility: h.visibility,
        dwellTime: h.dwell_time,

        condition: h.condition,
        previousClientele: h.previous_clientele,
        compliance: h.compliance || false,
        status: h.status
    };
}

// GET - Fetch a single hording by ID (including metafield values)
export async function GET(req, { params }) {
    const resolved = await params;
    const { id } = resolved;
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('hordings')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return NextResponse.json({ success: false, error: 'Hording not found' }, { status: 404 });

        const [{ data: metafieldRows }, { data: pricingRows }] = await Promise.all([
            supabaseAdmin.from('hording_metafields').select('vendor_metafield_id, value').eq('hording_id', data.id),
            supabaseAdmin.from('hording_pricing').select('price_name, price, duration, display_order').eq('hording_id', data.id).order('display_order')
        ]);

        const metafields = {};
        (metafieldRows || []).forEach((row) => {
            if (row.vendor_metafield_id) metafields[row.vendor_metafield_id] = row.value ?? '';
        });

        const pricing = (pricingRows || []).map(p => ({
            priceName: p.price_name,
            price: p.price,
            duration: p.duration
        }));

        return NextResponse.json({
            success: true,
            data: {
                ...mapToFrontend(data),
                metafields,
                pricing: pricing.length > 0 ? pricing : [{ priceName: '', price: '', duration: '' }]
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
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const body = await req.json();

        if (Object.keys(body).length === 0) {
            return NextResponse.json({ success: false, error: 'Missing request body' }, { status: 400 });
        }

        // Map Frontend camelCase -> DB snake_case
        const dbPayload = {};

        if (body.vendorId !== undefined) dbPayload.vendor_id = body.vendorId ? parseInt(body.vendorId) : null;
        if (body.city !== undefined) dbPayload.city = body.city;
        if (body.state !== undefined) dbPayload.state = body.state;
        if (body.address !== undefined) dbPayload.address = body.address;
        if (body.landmark !== undefined) dbPayload.landmark = body.landmark;
        if (body.pincode !== undefined) dbPayload.pincode = body.pincode;
        if (body.zone !== undefined) dbPayload.zone = body.zone;

        if (body.latitude !== undefined) dbPayload.latitude = parseFloat(body.latitude);
        if (body.longitude !== undefined) dbPayload.longitude = parseFloat(body.longitude);

        if (body.roadName !== undefined) dbPayload.road_name = body.roadName;
        if (body.roadFrom !== undefined) dbPayload.road_from = body.roadFrom;
        if (body.roadTo !== undefined) dbPayload.road_to = body.roadTo;
        if (body.positionWrtRoad !== undefined) dbPayload.position_wrt_road = body.positionWrtRoad;

        if (body.pocName !== undefined) dbPayload.poc_name = body.pocName;
        if (body.pocNumber !== undefined) dbPayload.poc_number = body.pocNumber;
        if (body.pocEmail !== undefined) dbPayload.poc_email = body.pocEmail;

        if (body.rate !== undefined) dbPayload.monthly_rental = body.rate ? parseInt(body.rate) : null;
        if (body.ourRate !== undefined) dbPayload.vendor_rate = body.ourRate ? parseInt(body.ourRate) : null;
        if (body.paymentTerms !== undefined) dbPayload.payment_terms = body.paymentTerms;
        if (body.minimumBookingDuration !== undefined) dbPayload.minimum_booking_duration = body.minimumBookingDuration;

        if (body.mediaType !== undefined) dbPayload.media_type = body.mediaType;
        if (body.hordingType !== undefined) dbPayload.hording_type = body.hordingType;
        if (body.width !== undefined) dbPayload.width = body.width ? parseInt(body.width) : null;
        if (body.height !== undefined) dbPayload.height = body.height ? parseInt(body.height) : null;
        if (body.imageUrls !== undefined) {
            dbPayload.media = typeof body.imageUrls === 'string'
                ? body.imageUrls.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
                : (Array.isArray(body.imageUrls) ? body.imageUrls : []);
        }

        if (body.screenSize !== undefined) dbPayload.screen_size = body.screenSize;
        if (body.screenNumber !== undefined) dbPayload.screen_number = body.screenNumber ? parseInt(body.screenNumber) : null;
        if (body.screenPlacement !== undefined) dbPayload.screen_placement = body.screenPlacement;
        if (body.displayFormat !== undefined) dbPayload.display_format = body.displayFormat;
        if (body.slotTime !== undefined) dbPayload.slot_time = body.slotTime;
        if (body.loopTime !== undefined) dbPayload.loop_time = body.loopTime;
        if (body.displayHours !== undefined) dbPayload.display_hours = body.displayHours;

        if (body.trafficType !== undefined) dbPayload.traffic_type = body.trafficType;
        if (body.visibility !== undefined) dbPayload.visibility = body.visibility;
        if (body.dwellTime !== undefined) dbPayload.dwell_time = body.dwellTime;

        if (body.condition !== undefined) dbPayload.condition = body.condition;
        if (body.previousClientele !== undefined) dbPayload.previous_clientele = body.previousClientele;
        if (body.compliance !== undefined) dbPayload.compliance = body.compliance;
        if (body.status !== undefined) dbPayload.status = body.status;

        const { data, error } = await supabaseAdmin
            .from('hordings')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Save pricing tiers if provided
        if (Array.isArray(body.pricing) && body.pricing.length > 0) {
            await supabaseAdmin.from('hording_pricing').delete().eq('hording_id', id);
            const pricingRows = body.pricing
                .filter(p => p.priceName?.trim() && p.price > 0 && p.duration?.trim())
                .map((p, i) => ({
                    hording_id: parseInt(id),
                    price_name: p.priceName.trim(),
                    price: parseInt(p.price),
                    duration: p.duration.trim(),
                    display_order: i,
                    is_active: true
                }));
            if (pricingRows.length > 0) {
                await supabaseAdmin.from('hording_pricing').insert(pricingRows);
            }
        }

        // Save metafield values if provided
        if (body.metafields && typeof body.metafields === 'object') {
            const entries = Object.entries(body.metafields).filter(([k]) => k && parseInt(k));
            await supabaseAdmin.from('hording_metafields').delete().eq('hording_id', id);
            if (entries.length > 0) {
                const { data: vendorMetas } = await supabaseAdmin
                    .from('vendor_metafields')
                    .select('id, key')
                    .in('id', entries.map(([k]) => parseInt(k)));
                const keyMap = Object.fromEntries((vendorMetas || []).map(v => [v.id, v.key]));
                const rows = entries.map(([vendorMetafieldId, value]) => ({
                    hording_id: parseInt(id),
                    vendor_metafield_id: parseInt(vendorMetafieldId),
                    key: keyMap[vendorMetafieldId] || `mf_${vendorMetafieldId}`,
                    value: String(value ?? ''),
                    value_type: 'string'
                }));
                await supabaseAdmin.from('hording_metafields').insert(rows);
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
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const { error } = await supabaseAdmin
            .from('hordings')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Hording deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error(`DELETE /api/vendors/hordings/${id} Error:`, error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to delete hording' }, { status: 500 });
    }
}
