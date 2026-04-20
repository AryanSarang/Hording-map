/**
 * Convert the raw "Cafe Screens" client sheet (Sheet8 format) into the Shopify-style
 * import CSV used by /vendor/media Import.
 *
 * Source columns (row 2 of the raw sheet):
 *   Sr. No., Media Type, State, City, Area, Locality, Media Title, Address,
 *   Pincode, Latitude, Longitude, Details, Media Owner, POC Name, POC Number,
 *   POC Email, Display Format, Size, Number of Screens, Rate
 *
 * Unlike Sheet7 (where `Variants` expanded into N separate variant rows), the client
 * now wants `Number of Screens` captured as metadata — the "screens" vendor metafield
 * (key `screens`) already exists, so this converter writes that number into
 * `metafield.screens` on each parent row. Each venue emits exactly one media + one
 * variant (single bookable unit per venue).
 *
 * Usage:
 *   node scripts/convert-cafe-screens-meta-to-import.mjs [input.csv] [output.csv]
 *
 * Defaults:
 *   input:  C:/Users/thear/Downloads/Cinema Entry.xlsx - Sheet8.csv
 *   output: C:/Users/thear/Downloads/cafe-screens-meta-import.csv
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_IN =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/Cinema Entry.xlsx - Sheet8.csv'
        : path.join(process.env.HOME || '', 'Downloads/Cinema Entry.xlsx - Sheet8.csv');
const DEFAULT_OUT =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/cafe-screens-meta-import.csv'
        : path.join(process.env.HOME || '', 'Downloads/cafe-screens-meta-import.csv');

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

function normStr(v) {
    return String(v ?? '').trim();
}

function normalizeMediaType(raw) {
    const s = normStr(raw).toLowerCase();
    if (/cafe\s*screens?/.test(s)) return 'Cafe Screen';
    if (/cinema\s*screens?/.test(s)) return 'Cinema Screen';
    return normStr(raw) || 'Cafe Screen';
}

function parseRate(raw) {
    const s = normStr(raw).replace(/,/g, '');
    if (!s) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
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

/** Column indices from row 2 header of Sheet8. */
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
    lat: 9,
    lng: 10,
    details: 11,
    mediaOwner: 12,
    pocName: 13,
    pocNumber: 14,
    pocEmail: 15,
    displayFormat: 16,
    size: 17,
    numberOfScreens: 18,
    rate: 19,
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
    'metafield.screens',
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

    const dataRows = rows.slice(2);
    const outLines = [];
    outLines.push(ALL_COLS.join(','));
    const usedHandles = new Set();

    let mediaCount = 0;
    let skipped = 0;

    for (const cells of dataRows) {
        if (!cells || cells.every((c) => !normStr(c))) continue;
        while (cells.length < 20) cells.push('');

        const title = normStr(cells[I.mediaTitle]);
        if (!title) {
            skipped++;
            continue;
        }

        const handle = slugHandle(title, usedHandles);
        const rate = parseRate(cells[I.rate]);
        const size = normStr(cells[I.size]);
        const screensRaw = normStr(cells[I.numberOfScreens]);

        const parent = {
            handle,
            id: '',
            vendor_id: '',
            title,
            vendor_name: normStr(cells[I.mediaOwner]),
            state: normStr(cells[I.state]),
            city: normStr(cells[I.city]),
            zone: normStr(cells[I.area]),
            locality: normStr(cells[I.locality]),
            address: normStr(cells[I.address]),
            pincode: normStr(cells[I.pincode]),
            landmark: '',
            latitude: normStr(cells[I.lat]),
            longitude: normStr(cells[I.lng]),
            poc_name: normStr(cells[I.pocName]),
            poc_number: normStr(cells[I.pocNumber]),
            poc_email: normStr(cells[I.pocEmail]),
            // Each venue is one bookable unit (screen count is just metadata), so we
            // store the price in monthly_rental and skip variant rows entirely.
            // The explore catalog falls back to monthly_rental when a media has no variants.
            monthly_rental: rate != null ? String(rate) : '',
            vendor_rate: '',
            minimum_booking_duration: '1 month',
            media_type: normalizeMediaType(cells[I.mediaType]),
            images: '',
            screen_size: size,
            display_format: normStr(cells[I.displayFormat]),
            display_hours: '',
            status: 'active',
            option1_name: '',
            option2_name: '',
            option3_name: '',
            pricing_rules_json: '',
            'metafield.screens': screensRaw,
        };

        // All variant columns stay empty — importer sees no option1_value and creates a
        // no-variants media (has_variants = false).
        const line = ALL_COLS.map((k) => escapeCsv(parent[k] ?? '')).join(',');
        outLines.push(line);
        mediaCount++;
    }

    fs.writeFileSync(outPath, outLines.join('\n') + '\n', 'utf8');
    console.log('Input rows :', dataRows.length);
    console.log('Media      :', mediaCount);
    console.log('Skipped    :', skipped);
    console.log('Output     :', outPath);
}

main();
