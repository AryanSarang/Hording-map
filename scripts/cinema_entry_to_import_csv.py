# Convert "Cinema Entry" Data Entry + Variants sheets into medvar unified import CSV.
# Usage:
#   python scripts/cinema_entry_to_import_csv.py "path/to/Data Entry.csv" "path/to/Variants.csv" "path/to/out.csv"

from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict


def rules_cinepolis() -> list[dict]:
    """From Variants.csv — Cinepolis column (base)."""
    return [
        {"rule_name": "Season", "option_label": "Non Festive (JAN - SEPT)", "multiplier": 1},
        {"rule_name": "Season", "option_label": "Festive (OCT - DEC)", "multiplier": 1.2},
        {"rule_name": "Ad Creative Duration", "option_label": "10 sec", "multiplier": 1},
        {"rule_name": "Ad Creative Duration", "option_label": "20 sec", "multiplier": 2},
        {"rule_name": "Ad Creative Duration", "option_label": "30 sec", "multiplier": 3},
        {"rule_name": "Campaign Period", "option_label": "1 week", "multiplier": 1},
        {"rule_name": "Campaign Period", "option_label": "2 week", "multiplier": 2},
        {"rule_name": "Campaign Period", "option_label": "3 week", "multiplier": 3},
        {"rule_name": "Movie Type", "option_label": "Normal", "multiplier": 1},
        {"rule_name": "Movie Type", "option_label": "Block Buster", "multiplier": 1.5},
        {"rule_name": "Movie Type", "option_label": "Mega Block Buster", "multiplier": 2},
        {"rule_name": "Premium Positioning", "option_label": "Sponsorship tags", "multiplier": 2},
        {"rule_name": "Premium Positioning", "option_label": "BMP(Before Movie Play) Last", "multiplier": 2},
        {"rule_name": "Premium Positioning", "option_label": "Second Last in BMP", "multiplier": 1.5},
        {"rule_name": "Premium Positioning", "option_label": "Third Last in BMP", "multiplier": 1.5},
        {"rule_name": "Premium Positioning", "option_label": "Interval First", "multiplier": 2},
        {"rule_name": "Premium Positioning", "option_label": "Interval Second", "multiplier": 1.5},
        {"rule_name": "Premium Positioning", "option_label": "Interval Third", "multiplier": 1.5},
        {"rule_name": "Premium Positioning", "option_label": "Interval Last", "multiplier": 2},
        {"rule_name": "Premium Positioning", "option_label": "Second Last in Interval", "multiplier": 1.5},
        {"rule_name": "Premium Positioning", "option_label": "Third Last in Interval", "multiplier": 1.5},
    ]


def rules_miraj() -> list[dict]:
    """Same as Cinepolis except Movie Type multipliers (Miraj column in Variants.csv)."""
    base = rules_cinepolis()
    out = []
    for r in base:
        if r["rule_name"] == "Movie Type":
            if r["option_label"] == "Normal":
                out.append({**r, "multiplier": 1})
            elif r["option_label"] == "Block Buster":
                out.append({**r, "multiplier": 1.3})
            elif r["option_label"] == "Mega Block Buster":
                out.append({**r, "multiplier": 1.5})
        else:
            out.append(dict(r))
    return out


def normalize_media_type(_raw: str) -> str:
    """Dashboard import only accepts exact enum values; this extract is all cinema inventory."""
    return "Cinema Screen"


def pricing_for_owner(media_owner: str) -> list[dict]:
    o = (media_owner or "").lower()
    if "miraj" in o:
        return rules_miraj()
    return rules_cinepolis()


def norm_latlng(v: str) -> str:
    if not v or not str(v).strip():
        return ""
    try:
        return f"{float(str(v).strip()):.8f}"
    except ValueError:
        return str(v).strip()


def group_key(row: dict) -> str:
    return "|".join(
        [
            norm_latlng(row.get("Latitude", "")),
            norm_latlng(row.get("Longitude", "")),
            (row.get("Address") or "").strip().lower(),
            (row.get("City") or "").strip().lower(),
            (row.get("State") or "").strip().lower(),
        ]
    )


def escape_csv(val) -> str:
    if val is None or val == "":
        return ""
    s = str(val)
    if "," in s or '"' in s or "\n" in s or "\r" in s:
        return '"' + s.replace('"', '""') + '"'
    return s


def int_rate(raw: str) -> str:
    if not raw or not str(raw).strip():
        return ""
    try:
        return str(int(float(str(raw).strip())))
    except ValueError:
        return str(raw).strip()


def media_title_for_site(first: dict) -> str:
    """Display title for media row; importer also uses it to build an internal grouping slug when handle is omitted."""
    name = (first.get("Cinema Name") or "").strip()
    city = (first.get("City") or "").strip()
    addr = (first.get("Address") or "").strip()
    parts = [p for p in [name, city] if p]
    if parts:
        return " — ".join(parts)
    return addr or "Cinema Screen"


HEADERS = [
    "title",
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
]


def parent_row(
    title: str,
    first: dict,
    pricing_json: str,
    variant_cells: list[str],
) -> list[str]:
    return [
        title,
        (first.get("Media Owner") or "").strip(),
        (first.get("State") or "").strip(),
        (first.get("City") or "").strip(),
        (first.get("Area") or "").strip(),
        (first.get("Locality") or "").strip(),
        (first.get("Address") or "").strip(),
        (first.get("Pincode") or "").strip(),
        (first.get("Landmark") or "").strip(),
        (first.get("Latitude") or "").strip(),
        (first.get("Longitude") or "").strip(),
        (first.get("POC Name") or "").strip(),
        (first.get("POC Number") or "").strip(),
        (first.get("POC Email") or "").strip(),
        "",
        "",
        "1 month",
        normalize_media_type(first.get("Media Type")),
        "",
        (first.get("Size") or "").strip(),
        (first.get("Display Format") or "").strip(),
        "",
        "active",
        "Auditorium",
        "",
        "",
        pricing_json,
        *variant_cells,
    ]


def continuation_row(variant_cells: list[str]) -> list[str]:
    # Empty parent cells: title .. pricing_rules_json (matches HEADERS before variant columns)
    parent_cols = HEADERS.index("variant_id")
    return [*([""] * parent_cols), *variant_cells]


def variant_cells_from_row(r: dict, display_order: int) -> list[str]:
    aud = (r.get("Auditorium") or "").strip()
    sc = (r.get("Screen Code") or "").strip()
    opt1 = aud if aud else sc
    title = (r.get("Cinema Name") or "").strip()
    if sc and sc not in title:
        title = f"{title} — {sc}" if title else sc
    return [
        "",
        str(display_order),
        opt1,
        "",
        "",
        title,
        (r.get("Audience Category") or "").strip(),
        int_rate(r.get("Seating", "")) if (r.get("Seating") or "").strip() else "",
        (r.get("Cinema Format") or "").strip(),
        (r.get("Size") or "").strip(),
        int_rate(r.get("Rate", "")),
    ]


def main() -> None:
    if len(sys.argv) < 4:
        print(
            "Usage: python cinema_entry_to_import_csv.py <Data Entry.csv> <Variants.csv> <output.csv>",
            file=sys.stderr,
        )
        sys.exit(1)
    data_path, _variants_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

    with open(data_path, newline="", encoding="utf-8-sig", errors="replace") as f:
        lines = f.read().splitlines()

    # Skip Excel title row; header is first line starting with "Sr. No."
    start = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("Sr. No.") or line.strip().startswith('"Sr. No.'):
            start = i
            break
    text = "\n".join(lines[start:])
    from io import StringIO

    reader = csv.DictReader(StringIO(text))
    rows = [row for row in reader if any((v or "").strip() for v in row.values())]

    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        k = group_key(row)
        groups[k].append(row)

    out_lines = [",".join(HEADERS)]
    for _k, grp in sorted(groups.items(), key=lambda x: (x[1][0].get("State", ""), x[1][0].get("City", ""), x[1][0].get("Address", ""))):
        first = grp[0]
        owner = first.get("Media Owner") or ""
        pricing = pricing_for_owner(owner)
        pricing_json = json.dumps(pricing, ensure_ascii=False)
        site_title = media_title_for_site(first)

        def sort_key(r: dict):
            a = (r.get("Auditorium") or "").strip()
            try:
                return (0, int(float(a)))
            except ValueError:
                return (1, a)

        grp_sorted = sorted(grp, key=sort_key)

        v0 = variant_cells_from_row(grp_sorted[0], 0)
        out_lines.append(",".join(escape_csv(c) for c in parent_row(site_title, first, pricing_json, v0)))
        for j, r in enumerate(grp_sorted[1:], start=1):
            vj = variant_cells_from_row(r, j)
            out_lines.append(",".join(escape_csv(c) for c in continuation_row(vj)))

    with open(out_path, "w", encoding="utf-8", newline="") as out:
        out.write("\n".join(out_lines) + "\n")

    print(f"Wrote {len(out_lines) - 1} data rows ({len(groups)} media sites) to {out_path}")


if __name__ == "__main__":
    main()
