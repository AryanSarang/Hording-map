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
 * GET /api/plans/[id]/export?format=csv
 *
 * CSV: one row per selected variant with full media details, metafields, pricing
 * conditions, and rates. Column list matches what the plan detail API loads so we
 * never select dropped columns (e.g. width/height removed in migrations).
 */
export async function GET(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const format = (searchParams.get('format') || 'csv').toLowerCase();

        if (format !== 'csv') {
            return NextResponse.json(
                { success: false, error: 'Only CSV export is supported' },
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
        const mediaIds = items
            .map((i) => {
                const n = Number(i.mediaId);
                return Number.isFinite(n) ? n : String(i.mediaId).trim();
            })
            .filter(Boolean);

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
                        'id, city, state, address, landmark, pincode, title, media_type, monthly_rental, screen_size, display_format, latitude, longitude'
                    )
                    .in('id', mediaIds)
                : Promise.resolve({ data: [] }),
            mediaIds.length
                ? supabaseAdmin
                    .from('media_variants')
                    .select(
                        'id, media_id, variant_title, option1_value, option2_value, option3_value, rate, display_order, seating'
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

        if (mediaRes?.error) {
            console.error('export: media fetch', mediaRes.error);
            return NextResponse.json(
                { success: false, error: mediaRes.error.message || 'Failed to load media for export' },
                { status: 500 }
            );
        }
        if (variantsRes?.error) {
            console.error('export: variants fetch', variantsRes.error);
        }

        // Keys must be strings — plan.items store mediaId as string but Postgres
        // returns media.id as number; Map uses strict equality so get("42") misses 42.
        const mediaById = new Map(media.map((m) => [String(m.id), m]));
        const variantsByMedia = new Map();
        for (const v of variants) {
            const key = String(v.media_id);
            if (!variantsByMedia.has(key)) variantsByMedia.set(key, []);
            variantsByMedia.get(key).push(v);
        }
        const pricingRulesByMedia = new Map();
        for (const r of pricingRulesFlat) {
            const key = String(r.media_id);
            if (!pricingRulesByMedia.has(key)) pricingRulesByMedia.set(key, []);
            pricingRulesByMedia.get(key).push(r);
        }
        for (const [mid, rows] of pricingRulesByMedia.entries()) {
            pricingRulesByMedia.set(mid, groupPricingRules(rows));
        }
        const metafieldDefById = new Map(metafieldDefs.map((m) => [String(m.id), m]));
        const metafieldsByMedia = new Map();
        for (const r of mediaMetafields) {
            const key = String(r.media_id);
            if (!metafieldsByMedia.has(key)) metafieldsByMedia.set(key, {});
            metafieldsByMedia.get(key)[String(r.vendor_metafield_id)] = r.value;
        }

        // 4. Build denormalized rows for CSV export.
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

        const csv = buildCsv(rows);
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${planNameSafe}.csv"`,
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
    const mediaKey = String(item.mediaId);
    const m = ctx.mediaById.get(mediaKey);
    if (!m) return null;
    const availableVariants = ctx.variantsByMedia.get(mediaKey) || [];
    const variantIdSet = new Set((item.variantIds || []).map(String));
    const selectedVariants = variantIdSet.size > 0
        ? availableVariants.filter((v) => variantIdSet.has(String(v.id)))
        : availableVariants;

    const baseRate = selectedVariants
        .map((v) => Number(v.rate))
        .filter((r) => Number.isFinite(r) && r > 0)
        .reduce((a, b) => a + b, 0)
        || Number(m.monthly_rental) || 0;

    const groups = ctx.pricingRulesByMedia.get(mediaKey) || [];
    const resolved = withDefaultsForGroups(groups, item.pricingSelections || {});
    const multiplier = multiplierForSelection(groups, resolved);
    const finalRate = baseRate * multiplier;

    const mfObj = ctx.metafieldsByMedia.get(mediaKey) || {};
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
        'Landmark',
        'Pincode',
        'Specifications',
        'Sub product',
        'Pricing Conditions',
        'Variant Rate (INR)',
        'Multiplier',
        'Final Rate (INR)',
    ];
    const lines = [headers.map(csvEscape).join(',')];

    for (const r of rows) {
        const m = r.media;
        const address = m.address || '';
        const landmark = m.landmark || '';
        const specsCol = r.specs.map((s) => `${s.name}=${s.value}`).join(' | ');
        const condCol = r.conditionsList.join(' | ');

        const variantRows =
            r.selectedVariants.length > 0
                ? r.selectedVariants.map((v, i) => ({
                    subProduct: r.subProducts[i] || cleanVariantTitle(v, i, m.media_type),
                    rate: Number(v.rate) || 0,
                }))
                : [{ subProduct: 'Default', rate: r.baseRate }];

        for (const vr of variantRows) {
            const variantFinal = Math.round(vr.rate * r.multiplier);
            lines.push(
                [
                    r.serial,
                    m.media_type || '',
                    m.state || '',
                    m.city || '',
                    m.title || '',
                    address,
                    landmark,
                    m.pincode || '',
                    specsCol,
                    vr.subProduct,
                    condCol,
                    Math.round(vr.rate),
                    r.multiplier,
                    variantFinal,
                ]
                    .map(csvEscape)
                    .join(',')
            );
        }
    }

    // UTF-8 BOM helps Excel open special characters (₹ in sub-product strings) correctly.
    return '\uFEFF' + lines.join('\n');
}

function sanitizeForFilename(s) {
    return String(s || 'plan')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 80) || 'plan';
}
