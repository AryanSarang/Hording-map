/**
 * Convert the raw "Cafe Screens" client sheet (Sheet7 format) into the Shopify-style
 * import CSV used by /vendor/media Import.
 *
 * Source columns (row 2 of the raw sheet):
 *   Sr. No., Media Type, State, City, Area, Locality, Media Title, Address,
 *   Pincode, Latitude, Longitude, Details, Media Owner, POC Name, POC Number,
 *   POC Email, Display Format, Size, Variants, Rate
 *
 * The `Variants` column is an integer N that means "this venue has N identical screens,
 * all at the same price". We therefore materialize N variants per row with option1_value
 * 1..N (option1_name = "Screen"), each carrying the same rate.
 *
 * Each source row becomes 1 parent row + (N-1) continuation variant rows in the output.
 *
 * Usage:
 *   node scripts/convert-cafe-screens-to-import.mjs [input.csv] [output.csv]
 *
 * Defaults:
 *   input:  C:/Users/thear/Downloads/Cinema Entry.xlsx - Sheet7.csv
 *   output: C:/Users/thear/Downloads/cafe-screens-import.csv
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_IN =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/Cinema Entry.xlsx - Sheet7.csv'
        : path.join(process.env.HOME || '', 'Downloads/Cinema Entry.xlsx - Sheet7.csv');
const DEFAULT_OUT =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/cafe-screens-import.csv'
        : path.join(process.env.HOME || '', 'Downloads/cafe-screens-import.csv');

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

/** Normalize source media type to our canonical set — client writes "Cafe Screens" (plural). */
function normalizeMediaType(raw) {
    const s = normStr(raw).toLowerCase();
    if (/cafe\s*screens?/.test(s)) return 'Cafe Screen';
    if (/cinema\s*screens?/.test(s)) return 'Cinema Screen';
    return normStr(raw) || 'Cafe Screen';
}

/** "4,000" → 4000; "" → null. */
function parseRate(raw) {
    const s = normStr(raw).replace(/,/g, '');
    if (!s) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseVariantCount(raw) {
    const s = normStr(raw);
    if (!s) return 1;
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
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

/** Column indices from row 2 header of the Cafe Screens sheet. */
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
    variants: 18,
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

function buildVariantRow(idx, rate, size) {
    const screenNum = idx + 1;
    return {
        variant_id: '',
        display_order: String(idx),
        option1_value: String(screenNum),
        option2_value: '',
        option3_value: '',
        variant_title: `Screen ${screenNum}`,
        audience_category: '',
        seating: '',
        cinema_format: '',
        size,
        rate: rate != null ? String(rate) : '',
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

    const dataRows = rows.slice(2);
    const outLines = [];
    outLines.push(ALL_COLS.join(','));
    const usedHandles = new Set();

    let mediaCount = 0;
    let variantCount = 0;

    for (const cells of dataRows) {
        if (!cells || cells.every((c) => !normStr(c))) continue;
        while (cells.length < 20) cells.push('');

        const title = normStr(cells[I.mediaTitle]);
        if (!title) continue;

        const handle = slugHandle(title, usedHandles);
        const rate = parseRate(cells[I.rate]);
        const size = normStr(cells[I.size]);
        const nVariants = parseVariantCount(cells[I.variants]);

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
            monthly_rental: '',
            vendor_rate: '',
            minimum_booking_duration: '1 month',
            media_type: normalizeMediaType(cells[I.mediaType]),
            images: '',
            screen_size: size,
            display_format: normStr(cells[I.displayFormat]),
            display_hours: '',
            status: 'active',
            option1_name: nVariants > 1 ? 'Screen' : '',
            option2_name: '',
            option3_name: '',
            pricing_rules_json: '',
        };

        // If only 1 screen, still emit one variant row so rate is captured per-variant
        // (importer uses variant.rate as the bookable price).
        const variants = Array.from({ length: nVariants }, (_, i) =>
            buildVariantRow(i, rate, size)
        );

        for (let v = 0; v < variants.length; v++) {
            const tail = v === 0 ? parent : { ...emptyParentTail(), handle };
            const variant = variants[v];
            const line = ALL_COLS.map((k) =>
                escapeCsv(k in variant ? variant[k] : tail[k] ?? '')
            ).join(',');
            outLines.push(line);
        }

        mediaCount++;
        variantCount += variants.length;
    }

    fs.writeFileSync(outPath, outLines.join('\n') + '\n', 'utf8');
    console.log('Input rows :', dataRows.length);
    console.log('Media      :', mediaCount);
    console.log('Variants   :', variantCount);
    console.log('Output     :', outPath);
}

main();
