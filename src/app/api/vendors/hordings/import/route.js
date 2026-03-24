// app/api/vendors/hordings/import/route.js
// Import hordings from CSV. Validates format, returns row-level errors.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/authServer';

const MEDIA_TYPES = ['Bus Shelter', 'Digital Screens', 'Cinema Screen', 'Residential', 'Corporate', 'Corporate Coffee Machines', 'Croma Stores', 'ATM', 'other'];
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

function normalizeHeader(h) {
    return String(h || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[()]/g, '')
        .replace(/-/g, '_');
}

function buildKey(row) {
    return [
        row.vendor_id || '',
        row.media_type || '',
        row.address || '',
        row.city || '',
        row.state || '',
        row.latitude || '',
        row.longitude || '',
    ].map((s) => String(s).trim().toLowerCase()).join('|');
}

function buildKeyFromExistingMedia(row) {
    return buildKey({
        vendor_id: row.vendor_id,
        media_type: row.media_type,
        address: row.address,
        city: row.city,
        state: row.state,
        latitude: row.latitude,
        longitude: row.longitude,
    });
}

export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized', rowErrors: [] }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        const replaceExisting = String(formData.get('replaceExisting') || '').toLowerCase() === 'true';
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

        // Some files have grouping labels on row 1 and real headers on row 2.
        const headerRowIndex = rows[0]?.some((h) => normalizeHeader(h) === 'city' || normalizeHeader(h) === 'media_type')
            ? 0
            : 1;
        const headers = (rows[headerRowIndex] || []).map((h) => normalizeHeader(h));
        const headerIndex = {};
        headers.forEach((h, i) => { headerIndex[h] = i; });

        let keyToId = {};
        const { data: vendorMetas } = await supabaseAdmin
            .from('vendor_metafields')
            .select('id, key')
            .eq('user_id', user.id);
        keyToId = Object.fromEntries((vendorMetas || []).map((v) => [v.key, v.id]));

        const rowErrors = [];
        const preparedRows = [];

        for (let r = headerRowIndex + 1; r < rows.length; r++) {
            const cells = rows[r];
            const rowNum = r + 1;
            const errs = [];
            const get = (name) => {
                const i = headerIndex[name];
                return i != null && cells[i] != null ? String(cells[i]).trim() : '';
            };

            if (!cells || cells.length === 0 || cells.every((c) => !String(c || '').trim())) continue;

            // CSV aliases (sheet-style)
            const mediaType = get('media_type') || get('media_type_');
            const city = get('city');
            const state = get('state');
            const address = get('address');
            const latStr = get('latitude');
            const lngStr = get('longitude');
            const pocName = get('poc_name') || get('poc_name_');
            const pocNumber = get('poc_number') || get('poc_number_');
            const pocEmail = get('poc_email') || get('poc_email_');
            const minBooking = get('minimum_booking_duration') || '1 month';

            const cinemaName = get('cinema_name');
            const screenCode = get('screen_code');
            const auditorium = get('auditorium');
            const option1Name = get('option1_name') || 'Option 1';
            const option2Name = get('option2_name') || null;
            const option3Name = get('option3_name') || '';
            const option1Value = get('option1_value') || screenCode || auditorium || '';
            const option2Value = get('option2_value') || null;
            const option3Value = get('option3_value');
            const variantTitle = get('variant_title') || cinemaName || [option1Value, option2Value, option3Value || null].filter(Boolean).join(' / ');
            const audienceCategory = get('audience_category');
            const seating = get('seating');
            const cinemaFormat = get('cinema_format');
            const size = get('size');
            const variantRate = get('rate');

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

            const metafields = {};
            const variantCustomFields = {};
            for (const [h, idx] of Object.entries(headerIndex)) {
                if (h.startsWith('metafield.')) {
                    const key = h.slice(10);
                    const val = cells[idx] != null ? String(cells[idx]).trim() : '';
                    if (val && keyToId[key]) {
                        metafields[keyToId[key]] = val;
                    } else if (val && key) {
                        errs.push(`metafield "${key}" is not a created metafield - create it in Metafields first`);
                    }
                } else if (h.startsWith('variant.')) {
                    const key = h.slice(8);
                    const val = cells[idx] != null ? String(cells[idx]).trim() : '';
                    if (key && val) variantCustomFields[key] = val;
                }
            }

            if (errs.length > 0) {
                rowErrors.push({ row: rowNum, errors: errs, preview: address || city || `Row ${rowNum}` });
                continue;
            }

            preparedRows.push({
                rowNum,
                key: buildKey({
                    vendor_id: vendorId,
                    media_type: mediaType,
                    address,
                    city,
                    state,
                    latitude: lat,
                    longitude: lng,
                }),
                vendor_id: vendorId,
                city,
                state,
                address,
                landmark: get('landmark'),
                pincode: get('pincode'),
                zone: get('zone'),
                latitude: lat,
                longitude: lng,
                locality: get('locality'),
                poc_name: pocName,
                poc_number: pocNumber,
                poc_email: get('poc_email'),
                monthly_rental: get('monthly_rental') ? parseInt(get('monthly_rental')) : null,
                vendor_rate: get('vendor_rate') ? parseInt(get('vendor_rate')) : null,
                minimum_booking_duration: minBooking,
                media_type: mediaType,
                media: media,
                screen_size: get('screen_size') || null,
                display_format: get('display_format') || null,
                display_hours: get('display_hours') || null,
                status: statusVal,
                metafields,
                variants: [{
                    variantTitle,
                    option1Value,
                    option2Value,
                    option3Value: option3Value || null,
                    audienceCategory: audienceCategory || null,
                    seating: seating ? parseInt(seating) : null,
                    cinemaFormat: cinemaFormat || null,
                    size: size || get('screen_size') || null,
                    rate: variantRate ? parseInt(variantRate) : (get('monthly_rental') ? parseInt(get('monthly_rental')) : null),
                    customFields: variantCustomFields,
                    displayOrder: 0,
                }],
                option1_name: option1Name,
                option2_name: option2Name,
                option3_name: option3Name || null,
                pricing_rules: get('pricing_rules'),
            });
        }

        if (rowErrors.length > 0 && preparedRows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'All rows have format errors. Fix the CSV and try again.',
                rowErrors,
                imported: 0,
            }, { status: 400 });
        }

        // Group rows by site key -> one parent media, many variants
        const grouped = new Map();
        for (const row of preparedRows) {
            if (!grouped.has(row.key)) grouped.set(row.key, []);
            grouped.get(row.key).push(row);
        }

        // Detect duplicates for this user before mutating data.
        const { data: existingMediaRows } = await supabaseAdmin
            .from('media')
            .select('id, vendor_id, media_type, address, city, state, latitude, longitude, title')
            .eq('user_id', user.id);
        const existingByKey = new Map();
        for (const m of existingMediaRows || []) {
            const k = buildKeyFromExistingMedia(m);
            if (!existingByKey.has(k)) existingByKey.set(k, []);
            existingByKey.get(k).push(m);
        }
        const duplicateGroups = [];
        for (const [k, groupRows] of grouped.entries()) {
            const matches = existingByKey.get(k) || [];
            if (matches.length > 0) {
                duplicateGroups.push({
                    key: k,
                    incomingPreview: groupRows[0]?.address || groupRows[0]?.city || 'Unknown media',
                    existingCount: matches.length,
                    existingIds: matches.map((m) => m.id),
                });
            }
        }
        if (duplicateGroups.length > 0 && !replaceExisting) {
            return NextResponse.json({
                success: false,
                requiresConfirmation: true,
                error: `${duplicateGroups.length} duplicate media group(s) found for this user. Confirm replace to overwrite old media with uploaded rows.`,
                duplicateGroups: duplicateGroups.slice(0, 50),
                duplicateCount: duplicateGroups.length,
            }, { status: 409 });
        }

        let imported = 0;
        let replaced = 0;
        for (const [, groupRows] of grouped) {
            const base = groupRows[0];
            const { metafields: m, variants: _, key, rowNum, pricing_rules, ...hPayload } = base;
            const dedupe = new Set();
            const variantsToInsert = [];
            groupRows.forEach((row, idx) => {
                (row.variants || []).forEach((v) => {
                    if (!v.option1Value) return;
                    const k = `${v.option1Value}__${v.option2Value || ''}__${v.option3Value || ''}`.toLowerCase();
                    if (dedupe.has(k)) return;
                    dedupe.add(k);
                    variantsToInsert.push({
                        variant_title: v.variantTitle || null,
                        option1_value: v.option1Value,
                        option2_value: v.option2Value || null,
                        option3_value: v.option3Value || null,
                        audience_category: v.audienceCategory,
                        seating: v.seating,
                        cinema_format: v.cinemaFormat,
                        size: v.size,
                        rate: v.rate,
                        custom_fields: v.customFields || {},
                        display_order: idx,
                        is_active: true,
                    });
                });
            });

            if (replaceExisting) {
                const duplicates = existingByKey.get(base.key) || [];
                if (duplicates.length > 0) {
                    const duplicateIds = duplicates.map((d) => d.id).filter(Boolean);
                    const { error: deleteErr } = await supabaseAdmin
                        .from('media')
                        .delete()
                        .in('id', duplicateIds)
                        .eq('user_id', user.id);
                    if (deleteErr) {
                        rowErrors.push({
                            row: rowNum,
                            errors: [`Failed to replace duplicates: ${deleteErr.message}`],
                            preview: base.address || base.city,
                        });
                        continue;
                    }
                    replaced += duplicateIds.length;
                    existingByKey.delete(base.key);
                }
            }
            const { data: newH, error: insertErr } = await supabaseAdmin
                .from('media')
                .insert([{
                    ...hPayload,
                    user_id: user.id,
                    title: base.address,
                    has_variants: variantsToInsert.length > 0,
                    option1_name: variantsToInsert.length > 0 ? (base.option1_name || 'Option 1') : null,
                    option2_name: variantsToInsert.length > 0 ? (base.option2_name || null) : null,
                    option3_name: variantsToInsert.length > 0 ? (base.option3_name || null) : null,
                }])
                .select()
                .single();

            if (insertErr) {
                rowErrors.push({
                    row: rowNum,
                    errors: [insertErr.message],
                    preview: base.address || base.city,
                });
                continue;
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

            if (variantsToInsert.length > 0) {
                await supabaseAdmin
                    .from('media_variants')
                    .insert(variantsToInsert.map((v) => ({ ...v, media_id: newH.id })));
            }

            const pricingRules = String(pricing_rules || '')
                .split('|')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((entry, idx) => {
                    const [ruleName, optionLabel, multiplierStr] = entry.split(':').map((v) => String(v || '').trim());
                    const multiplier = Number(multiplierStr);
                    if (!ruleName || !optionLabel || !Number.isFinite(multiplier) || multiplier <= 0) return null;
                    return {
                        media_id: newH.id,
                        rule_name: ruleName,
                        option_label: optionLabel,
                        multiplier,
                        display_order: idx,
                    };
                })
                .filter(Boolean);
            if (pricingRules.length > 0) {
                await supabaseAdmin.from('media_pricing_rules').insert(pricingRules);
            }
            imported++;
        }

        return NextResponse.json({
            success: true,
            imported,
            replaced,
            rowErrors: rowErrors.length > 0 ? rowErrors : undefined,
            message: `Imported ${imported} hording(s)${replaceExisting ? ` and replaced ${replaced} existing duplicate(s)` : ''}${rowErrors.length > 0 ? `. ${rowErrors.length} row(s) had errors.` : ''}`,
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
