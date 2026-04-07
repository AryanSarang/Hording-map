// app/api/vendors/hordings/export/route.js
// Shopify-style single CSV: same handle on each row; site/POC/metafields + pricing_rules_json only on first row per media.
// Variant rows repeat handle with blank parent columns (like Shopify). All pricing rules live in pricing_rules_json on row 1 — no extra "pricing-only" rows.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { isValidMediaId } from "../../../../../lib/genId10";
import { getCurrentUser } from "../../../../../lib/authServer";
import {
    escapeCsv,
    imagesToPipeString,
    buildUnifiedShopifyStyleHeaders,
    unifiedParentStaticHeaderNames,
} from "../../../../../lib/hordingsExportBundle";

const BATCH_SIZE = 100;

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/** Empty cells after handle: id..option3, pricing_rules_json, metafields — all blank. */
function emptyContinuationParent(staticParentCount, metaCount) {
    return Array(staticParentCount - 1 + metaCount).fill("");
}

function parentTailValues(h, vendorName, images, metas, allMetaKeys, pricingRulesJson) {
    return [
        h.id,
        h.title ?? "",
        vendorName,
        h.state ?? "",
        h.city ?? "",
        h.zone ?? "",
        h.locality ?? "",
        h.address ?? "",
        h.pincode ?? "",
        h.landmark ?? "",
        h.latitude ?? "",
        h.longitude ?? "",
        h.poc_name ?? "",
        h.poc_number ?? "",
        h.poc_email ?? "",
        h.monthly_rental ?? "",
        h.vendor_rate ?? "",
        h.minimum_booking_duration ?? "",
        h.media_type ?? "",
        images,
        h.screen_size ?? "",
        h.display_format ?? "",
        h.display_hours ?? "",
        h.status ?? "",
        h.option1_name ?? "",
        h.option2_name ?? "",
        h.option3_name ?? "",
        pricingRulesJson,
        ...allMetaKeys.map((k) => metas[k] ?? ""),
    ];
}

async function runExport(mediaIds, userId) {
    let query = supabaseAdmin.from("media").select("*").eq("user_id", userId);
    if (mediaIds.length > 0) {
        query = query.in("id", mediaIds);
    } else {
        query = query.range(0, 99999);
    }
    const { data: list, error: mediaError } = await query.order("created_at", { ascending: false });

    if (mediaError) throw mediaError;
    const rows = list || [];

    const vendorIds = [...new Set(rows.map((h) => h.vendor_id).filter(Boolean))];
    let vendorMap = {};
    if (vendorIds.length > 0) {
        const { data: vendors } = await supabaseAdmin
            .from("vendors")
            .select("id, name")
            .eq("user_id", userId)
            .in("id", vendorIds);
        vendorMap = Object.fromEntries((vendors || []).map((v) => [v.id, v.name || ""]));
    }

    const ids = rows.map((r) => r.id);

    const metafieldsByMedia = {};
    if (ids.length > 0) {
        const idChunks = chunk(ids, BATCH_SIZE);
        for (const idList of idChunks) {
            const { data: metaRows } = await supabaseAdmin
                .from("media_metafields")
                .select("media_id, key, value")
                .in("media_id", idList);
            for (const m of metaRows || []) {
                if (!metafieldsByMedia[m.media_id]) metafieldsByMedia[m.media_id] = {};
                metafieldsByMedia[m.media_id][m.key] = m.value;
            }
        }
    }

    const variantsByMedia = {};
    const pricingRulesByMedia = {};
    if (ids.length > 0) {
        const idChunks = chunk(ids, BATCH_SIZE);
        for (const idList of idChunks) {
            const [{ data: variantRows }, { data: pricingRuleRows }] = await Promise.all([
                supabaseAdmin
                    .from("media_variants")
                    .select("*")
                    .in("media_id", idList)
                    .order("display_order", { ascending: true }),
                supabaseAdmin
                    .from("media_pricing_rules")
                    .select("media_id, rule_name, option_label, multiplier, display_order")
                    .in("media_id", idList)
                    .order("display_order", { ascending: true }),
            ]);
            for (const v of variantRows || []) {
                if (!variantsByMedia[v.media_id]) variantsByMedia[v.media_id] = [];
                variantsByMedia[v.media_id].push(v);
            }
            for (const r of pricingRuleRows || []) {
                if (!pricingRulesByMedia[r.media_id]) pricingRulesByMedia[r.media_id] = [];
                pricingRulesByMedia[r.media_id].push(r);
            }
        }
    }

    const allMetaKeys = [
        ...new Set(Object.values(metafieldsByMedia).flatMap((m) => Object.keys(m))),
    ].sort();

    const variantCustomKeys = new Set();
    for (const vid of Object.keys(variantsByMedia)) {
        for (const v of variantsByMedia[vid]) {
            const cf = v.custom_fields && typeof v.custom_fields === "object" ? v.custom_fields : {};
            Object.keys(cf).forEach((k) => variantCustomKeys.add(k));
        }
    }
    const sortedVariantCustomKeys = [...variantCustomKeys].sort();

    const headers = buildUnifiedShopifyStyleHeaders(allMetaKeys, sortedVariantCustomKeys);
    const staticParentCount = unifiedParentStaticHeaderNames().length;

    const lines = [headers.map(escapeCsv).join(",")];

    for (const h of rows) {
        const metas = metafieldsByMedia[h.id] || {};
        const vendorName = vendorMap[h.vendor_id] ?? "";
        const images = imagesToPipeString(h.media);
        const pricingRules = pricingRulesByMedia[h.id] || [];
        const pricingRulesJson =
            pricingRules.length > 0
                ? JSON.stringify(
                    pricingRules.map((r) => ({
                        rule_name: r.rule_name,
                        option_label: r.option_label,
                        multiplier: Number(r.multiplier),
                    }))
                )
                : "";

        const vars = variantsByMedia[h.id] || [];
        const handle = h.id;

        function variantCells(v) {
            const cf =
                v.custom_fields && typeof v.custom_fields === "object" ? v.custom_fields : {};
            return [
                v.id ?? "",
                v.display_order ?? "",
                v.option1_value ?? "",
                v.option2_value ?? "",
                v.option3_value ?? "",
                v.variant_title ?? "",
                v.audience_category ?? "",
                v.seating ?? "",
                v.cinema_format ?? "",
                v.size ?? "",
                v.rate ?? "",
                ...sortedVariantCustomKeys.map((k) => cf[k] ?? ""),
            ];
        }

        const emptyContinuation = emptyContinuationParent(staticParentCount, allMetaKeys.length);

        if (vars.length === 0) {
            lines.push(
                [handle, ...parentTailValues(h, vendorName, images, metas, allMetaKeys, pricingRulesJson), ...variantCells({})].map(
                    escapeCsv
                ).join(",")
            );
        } else {
            vars.forEach((v, idx) => {
                if (idx === 0) {
                    lines.push(
                        [
                            handle,
                            ...parentTailValues(h, vendorName, images, metas, allMetaKeys, pricingRulesJson),
                            ...variantCells(v),
                        ]
                            .map(escapeCsv)
                            .join(",")
                    );
                } else {
                    lines.push([handle, ...emptyContinuation, ...variantCells(v)].map(escapeCsv).join(","));
                }
            });
        }
    }

    const csv = lines.join("\n") + "\n";
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `media-export-${dateStr}.csv`;

    return new Response(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    });
}

function exportError(message) {
    return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export async function GET(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const idsParam = searchParams.get("ids");

        let mediaIds = [];
        if (idsParam?.trim()) {
            mediaIds = idsParam.split(",").map((id) => id.trim()).filter(isValidMediaId);
        }

        return await runExport(mediaIds, user.id);
    } catch (error) {
        console.error("GET /api/vendors/hordings/export Error:", error);
        const message = error?.message || error?.error_description || String(error) || "Export failed";
        return exportError(message);
    }
}

export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        let mediaIds = [];
        try {
            const body = await req.json();
            if (Array.isArray(body?.ids)) {
                mediaIds = body.ids.map((id) => String(id).trim()).filter(isValidMediaId);
            }
        } catch {
            // no body or invalid JSON = export all
        }
        return await runExport(mediaIds, user.id);
    } catch (error) {
        console.error("POST /api/vendors/hordings/export Error:", error);
        const message = error?.message || error?.error_description || String(error) || "Export failed";
        return exportError(message);
    }
}
