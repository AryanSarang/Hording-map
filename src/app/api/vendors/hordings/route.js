// app/api/vendors/hordings/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// GET - Fetch all vendor hordings (with optional filters)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const vendorId = searchParams.get('vendorId');
        const status = searchParams.get('status');
        const city = searchParams.get('city');
        const mediaType = searchParams.get('mediaType');

        let query = supabaseAdmin
            .from('hordings')
            .select('*, vendor:vendors(id, name)');

        if (vendorId) query = query.eq('vendor_id', vendorId);
        if (status) query = query.eq('status', status);
        if (city) query = query.ilike('city', `%${city}%`);
        if (mediaType) query = query.eq('media_type', mediaType);

        const { data: hordings, error } = await query.order('id', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: hordings || [],
            count: hordings?.length || 0
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

        // Map frontend camelCase to DB snake_case
        const dbPayload = {
            vendor_id: body.vendorId ? parseInt(body.vendorId) : null,

            city: body.city,
            state: body.state,
            address: body.address,
            landmark: body.landmark,
            pincode: body.pincode,
            zone: body.zone,

            latitude: parseFloat(body.latitude),
            longitude: parseFloat(body.longitude),

            road_name: body.roadName,
            road_from: body.roadFrom,
            road_to: body.roadTo,
            position_wrt_road: body.positionWrtRoad,

            poc_name: body.pocName,
            poc_number: body.pocNumber,
            poc_email: body.pocEmail,

            monthly_rental: body.rate ? parseInt(body.rate) : null,
            vendor_rate: body.ourRate ? parseInt(body.ourRate) : null,
            payment_terms: body.paymentTerms,
            minimum_booking_duration: body.minimumBookingDuration,

            media_type: body.mediaType,
            media: body.imageUrls || [],

            hording_type: body.hordingType,
            width: body.width ? parseInt(body.width) : null,
            height: body.height ? parseInt(body.height) : null,

            screen_size: body.screenSize,
            screen_number: body.screenNumber ? parseInt(body.screenNumber) : null,
            screen_placement: body.screenPlacement,
            display_format: body.displayFormat,
            slot_time: body.slotTime,
            loop_time: body.loopTime,
            display_hours: body.displayHours,

            traffic_type: body.trafficType,
            visibility: body.visibility,
            dwell_time: body.dwellTime,

            condition: body.condition,
            previous_clientele: body.previousClientele,
            compliance: body.compliance || false,

            status: body.status || 'active'
        };

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
            .from('hordings')
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

        // Save pricing tiers if provided
        const pricing = body.pricing;
        if (Array.isArray(pricing) && pricing.length > 0) {
            const pricingRows = pricing
                .filter(p => p.price_name && p.price > 0 && p.duration)
                .map((p, i) => ({
                    hording_id: newHording.id,
                    price_name: p.price_name,
                    price: parseInt(p.price),
                    duration: p.duration,
                    display_order: i,
                    is_active: true
                }));
            if (pricingRows.length > 0) {
                await supabaseAdmin.from('hording_pricing').insert(pricingRows);
            }
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
                    hording_id: newHording.id,
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
            data: newHording,
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
