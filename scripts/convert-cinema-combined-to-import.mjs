/**
 * Convert the "Combined With Cinema Name Entry" raw client sheet into the Shopify-style
 * import CSV used by /vendor/media Import.
 *
 * Grouping rule (as requested): rows sharing the same Media Title + Latitude + Longitude
 * are one media with multiple variants (one variant per row).
 *
 * Maps:
 *   - Media Type       → media_type
 *   - State/City       → state/city
 *   - Area/Locality    → zone/locality
 *   - Media Title      → title
 *   - Address/Pincode/Landmark
 *   - Latitude/Longitude
 *   - Media Owner      → vendor_name
 *   - POC Name/Number/Email
 *   - Display Format   → display_format
 *   - Size             → screen_size (parent) + size (variant)
 *   - Screen Code      → variant_title disambiguator
 *   - Cinema Chain     → metafield.cinema_chain      (single-line-text metafield)
 *   - Audience Category/Seating/Cinema Format → variant columns
 *   - Auditorium       → option1_value
 *   - Rate             → variant.rate
 *
 * Usage:
 *   node scripts/convert-cinema-combined-to-import.mjs [input.csv] [output.csv]
 *
 * Defaults:
 *   input:  C:/Users/thear/Downloads/Cinema Entry.xlsx - Combined With Cinema Name Entry.csv
 *   output: C:/Users/thear/Downloads/cinema-combined-import.csv
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_IN =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/Cinema Entry.xlsx - Combined With Cinema Name Entry.csv'
        : path.join(process.env.HOME || '', 'Downloads/Cinema Entry.xlsx - Combined With Cinema Name Entry.csv');
const DEFAULT_OUT =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/cinema-combined-import.csv'
        : path.join(process.env.HOME || '', 'Downloads/cinema-combined-import.csv');

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
        } else if (c === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += c;
        }
    }
    result.push(current);
    return result.map((s) => s.replace(/\r$/, ''));
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
            lines.push(parseCsvLine(line));
            line = '';
        } else {
            line += c;
        }
    }
    if (line.length > 0) lines.push(parseCsvLine(line));
    return lines.filter((r) => r.some((c) => String(c || '').trim() !== ''));
}

function escapeCsv(val) {
    if (val == null || val === '') return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function normalizeMediaType(raw) {
    const s = String(raw || '').trim();
    if (/^cinema\s*screen$/i.test(s)) return 'Cinema Screen';
    return s;
}

function normStr(v) {
    return String(v ?? '').trim();
}

function numOrNull(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/** Grouping key: title + lat/lng to 6 decimals. */
function groupKey(title, lat, lng) {
    const t = normStr(title).toLowerCase().replace(/\s+/g, ' ');
    const la = numOrNull(lat);
    const ln = numOrNull(lng);
    if (la == null || ln == null) return `${t}|invalid`;
    return `${t}|${la.toFixed(6)}|${ln.toFixed(6)}`;
}

function slugHandle(title, used) {
    const base =
        normStr(title)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'media';
    let h = base;
    let n = 0;
    while (used.has(h)) {
        n += 1;
        h = `${base}-${n}`;
    }
    used.add(h);
    return h;
}

/** Source column indices (header row 2 of the raw sheet). */
const I = {
    sr: 0,
    mediaType: 1,
    state: 2,
    city: 3,
    area: 4,
    locality: 5,
    mediaTitle: 6,
    address: 7,
    pincode: 8,
    landmark: 9,
    lat: 10,
    lng: 11,
    details: 12,
    photos: 13,
    extLinks: 14,
    mediaOwner: 15,
    pocName: 16,
    pocNumber: 17,
    pocEmail: 18,
    displayFormat: 19,
    size: 20,
    screenCode: 21,
    cinemaChain: 22,
    audienceCategory: 23,
    seating: 24,
    cinemaFormat: 25,
    auditorium: 26,
    rate: 27,
};

const PARENT_COLS = [
    'handle',
    'id',
    'vendor_id',
    'title',
    'vendor_name',
    'state',
    'city',
    'zone',
    'locality',
    'address',
    'pincode',
    'landmark',
    'latitude',
    'longitude',
    'poc_name',
    'poc_number',
    'poc_email',
    'monthly_rental',
    'vendor_rate',
    'minimum_booking_duration',
    'media_type',
    'images',
    'screen_size',
    'display_format',
    'display_hours',
    'status',
    'option1_name',
    'option2_name',
    'option3_name',
    'pricing_rules_json',
    'metafield.cinema_chain',
];

const VARIANT_COLS = [
    'variant_id',
    'display_order',
    'option1_value',
    'option2_value',
    'option3_value',
    'variant_title',
    'audience_category',
    'seating',
    'cinema_format',
    'size',
    'rate',
];

const ALL_COLS = [...PARENT_COLS, ...VARIANT_COLS];

function emptyParentTail() {
    const o = {};
    for (const c of PARENT_COLS) o[c] = '';
    return o;
}

function buildVariantRow(cells, displayOrder) {
    const screenCode = normStr(cells[I.screenCode]);
    const auditorium = normStr(cells[I.auditorium]);
    const rateRaw = normStr(cells[I.rate]);
    const rate = rateRaw && !Number.isNaN(parseInt(rateRaw, 10)) ? String(parseInt(rateRaw, 10)) : '';

    // option1_value is the per-variant uniqueness key: prefer auditorium #, fall back to screen code.
    const option1 = auditorium || screenCode || String(displayOrder + 1);
    // variant_title is human readable — include screen code if present for operator clarity.
    const variantTitle = screenCode
        ? auditorium
            ? `Auditorium ${auditorium} (${screenCode})`
            : screenCode
        : auditorium
            ? `Auditorium ${auditorium}`
            : `Variant ${displayOrder + 1}`;

    return {
        variant_id: '',
        display_order: String(displayOrder),
        option1_value: option1,
        option2_value: '',
        option3_value: '',
        variant_title: variantTitle,
        audience_category: normStr(cells[I.audienceCategory]),
        seating: normStr(cells[I.seating]),
        cinema_format: normStr(cells[I.cinemaFormat]),
        size: normStr(cells[I.size]),
        rate,
    };
}

function main() {
    const inPath = process.argv[2] || DEFAULT_IN;
    const outPath = process.argv[3] || DEFAULT_OUT;

    if (!fs.existsSync(inPath)) {
        console.error('Input CSV not found:', inPath);
        process.exit(1);
    }

    const rows = parseCsv(fs.readFileSync(inPath, 'utf8'));
    if (rows.length < 3) {
        console.error('Expected at least 3 rows (banner, header, data).');
        process.exit(1);
    }

    // Header row 2 has the real column names; skip first banner + second header row.
    const dataRows = rows.slice(2);
    const groups = new Map();
    const skipped = { emptyTitle: 0, badCoords: 0, empty: 0 };

    for (const cells of dataRows) {
        if (!cells || cells.every((c) => !normStr(c))) {
            skipped.empty += 1;
            continue;
        }
        while (cells.length < 28) cells.push('');
        const title = normStr(cells[I.mediaTitle]);
        if (!title) {
            skipped.emptyTitle += 1;
            continue;
        }
        const key = groupKey(title, cells[I.lat], cells[I.lng]);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(cells);
    }

    const outLines = [];
    outLines.push(ALL_COLS.join(','));
    const usedHandles = new Set();

    for (const [, rowsInGroup] of groups) {
        rowsInGroup.sort((a, b) => {
            const sa = parseInt(normStr(a[I.sr]) || '0', 10) || 0;
            const sb = parseInt(normStr(b[I.sr]) || '0', 10) || 0;
            return sa - sb;
        });
        const first = rowsInGroup[0];
        const title = normStr(first[I.mediaTitle]);
        const handle = slugHandle(title, usedHandles);

        // Pick the first non-empty Cinema Chain across group rows (usually all rows agree).
        let cinemaChain = '';
        for (const r of rowsInGroup) {
            const v = normStr(r[I.cinemaChain]);
            if (v) {
                cinemaChain = v;
                break;
            }
        }

        const parent = {
            handle,
            id: '',
            vendor_id: '',
            title,
            vendor_name: normStr(first[I.mediaOwner]),
            state: normStr(first[I.state]),
            city: normStr(first[I.city]),
            zone: normStr(first[I.area]),
            locality: normStr(first[I.locality]),
            address: normStr(first[I.address]),
            pincode: normStr(first[I.pincode]),
            landmark: normStr(first[I.landmark]),
            latitude: normStr(first[I.lat]),
            longitude: normStr(first[I.lng]),
            poc_name: normStr(first[I.pocName]),
            poc_number: normStr(first[I.pocNumber]),
            poc_email: normStr(first[I.pocEmail]),
            monthly_rental: '',
            vendor_rate: '',
            minimum_booking_duration: '1 month',
            media_type: normalizeMediaType(first[I.mediaType]) || 'Cinema Screen',
            images: '',
            screen_size: normStr(first[I.size]),
            display_format: normStr(first[I.displayFormat]),
            display_hours: '',
            status: 'active',
            option1_name: 'Auditorium',
            option2_name: '',
            option3_name: '',
            pricing_rules_json: '',
            'metafield.cinema_chain': cinemaChain,
        };

        for (let v = 0; v < rowsInGroup.length; v++) {
            const tail = v === 0 ? parent : { ...emptyParentTail(), handle };
            const variant = buildVariantRow(rowsInGroup[v], v);
            const line = ALL_COLS.map((k) =>
                escapeCsv(k in variant ? variant[k] : tail[k] ?? '')
            ).join(',');
            outLines.push(line);
        }
    }

    fs.writeFileSync(outPath, outLines.join('\n') + '\n', 'utf8');
    const variantCount = outLines.length - 1;
    console.log('Input rows :', dataRows.length);
    console.log('Media      :', groups.size);
    console.log('Variants   :', variantCount);
    console.log('Skipped    :', JSON.stringify(skipped));
    console.log('Output     :', outPath);
}

main();
