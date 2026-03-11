// app/api/vendors/hordings/import/route.js
// Import hordings from CSV. Validates format, returns row-level errors.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

const MEDIA_TYPES = ['Bus Shelter', 'Digital Screens', 'Residential', 'Corporate', 'Corporate Coffee Machines', 'Croma Stores', 'ATM', 'other'];
const REQUIRED = ['city', 'state', 'address', 'latitude', 'longitude', 'poc_name', 'poc_number', 'minimum_booking_duration', 'media_type'];

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if ((c === ',' && !inQuotes) || c === '\n') {
            result.push(current.trim());
            current = '';
            if (c === '\n') break;
        } else {
            current += c;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCsv(text) {
    const lines = [];
    let line = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            inQuotes = !inQuotes;
            line += c;
        } else if (c === '\n' && !inQuotes) {
            if (line.trim()) lines.push(parseCsvLine(line));
            line = '';
        } else {
            line += c;
        }
    }
    if (line.trim()) lines.push(parseCsvLine(line));
    return lines;
}

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof Blob)) {
            return NextResponse.json({
                success: false,
                error: 'No CSV file provided',
                rowErrors: [],
            }, { status: 400 });
        }

        const text = await file.text();
        const rows = parseCsv(text);
        if (rows.length < 2) {
            return NextResponse.json({
                success: false,
                error: 'CSV must have a header row and at least one data row',
                rowErrors: [],
            }, { status: 400 });
        }

        const headers = rows[0].map((h) => String(h || '').trim().toLowerCase());
        const headerIndex = {};
        headers.forEach((h, i) => { headerIndex[h] = i; });

        // Resolve vendor_id from first row for metafield lookup (vendor_id is 10-char string after migration)
        let vendorIdForMetafields = null;
        for (let r = 1; r < rows.length; r++) {
            const i = headerIndex['vendor_id'];
            if (i != null && rows[r][i] != null && String(rows[r][i]).trim()) {
                vendorIdForMetafields = String(rows[r][i]).trim();
                break;
            }
        }
        let keyToId = {};
        if (vendorIdForMetafields) {
            const { data: vendorMetas } = await supabaseAdmin
                .from('vendor_metafields')
                .select('id, key')
                .eq('vendor_id', vendorIdForMetafields);
            keyToId = Object.fromEntries((vendorMetas || []).map((v) => [v.key, v.id]));
        }

        const rowErrors = [];
        const toInsert = [];

        for (let r = 1; r < rows.length; r++) {
            const cells = rows[r];
            const rowNum = r + 1;
            const errs = [];
            const get = (name) => {
                const i = headerIndex[name];
                return i != null && cells[i] != null ? String(cells[i]).trim() : '';
            };

            const city = get('city');
            const state = get('state');
            const address = get('address');
            const latStr = get('latitude');
            const lngStr = get('longitude');
            const pocName = get('poc_name');
            const pocNumber = get('poc_number');
            const minBooking = get('minimum_booking_duration');
            const mediaType = get('media_type');

            if (!city) errs.push('city is required');
            if (!state) errs.push('state is required');
            if (!address) errs.push('address is required');
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            if (!latStr || isNaN(lat) || lat < -90 || lat > 90) errs.push('latitude must be a number between -90 and 90');
            if (!lngStr || isNaN(lng) || lng < -180 || lng > 180) errs.push('longitude must be a number between -180 and 180');
            if (!pocName) errs.push('poc_name is required');
            if (!pocNumber) errs.push('poc_number is required');
            if (!minBooking) errs.push('minimum_booking_duration is required');
            if (!mediaType) errs.push('media_type is required');
            else if (!MEDIA_TYPES.includes(mediaType)) errs.push(`media_type must be one of: ${MEDIA_TYPES.join(', ')}`);

            const vendorIdStr = get('vendor_id');
            const vendorId = vendorIdStr ? String(vendorIdStr).trim() || null : null;

            const statusVal = get('status') || 'active';
            if (!['active', 'inactive', 'maintenance'].includes(statusVal)) errs.push('status must be active, inactive, or maintenance');

            const imagesStr = get('images');
            const media = imagesStr ? imagesStr.split('|').map((s) => s.trim()).filter(Boolean) : [];

            let pricing = [];
            try {
                const pricingStr = get('pricing');
                if (pricingStr) {
                    pricing = JSON.parse(pricingStr);
                    if (!Array.isArray(pricing)) pricing = [];
                    else {
                        pricing = pricing
                            .filter((p) => p && (p.price_name || p.price || p.duration))
                            .map((p) => ({
                                price_name: String(p.price_name || '').trim() || 'Custom',
                                price: parseInt(p.price) || 0,
                                duration: String(p.duration || '').trim() || 'N/A',
                            }))
                            .filter((p) => p.price > 0);
                    }
                }
            } catch {
                errs.push('pricing must be valid JSON array, e.g. [{"price_name":"1 Week","price":5000,"duration":"1 week"}]');
            }

            const metafields = {};
            for (const [h, idx] of Object.entries(headerIndex)) {
                if (h.startsWith('metafield.')) {
                    const key = h.slice(10);
                    const val = cells[idx] != null ? String(cells[idx]).trim() : '';
                    if (val && keyToId[key]) {
                        metafields[keyToId[key]] = val;
                    } else if (val && key) {
                        errs.push(`metafield "${key}" is not a created metafield - create it in Metafields first`);
                    }
                }
            }

            if (errs.length > 0) {
                rowErrors.push({ row: rowNum, errors: errs, preview: address || city || `Row ${rowNum}` });
                continue;
            }

            toInsert.push({
                vendor_id: vendorId,
                city,
                state,
                address,
                landmark: get('landmark'),
                pincode: get('pincode'),
                zone: get('zone'),
                latitude: lat,
                longitude: lng,
                road_name: get('road_name'),
                road_from: get('road_from'),
                road_to: get('road_to'),
                position_wrt_road: get('position_wrt_road'),
                poc_name: pocName,
                poc_number: pocNumber,
                poc_email: get('poc_email'),
                monthly_rental: get('monthly_rental') ? parseInt(get('monthly_rental')) : null,
                vendor_rate: get('vendor_rate') ? parseInt(get('vendor_rate')) : null,
                payment_terms: get('payment_terms'),
                minimum_booking_duration: minBooking,
                media_type: mediaType,
                width: get('width') ? parseInt(get('width')) : null,
                height: get('height') ? parseInt(get('height')) : null,
                media: media,
                screen_size: get('screen_size') || null,
                screen_number: get('screen_number') ? parseInt(get('screen_number')) : null,
                screen_placement: get('screen_placement') || null,
                display_format: get('display_format') || null,
                slot_time: get('slot_time') || null,
                loop_time: get('loop_time') || null,
                display_hours: get('display_hours') || null,
                traffic_type: get('traffic_type') || null,
                visibility: get('visibility') || 'Prime',
                dwell_time: get('dwell_time') || null,
                condition: get('condition') || null,
                previous_clientele: get('previous_clientele') || null,
                status: statusVal,
                pricing,
                metafields,
            });
        }

        if (rowErrors.length > 0 && toInsert.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'All rows have format errors. Fix the CSV and try again.',
                rowErrors,
                imported: 0,
            }, { status: 400 });
        }

        let imported = 0;
        for (const item of toInsert) {
            const { pricing: p, metafields: m, ...hPayload } = item;
            const { data: newH, error: insertErr } = await supabaseAdmin
                .from('media')
                .insert([hPayload])
                .select()
                .single();

            if (insertErr) {
                rowErrors.push({
                    row: imported + rowErrors.length + 2,
                    errors: [insertErr.message],
                    preview: item.address || item.city,
                });
                continue;
            }

            if (Array.isArray(p) && p.length > 0) {
                await supabaseAdmin.from('media_pricing').insert(
                    p.map((pr, i) => ({
                        media_id: newH.id,
                        price_name: pr.price_name,
                        price: pr.price,
                        duration: pr.duration,
                        display_order: i,
                        is_active: true,
                    }))
                );
            }

            if (m && Object.keys(m).length > 0) {
                const { data: vMetas } = await supabaseAdmin
                    .from('vendor_metafields')
                    .select('id, key')
                    .in('id', Object.keys(m).map(Number));
                const keyMap = Object.fromEntries((vMetas || []).map((v) => [v.id, v.key]));
                await supabaseAdmin.from('media_metafields').insert(
                    Object.entries(m).map(([id, value]) => ({
                        media_id: newH.id,
                        vendor_metafield_id: parseInt(id),
                        key: keyMap[id] || `mf_${id}`,
                        value: String(value ?? ''),
                        value_type: 'string',
                    }))
                );
            }
            imported++;
        }

        return NextResponse.json({
            success: true,
            imported,
            rowErrors: rowErrors.length > 0 ? rowErrors : undefined,
            message: `Imported ${imported} hording(s)${rowErrors.length > 0 ? `. ${rowErrors.length} row(s) had errors.` : ''}`,
        }, { status: 200 });
    } catch (error) {
        console.error('POST /api/vendors/hordings/import Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Import failed',
            rowErrors: [],
        }, { status: 500 });
    }
}
