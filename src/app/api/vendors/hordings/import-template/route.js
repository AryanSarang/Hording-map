// app/api/vendors/hordings/import-template/route.js
// Default: Shopify-style CSV (handle; parent row 1; extra rules in rows with 3 pricing columns). ?format=legacy = flat CSV.
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../lib/authServer";
import { supabaseAdmin } from "../../../../../lib/supabase";
import {
    buildUnifiedShopifyStyleHeaders,
    unifiedParentStaticHeaderNames,
    escapeCsv,
} from "../../../../../lib/hordingsExportBundle";

function escapeLegacyCsv(val) {
    if (val == null || val === "") return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const legacy = searchParams.get("format") === "legacy";

        const user = await getCurrentUser();
        let metas = [];
        if (user?.id) {
            const { data } = await supabaseAdmin
                .from("vendor_metafields")
                .select("key")
                .eq("user_id", user.id)
                .order("display_order");
            metas = data || [];
        }

        const metaKeys = (metas || []).map((m) => m.key);

        if (legacy) {
            const headers = [
                "state",
                "city",
                "zone",
                "locality",
                "address",
                "pincode",
                "landmark",
                "latitude",
                "longitude",
                "poc_name",
                "poc_number",
                "poc_email",
                "vendor_id",
                "monthly_rental",
                "vendor_rate",
                "minimum_booking_duration",
                "media_type",
                "images",
                "screen_size",
                "display_format",
                "display_hours",
                "status",
                "pricing_rules",
                "pricing_rules_json",
                "option1_name",
                "option2_name",
                "option3_name",
                "option1_value",
                "option2_value",
                "option3_value",
                "variant_title",
                "cinema_name",
                "screen_code",
                "auditorium",
                "audience_category",
                "seating",
                "cinema_format",
                "size",
                "rate",
                "variant.screen_code",
                "variant.cinema_format",
                "variant.audience_category",
                "variant.seating",
                ...metaKeys.map((k) => `metafield.${k}`),
            ];

            const example = [
                "Maharashtra",
                "Mumbai",
                "Central",
                "Churchgate",
                "123 MG Road",
                "400001",
                "Near City Mall",
                "19.0760",
                "72.8777",
                "John Doe",
                "+91 9876543210",
                "john@example.com",
                "<vendor_id_10chars>",
                "50000",
                "45000",
                "1 month",
                "Cinema Screen",
                "https://example.com/img1.jpg|https://example.com/img2.jpg",
                "10x6",
                "16:9",
                "8am-10pm",
                "active",
                "",
                '[{"rule_name":"Movie Type","option_label":"Normal","multiplier":1},{"rule_name":"Movie Type","option_label":"Block Buster","multiplier":1.5}]',
                "Auditorium",
                "",
                "",
                "1",
                "",
                "",
                "Auditorium 1",
                "PVR Forum Mall",
                "PVR/FOR_1",
                "1",
                "Gold",
                "180",
                "3D/J2K",
                "4096*2160",
                "2500",
                "PVR/FOR_1",
                "3D/J2K",
                "Gold",
                "180",
                ...metaKeys.map(() => ""),
            ];

            const csv = [headers.map(escapeLegacyCsv).join(","), example.map(escapeLegacyCsv).join(",")].join(
                "\n"
            );

            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": 'attachment; filename="hordings-import-legacy-flat.csv"',
                },
            });
        }

        const headers = buildUnifiedShopifyStyleHeaders(metaKeys, []);
        const staticParentCount = unifiedParentStaticHeaderNames().length;
        const metaCount = metaKeys.length;
        const emptyContinuation = Array(staticParentCount - 1 + metaCount).fill("");

        const pricingJsonExample =
            '[{"rule_name":"Movie Type","option_label":"Normal","multiplier":1},{"rule_name":"Movie Type","option_label":"Block Buster","multiplier":1.5}]';

        const parentRow1 = [
            "",
            "",
            "Example cinema — Mumbai",
            "<vendor_id_10chars>",
            "",
            "Maharashtra",
            "Mumbai",
            "Central",
            "Churchgate",
            "123 MG Road",
            "400001",
            "Near City Mall",
            "19.0760",
            "72.8777",
            "John Doe",
            "+91 9876543210",
            "john@example.com",
            "50000",
            "45000",
            "1 month",
            "Cinema Screen",
            "https://example.com/img1.jpg|https://example.com/img2.jpg",
            "10x6",
            "16:9",
            "8am-10pm",
            "active",
            "Auditorium",
            "",
            "",
            pricingJsonExample,
            ...metaKeys.map(() => ""),
            "",
            "0",
            "1",
            "",
            "",
            "Auditorium 1",
            "Gold",
            "180",
            "3D/J2K",
            "4096*2160",
            "2500",
        ];

        const variantRow2 = [
            "",
            ...emptyContinuation,
            "",
            "1",
            "2",
            "",
            "",
            "Auditorium 2",
            "Gold",
            "180",
            "3D/J2K",
            "4096*2160",
            "2600",
        ];

        if (parentRow1.length !== headers.length || variantRow2.length !== headers.length) {
            console.error("Template column mismatch", parentRow1.length, variantRow2.length, headers.length);
        }

        const csv =
            [
                headers.map(escapeCsv).join(","),
                parentRow1.map(escapeCsv).join(","),
                variantRow2.map(escapeCsv).join(","),
            ].join("\n") + "\n";

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="hordings-import-template.csv"',
            },
        });
    } catch (error) {
        console.error("GET import-template Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
