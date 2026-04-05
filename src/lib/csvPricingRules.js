// Shared CSV encoding/decoding for media_pricing_rules (bulk import/export).

export const PRICING_RULE_SLOT_COUNT = 12;

/** Merge duplicate rules from repeated CSV rows (same name/option/multiplier). */
export function dedupePricingRules(rules) {
  const seen = new Set();
  const out = [];
  for (const r of rules) {
    const mult = Number(r.multiplier);
    const k = `${String(r.rule_name ?? "").trim()}\0${String(r.option_label ?? "").trim()}\0${mult}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      rule_name: String(r.rule_name ?? "").trim(),
      option_label: String(r.option_label ?? "").trim(),
      multiplier: mult,
    });
  }
  return out;
}

/**
 * Parse pricing rules from CSV row getters.
 * Priority: (1) numbered columns pricing_rule_N_* / pricing_condition_N_*
 * (2) pricing_rules_json
 * (3) legacy pricing_rules pipe string "Variant:Option:Mult|..."
 */
export function parsePricingRulesFromRow(get) {
  const errors = [];
  const rules = [];

  const jsonStr = String(get("pricing_rules_json") || "").trim();
  if (jsonStr) {
    try {
      const arr = JSON.parse(jsonStr);
      if (!Array.isArray(arr)) {
        errors.push("pricing_rules_json must be a JSON array");
        return { rules: [], errors };
      }
      arr.forEach((item, idx) => {
        const rn = String(item?.rule_name ?? item?.variant_name ?? "").trim();
        const ol = String(item?.option_label ?? item?.option ?? "").trim();
        const mult = Number(item?.multiplier);
        if (!rn || !ol) {
          errors.push(`pricing_rules_json[${idx}]: rule_name and option_label are required`);
          return;
        }
        if (!Number.isFinite(mult) || mult <= 0) {
          errors.push(`pricing_rules_json[${idx}]: multiplier must be a positive number`);
          return;
        }
        rules.push({ rule_name: rn, option_label: ol, multiplier: mult });
      });
      return { rules, errors };
    } catch {
      errors.push("pricing_rules_json is not valid JSON");
      return { rules: [], errors };
    }
  }

  let foundNumbered = false;
  for (let i = 1; i <= PRICING_RULE_SLOT_COUNT; i++) {
    const vn =
      get(`pricing_rule_${i}_variant_name`) ||
      get(`pricing_condition_${i}_variant_name`);
    const op =
      get(`pricing_rule_${i}_option`) || get(`pricing_condition_${i}_option`);
    const multStr =
      get(`pricing_rule_${i}_multiplier`) ||
      get(`pricing_condition_${i}_multiplier`);
    const hasAny = [vn, op, multStr].some((s) => String(s || "").trim());
    if (!hasAny) continue;
    foundNumbered = true;
    if (!vn || !op || !multStr) {
      errors.push(
        `pricing_rule_${i}_*: if any of variant_name, option, or multiplier is set, all three are required`
      );
      continue;
    }
    const mult = parseFloat(String(multStr).trim());
    if (!Number.isFinite(mult) || mult <= 0) {
      errors.push(`pricing_rule_${i}_multiplier must be a positive number`);
      continue;
    }
    rules.push({
      rule_name: String(vn).trim(),
      option_label: String(op).trim(),
      multiplier: mult,
    });
  }

  if (foundNumbered) {
    const legacy = String(get("pricing_rules") || "").trim();
    if (legacy) {
      errors.push(
        "Use either numbered pricing_rule_N_* columns or pricing_rules, not both"
      );
    }
    return { rules, errors };
  }

  const raw = String(get("pricing_rules") || "").trim();
  if (!raw) return { rules: [], errors };

  const segments = raw.split("|").map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const parts = seg.split(":");
    if (parts.length < 3) {
      errors.push(
        `Invalid pricing_rules segment "${seg}" — need at least VariantName:Option:Multiplier (or use numbered columns)`
      );
      continue;
    }
    const multStr = parts[parts.length - 1].trim();
    const optionLabel = parts[parts.length - 2].trim();
    const ruleName = parts.slice(0, -2).join(":").trim();
    const mult = parseFloat(multStr);
    if (!ruleName || !optionLabel) {
      errors.push(`Invalid pricing_rules segment "${seg}" — empty variant name or option`);
      continue;
    }
    if (!Number.isFinite(mult) || mult <= 0) {
      errors.push(`Invalid multiplier in pricing_rules segment "${seg}"`);
      continue;
    }
    rules.push({
      rule_name: ruleName,
      option_label: optionLabel,
      multiplier: mult,
    });
  }

  return { rules, errors };
}
