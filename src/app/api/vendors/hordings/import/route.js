// app/api/vendors/hordings/import/route.js
// Import hordings from CSV. Validates format, returns row-level errors.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/authServer';
import { isValidMediaId } from '../../../../../lib/genId10';
import { parsePricingRulesFromRow, dedupePricingRules } from '../../../../../lib/csvPricingRules';
import { fetchAllSupabasePages } from '../../../../../lib/fetchAllSupabasePages';

const MEDIA_TYPES = ['Bus Shelter', 'Digital Screens', 'Cinema Screen', 'Residential', 'Corporate', 'Corporate Coffee Machines', 'Croma Stores', 'ATM', 'other'];
const REQUIRED_HEADERS = ['city', 'state', 'address', 'latitude', 'longitude', 'poc_name', 'poc_number', 'minimum_booking_duration', 'media_type'];

/** URL-ish slug for grouping rows when handle is omitted (not stored on media). */
function slugifyForHandle(raw) {
    const s = String(raw || '').trim().toLowerCase();
    const slug = s
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return slug || 'media';
}

function allocateUniqueHandle(baseSlug, used) {
    let h = baseSlug;
    let n = 0;
    while (used.has(h)) {
        n += 1;
        h = `${baseSlug}-${n}`;
    }
    used.add(h);
    return h;
}

function optionalNonNegInt(errs, label, raw) {
    const s = String(raw ?? '').trim();
    if (!s) return;
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 0 || String(n) !== s) {
        errs.push(`${label} must be a non-negative integer when provided`);
    }
}

function optionalEmail(errs, raw) {
    const s = String(raw ?? '').trim();
    if (!s) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        errs.push('poc_email must be a valid email when provided');
    }
}

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

function rowHasParentSitePayload(get) {
    const keys = ['city', 'state', 'address', 'latitude', 'longitude', 'poc_name', 'poc_number', 'minimum_booking_duration', 'media_type'];
    return keys.some((k) => String(get(k) || '').trim() !== '');
}

function variantPayloadFromGet(get) {
    const cinemaName = get('cinema_name');
    const screenCode = get('screen_code');
    const auditorium = get('auditorium');
    const option1Value = get('option1_value') || screenCode || auditorium || '';
    const option2Value = get('option2_value') || null;
    const option3Value = get('option3_value');
    const variantTitle = get('variant_title') || cinemaName || [option1Value, option2Value, option3Value || null].filter(Boolean).join(' / ');
    const audienceCategory = get('audience_category');
    const seating = get('seating');
    const cinemaFormat = get('cinema_format');
    const size = get('size');
    const variantRate = get('rate') || get('variant_rate');

    const variantCustomFields = {};
    return {
        option1Value,
        option2Value,
        option3Value,
        variantTitle,
        audienceCategory,
        seating,
        cinemaFormat,
        size,
        variantRate,
        variantCustomFields,
    };
}

function collectVariantCustomFields(headerIndex, cells) {
    const variantCustomFields = {};
    for (const [h, idx] of Object.entries(headerIndex)) {
        if (h.startsWith('variant_custom.')) {
            const key = h.slice(15);
            const val = cells[idx] != null ? String(cells[idx]).trim() : '';
            if (key && val) variantCustomFields[key] = val;
        } else if (h.startsWith('variant.')) {
            const key = h.slice(8);
            const val = cells[idx] != null ? String(cells[idx]).trim() : '';
            if (key && val) variantCustomFields[key] = val;
        }
    }
    return variantCustomFields;
}

/**
 * Shopify-style CSV: repeat handle (optional); parent + pricing_rules_json on row 1 (default).
 * If handle is blank, the importer generates a stable grouping key from title (or address) on the parent row,
 * and continuation rows inherit the previous parent’s group (blank handle on variants).
 * Legacy: if pricing_rule_name/option/multiplier headers exist, rules can be split across rows (one triplet per row).
 */
function parseShopifyStyleUnified(rows, headerRowIndex, headerIndex, keyToId) {
    const rowErrors = [];

    for (const rh of REQUIRED_HEADERS) {
        if (headerIndex[rh] == null) {
            return { preparedRows: [], rowErrors: [], fatalError: `CSV is missing required column: ${rh}` };
        }
    }

    const hasTripletHeaders =
        headerIndex.pricing_rule_name != null
        && headerIndex.pricing_rule_option != null
        && headerIndex.pricing_rule_multiplier != null;

    const groups = new Map();
    const usedGeneratedHandles = new Set();
    let lastOpenHandle = null;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const cells = rows[r];
        const rowNum = r + 1;
        if (!cells || cells.length === 0 || cells.every((c) => !String(c || '').trim())) continue;

        const get = (name) => {
            const i = headerIndex[name];
            return i != null && cells[i] != null ? String(cells[i]).trim() : '';
        };

        const handleFromCsv = headerIndex.handle != null ? get('handle') : '';
        const hasParent = rowHasParentSitePayload(get);

        let handle;
        if (hasParent) {
            if (handleFromCsv) {
                handle = handleFromCsv;
            } else {
                const titleSrc = get('title') || get('media_title') || get('address');
                if (!String(titleSrc || '').trim()) {
                    rowErrors.push({
                        row: rowNum,
                        errors: ['Provide handle, or title (or address) on the first row of each media so a grouping key can be generated'],
                        preview: `Row ${rowNum}`,
                    });
                    continue;
                }
                const base = slugifyForHandle(titleSrc);
                handle = allocateUniqueHandle(base, usedGeneratedHandles);
            }
            lastOpenHandle = handle;
        } else {
            if (handleFromCsv) {
                handle = handleFromCsv;
                lastOpenHandle = handle;
            } else if (lastOpenHandle) {
                handle = lastOpenHandle;
            } else {
                rowErrors.push({
                    row: rowNum,
                    errors: [
                        'Variant row has no handle — add the same handle as the parent row, or place variant rows directly under a parent row with site/POC columns',
                    ],
                    preview: `Row ${rowNum}`,
                });
                continue;
            }
        }

        if (!groups.has(handle)) {
            groups.set(handle, {
                parent: null,
                parentRowNum: 0,
                legacyPricingFromParent: [],
                pricingRules: [],
                variants: [],
            });
        }
        const g = groups.get(handle);

        const prN = hasTripletHeaders ? get('pricing_rule_name') : '';
        const prO = hasTripletHeaders ? get('pricing_rule_option') : '';
        const prM = hasTripletHeaders ? get('pricing_rule_multiplier') : '';
        const pricingTripletComplete = Boolean(prN && prO && prM);
        const pricingPartial = hasTripletHeaders && (prN || prO || prM) && !pricingTripletComplete;

        if (pricingPartial) {
            rowErrors.push({
                row: rowNum,
                errors: [
                    'pricing_rule_name, pricing_rule_option, and pricing_rule_multiplier must all be set together for each pricing rule row (rules apply to the whole media, not a single variant)',
                ],
                preview: handle,
            });
            continue;
        }

        if (pricingTripletComplete) {
            const mult = parseFloat(String(prM).replace(',', '.'));
            if (!Number.isFinite(mult) || mult <= 0) {
                rowErrors.push({
                    row: rowNum,
                    errors: ['pricing_rule_multiplier must be a positive number'],
                    preview: handle,
                });
                continue;
            }
            g.pricingRules.push({ rule_name: prN, option_label: prO, multiplier: mult });
        }

        if (hasParent) {
            if (g.parent) {
                rowErrors.push({
                    row: rowNum,
                    errors: [`Only one parent row per handle — "${handle}" already has site columns on an earlier row`],
                    preview: handle,
                });
                continue;
            }

            const errs = [];
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

            const option1Name = get('option1_name') || 'Option 1';
            const option2Name = get('option2_name') || null;
            const option3Name = get('option3_name') || '';

            if (!city) errs.push('city is required on the first row for each handle');
            if (!state) errs.push('state is required on the first row for each handle');
            if (!address) errs.push('address is required on the first row for each handle');
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            if (!latStr || isNaN(lat) || lat < -90 || lat > 90) errs.push('latitude must be a number between -90 and 90');
            if (!lngStr || isNaN(lng) || lng < -180 || lng > 180) errs.push('longitude must be a number between -180 and 180');
            if (!pocName) errs.push('poc_name is required on the first row for each handle');
            if (!pocNumber) errs.push('poc_number is required on the first row for each handle');
            if (!minBooking) errs.push('minimum_booking_duration is required');
            if (!mediaType) errs.push('media_type is required');
            else if (!MEDIA_TYPES.includes(mediaType)) errs.push(`media_type must be one of: ${MEDIA_TYPES.join(', ')}`);

            const vendorIdStr = get('vendor_id');
            const vendorId = vendorIdStr ? String(vendorIdStr).trim() || null : null;
            if (vendorId && !isValidMediaId(vendorId)) {
                errs.push('vendor_id must be a valid UUID or 10-character hex id when provided');
            }

            const statusVal = get('status') || 'active';
            if (!['active', 'inactive', 'maintenance'].includes(statusVal)) errs.push('status must be active, inactive, or maintenance');

            const imagesStr = get('images');
            const media = imagesStr ? imagesStr.split('|').map((s) => s.trim()).filter(Boolean) : [];

            optionalNonNegInt(errs, 'monthly_rental', get('monthly_rental'));
            optionalNonNegInt(errs, 'vendor_rate', get('vendor_rate'));
            optionalEmail(errs, pocEmail);

            let legacyRulesForParent = [];
            if (!hasTripletHeaders) {
                const { rules: lr, errors: pricingErrs } = parsePricingRulesFromRow(get);
                legacyRulesForParent = lr;
                errs.push(...pricingErrs);
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
                rowErrors.push({ row: rowNum, errors: errs, preview: address || city || handle });
                continue;
            }

            g.parent = {
                key: buildKey({
                    vendor_id: vendorId,
                    media_type: mediaType,
                    address,
                    city,
                    state,
                    latitude: lat,
                    longitude: lng,
                }),
                csvTitle: (get('title') || get('media_title') || '').trim(),
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
                monthly_rental: get('monthly_rental') ? parseInt(get('monthly_rental'), 10) : null,
                vendor_rate: get('vendor_rate') ? parseInt(get('vendor_rate'), 10) : null,
                minimum_booking_duration: minBooking,
                media_type: mediaType,
                media,
                screen_size: get('screen_size') || null,
                display_format: get('display_format') || null,
                display_hours: get('display_hours') || null,
                status: statusVal,
                metafields,
                option1_name: option1Name,
                option2_name: option2Name,
                option3_name: option3Name || null,
            };
            g.parentRowNum = rowNum;
            if (!hasTripletHeaders) {
                g.legacyPricingFromParent = legacyRulesForParent;
            }

            const vp = variantPayloadFromGet(get);
            Object.assign(vp.variantCustomFields, collectVariantCustomFields(headerIndex, cells));
            const errsV = [];
            optionalNonNegInt(errsV, 'rate (variant)', vp.variantRate);
            optionalNonNegInt(errsV, 'seating', vp.seating);
            if (errsV.length > 0) {
                rowErrors.push({ row: rowNum, errors: errsV, preview: handle });
                continue;
            }
            if (vp.option1Value) {
                g.variants.push({
                    rowNum,
                    variantTitle: vp.variantTitle,
                    option1Value: vp.option1Value,
                    option2Value: vp.option2Value,
                    option3Value: vp.option3Value || null,
                    audienceCategory: vp.audienceCategory || null,
                    seating: vp.seating ? parseInt(vp.seating, 10) : null,
                    cinemaFormat: vp.cinemaFormat || null,
                    size: vp.size || g.parent.screen_size || null,
                    rate: vp.variantRate ? parseInt(vp.variantRate, 10) : (g.parent.monthly_rental != null ? g.parent.monthly_rental : null),
                    customFields: vp.variantCustomFields,
                    displayOrder: 0,
                });
            }
        } else {
            if (!g.parent) {
                rowErrors.push({
                    row: rowNum,
                    errors: [
                        `No site/POC row yet for handle "${handle}" — start each media with a row that includes city, state, address, coordinates, POC, and media_type`,
                    ],
                    preview: handle,
                });
                continue;
            }

            const vp = variantPayloadFromGet(get);
            Object.assign(vp.variantCustomFields, collectVariantCustomFields(headerIndex, cells));
            const errsV = [];
            optionalNonNegInt(errsV, 'rate (variant)', vp.variantRate);
            optionalNonNegInt(errsV, 'seating', vp.seating);

            if (hasTripletHeaders) {
                if (!vp.option1Value && !pricingTripletComplete) {
                    errsV.push(
                        'Each continuation row must include option1_value (variant) or a full pricing rule (three columns). Pricing rules apply to the whole media.'
                    );
                }
            } else if (!vp.option1Value) {
                errsV.push('option1_value is required on variant continuation rows');
            }

            if (errsV.length > 0) {
                rowErrors.push({ row: rowNum, errors: errsV, preview: handle });
                continue;
            }

            if (vp.option1Value) {
                g.variants.push({
                    rowNum,
                    variantTitle: vp.variantTitle,
                    option1Value: vp.option1Value,
                    option2Value: vp.option2Value,
                    option3Value: vp.option3Value || null,
                    audienceCategory: vp.audienceCategory || null,
                    seating: vp.seating ? parseInt(vp.seating, 10) : null,
                    cinemaFormat: vp.cinemaFormat || null,
                    size: vp.size || g.parent.screen_size || null,
                    rate: vp.variantRate ? parseInt(vp.variantRate, 10) : (g.parent.monthly_rental != null ? g.parent.monthly_rental : null),
                    customFields: vp.variantCustomFields,
                    displayOrder: 0,
                });
            }
        }
    }

    const preparedRows = [];
    for (const [handle, g] of groups) {
        if (!g.parent) {
            rowErrors.push({ row: g.parentRowNum || 0, errors: [`Handle "${handle}" is missing a parent row with site/POC data`], preview: handle });
            continue;
        }

        let pricingRulesParsed = [];
        if (hasTripletHeaders) {
            pricingRulesParsed = dedupePricingRules(g.pricingRules);
        } else {
            pricingRulesParsed = dedupePricingRules(g.legacyPricingFromParent || []);
        }

        const snap = { ...g.parent, pricingRulesParsed };

        if (g.variants.length === 0) {
            preparedRows.push({ rowNum: g.parentRowNum, ...snap, variants: [] });
        } else {
            for (const v of g.variants) {
                preparedRows.push({ rowNum: v.rowNum, ...snap, variants: [v] });
            }
        }
    }

    return { preparedRows, rowErrors, fatalError: null };
}

async function commitPreparedImport(user, replaceExisting, preparedRows, rowErrors) {
    if (rowErrors.length > 0 && preparedRows.length === 0) {
        return NextResponse.json({
            success: false,
            error: 'All rows have format errors. Fix the CSV and try again.',
            rowErrors,
            imported: 0,
        }, { status: 400 });
    }

    const rowsByKey = new Map();
    for (const row of preparedRows) {
        if (!rowsByKey.has(row.key)) rowsByKey.set(row.key, []);
        rowsByKey.get(row.key).push(row);
    }
    const pricingConsistencyErrors = [];
    for (const [, grp] of rowsByKey) {
        if (grp.length < 2) continue;
        const ref = JSON.stringify(grp[0].pricingRulesParsed || []);
        for (const gr of grp.slice(1)) {
            if (JSON.stringify(gr.pricingRulesParsed || []) !== ref) {
                pricingConsistencyErrors.push({
                    row: gr.rowNum,
                    errors: [
                        'Pricing rules must be identical on every CSV row for the same media site (same address/city/lat/lng group)',
                    ],
                    preview: gr.address || gr.city || `Row ${gr.rowNum}`,
                });
            }
        }
    }
    if (pricingConsistencyErrors.length > 0) {
        return NextResponse.json(
            {
                success: false,
                error: 'Conflicting pricing rules between variant rows for the same media. Align pricing columns or remove duplicates.',
                rowErrors: pricingConsistencyErrors,
                imported: 0,
            },
            { status: 400 }
        );
    }

    const grouped = new Map();
    for (const row of preparedRows) {
        if (!grouped.has(row.key)) grouped.set(row.key, []);
        grouped.get(row.key).push(row);
    }

    const { data: existingMediaRows, error: existingFetchErr } = await fetchAllSupabasePages((from, to) =>
        supabaseAdmin
            .from('media')
            .select('id, vendor_id, media_type, address, city, state, latitude, longitude, title')
            .eq('user_id', user.id)
            .order('id', { ascending: true })
            .range(from, to)
    );
    if (existingFetchErr) {
        return NextResponse.json({
            success: false,
            error: existingFetchErr.message || 'Failed to load existing media for duplicate check',
            rowErrors: [],
        }, { status: 500 });
    }
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

    const rowErrorsOut = [...rowErrors];
    let imported = 0;
    let replaced = 0;
    for (const [, groupRows] of grouped) {
        const base = groupRows[0];
        const { metafields: m, variants: _, key, rowNum, pricingRulesParsed, csvTitle, ...hPayload } = base;
        const dedupe = new Set();
        const variantsToInsert = [];
        groupRows.forEach((row, idx) => {
            (row.variants || []).forEach((v) => {
                if (!v.option1Value) return;
                const kVar = `${v.option1Value}__${v.option2Value || ''}__${v.option3Value || ''}`.toLowerCase();
                if (dedupe.has(kVar)) return;
                dedupe.add(kVar);
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
                    rowErrorsOut.push({
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
                title: (csvTitle && String(csvTitle).trim()) || base.address,
                has_variants: variantsToInsert.length > 0,
                option1_name: variantsToInsert.length > 0 ? (base.option1_name || 'Option 1') : null,
                option2_name: variantsToInsert.length > 0 ? (base.option2_name || null) : null,
                option3_name: variantsToInsert.length > 0 ? (base.option3_name || null) : null,
            }])
            .select()
            .single();

        if (insertErr) {
            rowErrorsOut.push({
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

        const pricingRules = (pricingRulesParsed || []).map((r, idx) => ({
            media_id: newH.id,
            rule_name: r.rule_name,
            option_label: r.option_label,
            multiplier: r.multiplier,
            display_order: idx,
        }));
        if (pricingRules.length > 0) {
            await supabaseAdmin.from('media_pricing_rules').insert(pricingRules);
        }
        imported++;
    }

    return NextResponse.json({
        success: true,
        imported,
        replaced,
        rowErrors: rowErrorsOut.length > 0 ? rowErrorsOut : undefined,
        message: `Imported ${imported} hording(s)${replaceExisting ? ` and replaced ${replaced} existing duplicate(s)` : ''}${rowErrorsOut.length > 0 ? `. ${rowErrorsOut.length} row(s) had errors.` : ''}`,
    }, { status: 200 });
}

export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized', rowErrors: [] }, { status: 401 });
        }

        const formData = await req.formData();
        const replaceExisting = String(formData.get('replaceExisting') || '').toLowerCase() === 'true';

        const { data: vendorMetas } = await supabaseAdmin
            .from('vendor_metafields')
            .select('id, key')
            .eq('user_id', user.id);
        const keyToId = Object.fromEntries((vendorMetas || []).map((v) => [v.key, v.id]));

        const file = formData.get('file');

        let preparedRows = [];
        let rowErrors = [];

        if (!(file instanceof Blob)) {
            return NextResponse.json({
                success: false,
                error: 'Upload a CSV file (export from Media, or the legacy flat template).',
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

        const headerRowIndex = rows[0]?.some((h) => {
            const n = normalizeHeader(h);
            return n === 'city' || n === 'media_type' || n === 'handle' || n === 'import_ref' || n === 'pricing_rules_json';
        })
            ? 0
            : 1;
        const headers = (rows[headerRowIndex] || []).map((h) => normalizeHeader(h));
        const headerIndex = {};
        headers.forEach((h, i) => { headerIndex[h] = i; });

        if (headerIndex.handle != null || headerIndex.pricing_rules_json != null) {
            const unified = parseShopifyStyleUnified(rows, headerRowIndex, headerIndex, keyToId);
            if (unified.fatalError) {
                return NextResponse.json({ success: false, error: unified.fatalError, rowErrors: [] }, { status: 400 });
            }
            preparedRows = unified.preparedRows;
            rowErrors = unified.rowErrors;
        } else {
            for (const rh of REQUIRED_HEADERS) {
                if (headerIndex[rh] == null) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: `CSV is missing required column: ${rh}`,
                            rowErrors: [],
                        },
                        { status: 400 }
                    );
                }
            }

            rowErrors = [];
            preparedRows = [];

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
                const variantRate = get('rate') || get('variant_rate');

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
                if (vendorId && !isValidMediaId(vendorId)) {
                    errs.push('vendor_id must be a valid UUID or 10-character hex id when provided');
                }

                const statusVal = get('status') || 'active';
                if (!['active', 'inactive', 'maintenance'].includes(statusVal)) errs.push('status must be active, inactive, or maintenance');

                const imagesStr = get('images');
                const media = imagesStr ? imagesStr.split('|').map((s) => s.trim()).filter(Boolean) : [];

                optionalNonNegInt(errs, 'monthly_rental', get('monthly_rental'));
                optionalNonNegInt(errs, 'vendor_rate', get('vendor_rate'));
                optionalNonNegInt(errs, 'rate (variant)', variantRate);
                optionalNonNegInt(errs, 'seating', seating);
                optionalEmail(errs, pocEmail);

                const { rules: pricingRulesParsed, errors: pricingErrs } = parsePricingRulesFromRow(get);
                errs.push(...pricingErrs);

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
                    monthly_rental: get('monthly_rental') ? parseInt(get('monthly_rental'), 10) : null,
                    vendor_rate: get('vendor_rate') ? parseInt(get('vendor_rate'), 10) : null,
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
                        seating: seating ? parseInt(seating, 10) : null,
                        cinemaFormat: cinemaFormat || null,
                        size: size || get('screen_size') || null,
                        rate: variantRate ? parseInt(variantRate, 10) : (get('monthly_rental') ? parseInt(get('monthly_rental'), 10) : null),
                        customFields: variantCustomFields,
                        displayOrder: 0,
                    }],
                    option1_name: option1Name,
                    option2_name: option2Name,
                    option3_name: option3Name || null,
                    pricingRulesParsed,
                });
            }
        }

        return await commitPreparedImport(user, replaceExisting, preparedRows, rowErrors);
    } catch (error) {
        console.error('POST /api/vendors/hordings/import Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Import failed',
            rowErrors: [],
        }, { status: 500 });
    }
}
