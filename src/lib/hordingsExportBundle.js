export function escapeCsv(val) {
    if (val == null || val === "") return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export function imagesToPipeString(media) {
    if (Array.isArray(media)) return media.join("|");
    if (typeof media === "string") {
        try {
            const parsed = JSON.parse(media);
            return Array.isArray(parsed) ? parsed.join("|") : media;
        } catch {
            return media;
        }
    }
    return "";
}

/** @deprecated Wide numbered columns — kept only for old CSV compatibility in parsePricingRulesFromRow */
function pricingRuleFlatHeaderNames() {
    const names = [];
    for (let i = 1; i <= 12; i++) {
        names.push(
            `pricing_rule_${i}_variant_name`,
            `pricing_rule_${i}_option`,
            `pricing_rule_${i}_multiplier`
        );
    }
    return names;
}

/** Static parent columns for unified (Shopify-style) CSV — before dynamic metafield.* */
export function unifiedParentStaticHeaderNames() {
    return [
        "handle",
        "id",
        "title",
        "vendor_id",
        "vendor_name",
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
        "monthly_rental",
        "vendor_rate",
        "minimum_booking_duration",
        "media_type",
        "images",
        "screen_size",
        "display_format",
        "display_hours",
        "status",
        "option1_name",
        "option2_name",
        "option3_name",
        "pricing_rules_json",
    ];
}

/** Variant columns in unified CSV (no media_import_ref — handle groups rows). */
export function unifiedVariantHeaderNames(variantCustomKeys) {
    const base = [
        "variant_id",
        "display_order",
        "option1_value",
        "option2_value",
        "option3_value",
        "variant_title",
        "audience_category",
        "seating",
        "cinema_format",
        "size",
        "rate",
    ];
    const custom = [...variantCustomKeys].sort().map((k) => `variant_custom.${k}`);
    return [...base, ...custom];
}

/**
 * Single-file export headers (Shopify-style): handle + parent + variant columns.
 */
export function buildUnifiedShopifyStyleHeaders(allMetaKeys, variantCustomKeys) {
    const metaHeaders = allMetaKeys.map((k) => `metafield.${k}`);
    return [
        ...unifiedParentStaticHeaderNames(),
        ...metaHeaders,
        ...unifiedVariantHeaderNames(variantCustomKeys),
    ];
}

/** @deprecated */
export function buildMediaCsvHeaders(allMetaKeys) {
    const pricingRuleFlatHeaders = pricingRuleFlatHeaderNames();
    const base = [
        "import_ref",
        "id",
        "vendor_id",
        "vendor_name",
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
        "monthly_rental",
        "vendor_rate",
        "minimum_booking_duration",
        "media_type",
        "images",
        "screen_size",
        "display_format",
        "display_hours",
        "status",
        "option1_name",
        "option2_name",
        "option3_name",
        "pricing_rules",
        "pricing_rules_json",
        ...pricingRuleFlatHeaders,
    ];
    const metaHeaders = allMetaKeys.map((k) => `metafield.${k}`);
    return [...base, ...metaHeaders];
}

/** @deprecated */
export function buildVariantsCsvHeaders(variantCustomKeys) {
    const base = [
        "media_import_ref",
        "variant_id",
        "display_order",
        "option1_value",
        "option2_value",
        "option3_value",
        "variant_title",
        "audience_category",
        "seating",
        "cinema_format",
        "size",
        "rate",
    ];
    const custom = [...variantCustomKeys].sort().map((k) => `variant_custom.${k}`);
    return [...base, ...custom];
}
