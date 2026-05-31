// app/api/plans/[id]/export/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getCurrentUser } from '../../../../../lib/authServer';
import {
    groupPricingRules,
    multiplierForSelection,
    withDefaultsForGroups,
} from '../../../../../lib/pricingConditions';

export const dynamic = 'force-dynamic';

/**
 * Plan export endpoint.
 *
 * GET /api/plans/[id]/export?format=csv | pptx
 *
 * CSV:
 *   One row per media (industry-standard for media plan ledgers — RFP-friendly).
 *   Columns: Serial, Media Type, State, City, Title, Address, Pincode, then a single
 *   "Specifications" column with key=value pairs from metafields, then a "Sub products"
 *   column listing variant titles + rates joined with ` | `, "Pricing Conditions" with
 *   the picks, and Price (final, multiplier-adjusted). The flat shape keeps it diff-able
 *   in Excel / Google Sheets and easy to round-trip into other planning tools.
 *
 * PPTX:
 *   One slide per media. Each slide shows media-level info (type, title, location, full
 *   address, contact-style block) on the left and the full variant list on the right with
 *   rates. Pricing conditions appear in a "Conditions" mini-table at the bottom alongside
 *   the multiplier-adjusted total. Suitable for client pitches without further editing.
 */
export async function GET(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }
        const { id } = params;
        const { searchParams } = new URL(req.url);
        const format = (searchParams.get('format') || 'csv').toLowerCase();

        if (format !== 'csv' && format !== 'pptx') {
            return NextResponse.json(
                { success: false, error: 'format must be csv or pptx' },
                { status: 400 }
            );
        }

        // 1. Load the plan and verify ownership.
        const { data: planRow, error: planErr } = await supabaseAdmin
            .from('plans')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
        if (planErr || !planRow) {
            return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
        }

        const items = normalizePlanItemsForExport(planRow.items);
        const mediaIds = items.map((i) => i.mediaId).filter(Boolean);

        // 2. Load every dependent table in parallel so the export endpoint stays fast.
        const [
            mediaRes,
            variantsRes,
            pricingRulesRes,
            metafieldDefsRes,
            mediaMetafieldsRes,
        ] = await Promise.all([
            mediaIds.length
                ? supabaseAdmin
                    .from('media')
                    .select(
                        'id, vendor_id, city, state, address, landmark, zone, pincode, title, media_type, monthly_rental, screen_size, display_format, width, height, latitude, longitude'
                    )
                    .in('id', mediaIds)
                : Promise.resolve({ data: [] }),
            mediaIds.length
                ? supabaseAdmin
                    .from('media_variants')
                    .select(
                        'id, media_id, variant_title, option1_value, option2_value, option3_value, rate, display_order, size, cinema_format, audience_category, seating'
                    )
                    .in('media_id', mediaIds)
                    .order('display_order', { ascending: true })
                : Promise.resolve({ data: [] }),
            mediaIds.length
                ? supabaseAdmin
                    .from('media_pricing_rules')
                    .select('media_id, rule_name, option_label, multiplier, display_order')
                    .in('media_id', mediaIds)
                    .order('display_order', { ascending: true })
                : Promise.resolve({ data: [] }),
            supabaseAdmin
                .from('vendor_metafields')
                .select('id, name, type, applies_to_media_types, explore_filter_enabled')
                .order('display_order', { ascending: true })
                .order('id', { ascending: true }),
            mediaIds.length
                ? supabaseAdmin
                    .from('media_metafields')
                    .select('media_id, vendor_metafield_id, value')
                    .in('media_id', mediaIds)
                : Promise.resolve({ data: [] }),
        ]);

        const media = mediaRes?.data || [];
        const variants = variantsRes?.data || [];
        const pricingRulesFlat = pricingRulesRes?.data || [];
        const metafieldDefs = metafieldDefsRes?.data || [];
        const mediaMetafields = mediaMetafieldsRes?.data || [];

        // 3. Index everything for O(1) lookups in the formatters.
        const mediaById = new Map(media.map((m) => [m.id, m]));
        const variantsByMedia = new Map();
        for (const v of variants) {
            if (!variantsByMedia.has(v.media_id)) variantsByMedia.set(v.media_id, []);
            variantsByMedia.get(v.media_id).push(v);
        }
        const pricingRulesByMedia = new Map();
        for (const r of pricingRulesFlat) {
            if (!pricingRulesByMedia.has(r.media_id)) pricingRulesByMedia.set(r.media_id, []);
            pricingRulesByMedia.get(r.media_id).push(r);
        }
        for (const [mid, rows] of pricingRulesByMedia.entries()) {
            pricingRulesByMedia.set(mid, groupPricingRules(rows));
        }
        const metafieldDefById = new Map(metafieldDefs.map((m) => [String(m.id), m]));
        const metafieldsByMedia = new Map();
        for (const r of mediaMetafields) {
            if (!metafieldsByMedia.has(r.media_id)) metafieldsByMedia.set(r.media_id, {});
            metafieldsByMedia.get(r.media_id)[String(r.vendor_metafield_id)] = r.value;
        }

        // 4. Build a denormalized per-item bundle used by both exporters.
        const rows = items
            .map((it, idx) => buildPlanRow(it, idx, {
                mediaById,
                variantsByMedia,
                pricingRulesByMedia,
                metafieldDefById,
                metafieldsByMedia,
            }))
            .filter(Boolean);

        const planNameSafe = sanitizeForFilename(planRow.name || `plan-${planRow.id}`);

        if (format === 'csv') {
            const csv = buildCsv(rows);
            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${planNameSafe}.csv"`,
                    'Cache-Control': 'no-store',
                },
            });
        }

        // pptx
        const pptxBuffer = await buildPptxBuffer(planRow, rows);
        return new NextResponse(pptxBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="${planNameSafe}.pptx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error('GET /api/plans/[id]/export error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to export plan' },
            { status: 500 }
        );
    }
}

/** Minimal normalizer — the export route doesn't need merge logic since the stored
 *  plan is already normalized; we just defensively coerce shapes. */
function normalizePlanItemsForExport(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map((raw) => {
            if (!raw) return null;
            if (typeof raw === 'string') return { mediaId: raw, variantIds: [], pricingSelections: {} };
            const mediaId = String(raw.mediaId || raw.id || '').trim();
            if (!mediaId) return null;
            return {
                mediaId,
                variantIds: Array.isArray(raw.variantIds) ? raw.variantIds.map(String) : [],
                pricingSelections:
                    raw.pricingSelections && typeof raw.pricingSelections === 'object'
                        ? raw.pricingSelections
                        : {},
            };
        })
        .filter(Boolean);
}

function buildPlanRow(item, idx, ctx) {
    const m = ctx.mediaById.get(item.mediaId);
    if (!m) return null;
    const availableVariants = ctx.variantsByMedia.get(item.mediaId) || [];
    const variantIdSet = new Set((item.variantIds || []).map(String));
    const selectedVariants = variantIdSet.size > 0
        ? availableVariants.filter((v) => variantIdSet.has(String(v.id)))
        : availableVariants;

    const baseRate = selectedVariants
        .map((v) => Number(v.rate))
        .filter((r) => Number.isFinite(r) && r > 0)
        .reduce((a, b) => a + b, 0)
        || Number(m.monthly_rental) || 0;

    const groups = ctx.pricingRulesByMedia.get(item.mediaId) || [];
    const resolved = withDefaultsForGroups(groups, item.pricingSelections || {});
    const multiplier = multiplierForSelection(groups, resolved);
    const finalRate = baseRate * multiplier;

    const mfObj = ctx.metafieldsByMedia.get(item.mediaId) || {};
    const specs = [];
    for (const [mfId, value] of Object.entries(mfObj)) {
        if (value == null || String(value).trim() === '') continue;
        const def = ctx.metafieldDefById.get(String(mfId));
        if (!def) continue;
        specs.push({ name: def.name, value: String(value) });
    }

    const subProducts = selectedVariants.map((v, i) => {
        const title = cleanVariantTitle(v, i, m.media_type);
        const seating = v.seating || v.seating_capacity;
        const rate = Number(v.rate);
        const parts = [title];
        if (Number.isFinite(rate) && rate > 0) parts.push(`₹${Math.round(rate).toLocaleString('en-IN')}`);
        if (seating) parts.push(`Seating ${seating}`);
        return parts.join(' — ');
    });

    const conditionsList = Object.entries(resolved).map(
        ([rule, pick]) => `${rule}: ${pick.optionLabel}${pick.multiplier !== 1 ? ` (×${pick.multiplier})` : ''}`
    );

    return {
        serial: idx + 1,
        media: m,
        selectedVariants,
        baseRate,
        multiplier,
        finalRate,
        specs,
        subProducts,
        conditionsList,
        resolvedConditions: resolved,
        pricingGroups: groups,
    };
}

/** Strip vendor prefixes like `MH40_Audi1` and expand abbreviations the same way the UI does. */
function cleanVariantTitle(v, idx, mediaType) {
    const raw = (v.variant_title
        || [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(' / ')
        || '').trim();
    let cleaned = raw.replace(/^[A-Z]{2,4}\d{0,4}_+/, '');
    cleaned = cleaned.replace(/^Audi(?:torium)?[\s_-]?(\d+)$/i, 'Auditorium $1');
    cleaned = cleaned.replace(/^Screen[\s_-]?(\d+)$/i, 'Screen $1');
    if (!cleaned) {
        const ordinal = (v.display_order ?? idx) + 1;
        const isCinema = String(mediaType || '').toLowerCase().includes('cinema');
        cleaned = isCinema ? `Auditorium ${ordinal}` : `Variant ${ordinal}`;
    }
    return cleaned;
}

function csvEscape(value) {
    const s = String(value ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function buildCsv(rows) {
    const headers = [
        'Serial No',
        'Media Type',
        'State',
        'City',
        'Title',
        'Address',
        'Pincode',
        'Specifications',
        'Sub products',
        'Pricing Conditions',
        'Base Price (INR)',
        'Multiplier',
        'Final Price (INR)',
    ];
    const lines = [headers.map(csvEscape).join(',')];
    for (const r of rows) {
        const m = r.media;
        const address = [m.address, m.landmark, m.zone].filter(Boolean).join(' • ');
        const specsCol = r.specs.map((s) => `${s.name}=${s.value}`).join(' | ');
        const subCol = r.subProducts.join(' | ');
        const condCol = r.conditionsList.join(' | ');
        lines.push(
            [
                r.serial,
                m.media_type || '',
                m.state || '',
                m.city || '',
                m.title || '',
                address,
                m.pincode || '',
                specsCol,
                subCol,
                condCol,
                Math.round(r.baseRate),
                r.multiplier,
                Math.round(r.finalRate),
            ]
                .map(csvEscape)
                .join(',')
        );
    }
    return lines.join('\n');
}

async function buildPptxBuffer(planRow, rows) {
    // Dynamic import keeps the cold-start lean for the much-more-common CSV path.
    const { default: pptxgen } = await import('pptxgenjs');
    const pres = new pptxgen();
    pres.author = 'medvar';
    pres.company = 'medvar';
    pres.title = planRow.name || `Plan ${planRow.id}`;
    pres.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 in — standard 16:9 deck

    // Cover slide.
    {
        const slide = pres.addSlide();
        slide.background = { color: '0a0a0a' };
        slide.addText('MEDIA PLAN', {
            x: 0.6, y: 1.0, w: 12, h: 0.6,
            color: '22c55e', bold: true, fontSize: 18, fontFace: 'Calibri',
            charSpacing: 6,
        });
        slide.addText(planRow.name || 'Untitled plan', {
            x: 0.6, y: 1.7, w: 12, h: 1.2,
            color: 'FFFFFF', fontSize: 44, fontFace: 'Calibri', bold: true,
        });
        const totalFinal = rows.reduce((acc, r) => acc + r.finalRate, 0);
        const totalBase = rows.reduce((acc, r) => acc + r.baseRate, 0);
        slide.addText(
            `${rows.length} media · ${rows.reduce((a, r) => a + r.selectedVariants.length, 0)} variants`,
            { x: 0.6, y: 3.1, w: 12, h: 0.4, color: 'A1A1AA', fontSize: 16 }
        );
        slide.addText(`Estimated total: ₹${Math.round(totalFinal).toLocaleString('en-IN')}`, {
            x: 0.6, y: 3.7, w: 12, h: 0.6,
            color: '22c55e', fontSize: 28, bold: true,
        });
        if (Math.round(totalBase) !== Math.round(totalFinal)) {
            slide.addText(`Base ₹${Math.round(totalBase).toLocaleString('en-IN')} · with pricing conditions applied`, {
                x: 0.6, y: 4.4, w: 12, h: 0.3, color: '71717A', fontSize: 12,
            });
        }
        slide.addText(`Plan ID: ${planRow.id}    Generated ${new Date().toLocaleString('en-IN')}`, {
            x: 0.6, y: 6.9, w: 12, h: 0.3, color: '52525B', fontSize: 10,
        });
    }

    // Per-media slides.
    for (const r of rows) {
        const slide = pres.addSlide();
        slide.background = { color: 'ffffff' };
        const m = r.media;

        // Header strip — serial + media type + title.
        slide.addText(`#${r.serial}  ·  ${m.media_type || 'Media'}`, {
            x: 0.4, y: 0.25, w: 12.5, h: 0.35,
            color: '16a34a', fontSize: 12, bold: true, charSpacing: 4,
        });
        slide.addText(m.title || m.address || `Site ${m.id}`, {
            x: 0.4, y: 0.6, w: 12.5, h: 0.6,
            color: '0a0a0a', fontSize: 22, bold: true,
        });
        slide.addText([m.city, m.state].filter(Boolean).join(', '), {
            x: 0.4, y: 1.25, w: 12.5, h: 0.3,
            color: '52525B', fontSize: 12,
        });

        // Left column — address + specs + conditions.
        let leftY = 1.85;
        const address = [m.address, m.landmark, m.zone].filter(Boolean).join(' • ');
        if (address) {
            slide.addText('ADDRESS', { x: 0.4, y: leftY, w: 6, h: 0.25, color: '71717A', fontSize: 9, bold: true, charSpacing: 4 });
            slide.addText(address + (m.pincode ? `  ·  ${m.pincode}` : ''), {
                x: 0.4, y: leftY + 0.25, w: 6, h: 0.8, color: '0a0a0a', fontSize: 11,
            });
            leftY += 1.1;
        }

        if (r.specs.length > 0) {
            slide.addText('SPECIFICATIONS', { x: 0.4, y: leftY, w: 6, h: 0.25, color: '71717A', fontSize: 9, bold: true, charSpacing: 4 });
            leftY += 0.3;
            const specBody = r.specs.map((s) => `${s.name}: ${s.value}`).join('\n');
            slide.addText(specBody, { x: 0.4, y: leftY, w: 6, h: 2.0, color: '0a0a0a', fontSize: 11 });
            leftY += Math.min(2.0, r.specs.length * 0.3 + 0.2);
        }

        if (r.conditionsList.length > 0) {
            slide.addText('PRICING CONDITIONS', { x: 0.4, y: leftY, w: 6, h: 0.25, color: '71717A', fontSize: 9, bold: true, charSpacing: 4 });
            leftY += 0.3;
            slide.addText(r.conditionsList.join('\n'), {
                x: 0.4, y: leftY, w: 6, h: 1.5, color: '0a0a0a', fontSize: 11,
            });
        }

        // Right column — variants table.
        const isCinema = String(m.media_type || '').toLowerCase().includes('cinema');
        slide.addText(isCinema ? 'AUDITORIUMS' : 'VARIANTS', {
            x: 7.0, y: 1.85, w: 5.9, h: 0.25,
            color: '71717A', fontSize: 9, bold: true, charSpacing: 4,
        });
        const variantRows = [
            [
                { text: 'Sub product', options: { bold: true, color: 'FFFFFF', fill: { color: '0a0a0a' } } },
                { text: 'Rate (INR)', options: { bold: true, color: 'FFFFFF', fill: { color: '0a0a0a' }, align: 'right' } },
            ],
            ...r.selectedVariants.map((v, i) => {
                const title = cleanVariantTitle(v, i, m.media_type);
                const rate = Number(v.rate);
                const seating = v.seating || v.seating_capacity;
                const sub = seating ? `${title}  ·  Seating ${seating}` : title;
                return [
                    { text: sub, options: { color: '0a0a0a' } },
                    {
                        text: Number.isFinite(rate) && rate > 0
                            ? `₹${Math.round(rate).toLocaleString('en-IN')}`
                            : '—',
                        options: { color: '0a0a0a', align: 'right' },
                    },
                ];
            }),
        ];
        slide.addTable(variantRows, {
            x: 7.0, y: 2.15, w: 5.9,
            fontFace: 'Calibri',
            fontSize: 11,
            border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
        });

        // Footer total.
        slide.addText('FINAL PRICE', {
            x: 7.0, y: 6.5, w: 3.0, h: 0.3, color: '71717A', fontSize: 9, bold: true, charSpacing: 4,
        });
        if (r.multiplier !== 1) {
            slide.addText(`Base ₹${Math.round(r.baseRate).toLocaleString('en-IN')}  ·  ×${r.multiplier}`, {
                x: 7.0, y: 6.78, w: 3.0, h: 0.25, color: '71717A', fontSize: 10,
            });
        }
        slide.addText(`₹${Math.round(r.finalRate).toLocaleString('en-IN')}`, {
            x: 10.0, y: 6.55, w: 2.9, h: 0.6,
            color: '16a34a', fontSize: 22, bold: true, align: 'right',
        });
    }

    // pptxgenjs supports a Node-friendly write() with `outputType: 'nodebuffer'`.
    const buffer = await pres.write({ outputType: 'nodebuffer' });
    return buffer;
}

function sanitizeForFilename(s) {
    return String(s || 'plan')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 80) || 'plan';
}
