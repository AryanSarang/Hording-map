/**
 * Convert "Cinema Entry" Data Entry + Variants CSVs into unified medvar import CSV.
 *
 * Groups rows with the same Media Title + latitude + longitude as one media (variants).
 * Embeds Cinepolis conditional pricing from Variants.csv as pricing_rules_json.
 *
 * Usage:
 *   node scripts/convert-cinema-entry-to-medvar.mjs [dataEntry.csv] [variants.csv] [out.csv]
 *
 * Defaults point at common Downloads paths; override if yours differ.
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_DATA =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/Cinema Entry.xlsx - Data Entry (1).csv'
        : path.join(process.env.HOME || '', 'Downloads/Cinema Entry.xlsx - Data Entry (1).csv');
const DEFAULT_VARIANTS =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/Cinema Entry.xlsx - Variants.csv'
        : path.join(process.env.HOME || '', 'Downloads/Cinema Entry.xlsx - Variants.csv');
const DEFAULT_OUT =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/cinema-entry-medvar-import.csv'
        : path.join(process.env.HOME || '', 'Downloads/cinema-entry-medvar-import.csv');

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
            result.push(current.trim());
            current = '';
        } else {
            current += c;
        }
    }
    result.push(current.trim());
    return result;
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
            if (line.trim()) lines.push(parseCsvLine(line));
            line = '';
        } else {
            line += c;
        }
    }
    if (line.trim()) lines.push(parseCsvLine(line));
    return lines;
}

function escapeCsv(val) {
    if (val == null || val === '') return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function parseMultiplier(cell) {
    const s = String(cell ?? '')
        .trim()
        .toLowerCase();
    if (!s || s === 'x') return 1;
    const m = s.match(/^([\d.]+)\s*x\s*$/);
    if (m) return Number(m[1]);
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Parse Variants sheet: Cinepolis multipliers in 3rd column (index 2). */
function parseVariantsPricing(content) {
    const lines = content.split(/\r?\n/);
    const rules = [];
    let currentRule = null;
    for (const raw of lines) {
        if (!raw.trim()) continue;
        const cells = parseCsvLine(raw);
        if (cells[0] === 'Variant Name') continue;
        const c0 = (cells[0] || '').replace(/^,+/, '').trim();
        const c1 = (cells[1] || '').trim();
        const c2 = (cells[2] || '').trim();
        if (c0) currentRule = c0;
        if (!currentRule || !c1 || c1 === 'Options (Radio buttons)') continue;
        if (c1 === 'Price Change') continue;
        const mult = parseMultiplier(c2);
        rules.push({ rule_name: currentRule, option_label: c1, multiplier: mult });
    }
    return rules;
}

function normalizeMediaType(raw) {
    const s = String(raw || '').trim();
    if (/^cinema\s*screen$/i.test(s)) return 'Cinema Screen';
    return s;
}

function groupKey(title, lat, lng) {
    const t = String(title || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return `${t}|invalid`;
    return `${t}|${la.toFixed(6)}|${ln.toFixed(6)}`;
}

function slugHandle(title, lat, lng, used) {
    const base = String(title || 'media')
        .trim()
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

// Column indices from row 2 header of Data Entry sheet
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
    audienceCategory: 22,
    seating: 23,
    cinemaFormat: 24,
    auditorium: 25,
    rate: 26,
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

function emptyParentTail() {
    const o = {};
    for (const c of PARENT_COLS) o[c] = '';
    return o;
}

function emptyVariantCols() {
    const o = {};
    for (const c of VARIANT_COLS) o[c] = '';
    return o;
}

function buildVariantRow(cells, displayOrder) {
    const aud = cells[I.auditorium] ?? '';
    const rateRaw = cells[I.rate] ?? '';
    const rate = rateRaw !== '' && !Number.isNaN(parseInt(rateRaw, 10)) ? String(parseInt(rateRaw, 10)) : '';
    return {
        variant_id: '',
        display_order: String(displayOrder),
        option1_value: String(aud).trim() || String(cells[I.screenCode] || '').trim() || '1',
        option2_value: '',
        option3_value: '',
        variant_title: String(cells[I.screenCode] || '').trim(),
        audience_category: String(cells[I.audienceCategory] || '').trim(),
        seating: String(cells[I.seating] || '').trim(),
        cinema_format: String(cells[I.cinemaFormat] || '').trim(),
        size: String(cells[I.size] || '').trim(),
        rate,
    };
}

function main() {
    const dataPath = process.argv[2] || DEFAULT_DATA;
    const variantsPath = process.argv[3] || DEFAULT_VARIANTS;
    const outPath = process.argv[4] || DEFAULT_OUT;

    if (!fs.existsSync(dataPath)) {
        console.error('Data Entry CSV not found:', dataPath);
        process.exit(1);
    }
    if (!fs.existsSync(variantsPath)) {
        console.error('Variants CSV not found:', variantsPath);
        process.exit(1);
    }

    const pricingRules = parseVariantsPricing(fs.readFileSync(variantsPath, 'utf8'));
    const pricingJson = JSON.stringify(pricingRules);

    const allRows = parseCsv(fs.readFileSync(dataPath, 'utf8'));
    if (allRows.length < 3) {
        console.error('Expected at least 3 rows (banner, header, data).');
        process.exit(1);
    }

    const headerRow = allRows[1];
    if (headerRow.length < 27) {
        console.warn('Header has fewer than 27 columns; mapping may be wrong.');
    }

    const dataRows = allRows.slice(2);
    const groups = new Map();

    for (const cells of dataRows) {
        if (!cells || cells.every((c) => !String(c || '').trim())) continue;
        if (cells.length < 27) {
            while (cells.length < 27) cells.push('');
        }
        const title = cells[I.mediaTitle] || '';
        const lat = cells[I.lat];
        const lng = cells[I.lng];
        const key = groupKey(title, lat, lng);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(cells);
    }

    const outLines = [];
    outLines.push([...PARENT_COLS, ...VARIANT_COLS].join(','));

    const usedHandles = new Set();

    for (const [, rows] of groups) {
        rows.sort((a, b) => {
            const sa = parseInt(String(a[I.sr] || '0'), 10) || 0;
            const sb = parseInt(String(b[I.sr] || '0'), 10) || 0;
            return sa - sb;
        });
        const first = rows[0];
        const title = String(first[I.mediaTitle] || '').trim();
        const handle = slugHandle(title, first[I.lat], first[I.lng], usedHandles);

        const parent = {
            handle,
            id: '',
            vendor_id: '',
            title,
            vendor_name: String(first[I.mediaOwner] || '').trim(),
            state: String(first[I.state] || '').trim(),
            city: String(first[I.city] || '').trim(),
            zone: String(first[I.area] || '').trim(),
            locality: String(first[I.locality] || '').trim(),
            address: String(first[I.address] || '').trim(),
            pincode: String(first[I.pincode] || '').trim(),
            landmark: String(first[I.landmark] || '').trim(),
            latitude: String(first[I.lat] ?? '').trim(),
            longitude: String(first[I.lng] ?? '').trim(),
            poc_name: String(first[I.pocName] || '').trim(),
            poc_number: String(first[I.pocNumber] || '').trim(),
            poc_email: String(first[I.pocEmail] || '').trim(),
            monthly_rental: '',
            vendor_rate: '',
            minimum_booking_duration: '1 month',
            media_type: normalizeMediaType(first[I.mediaType]),
            images: '',
            screen_size: String(first[I.size] || '').trim(),
            display_format: String(first[I.displayFormat] || '').trim(),
            display_hours: '',
            status: 'active',
            option1_name: 'Auditorium',
            option2_name: '',
            option3_name: '',
            pricing_rules_json: pricingJson,
        };

        for (let v = 0; v < rows.length; v++) {
            const tail = v === 0 ? parent : emptyParentTail();
            if (v > 0) {
                tail.handle = handle;
            }
            const variant = buildVariantRow(rows[v], v);
            const line = [...PARENT_COLS.map((k) => escapeCsv(tail[k])), ...VARIANT_COLS.map((k) => escapeCsv(variant[k]))].join(
                ','
            );
            outLines.push(line);
        }
    }

    fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
    console.log('Wrote', outPath);
    console.log('Media groups:', groups.size, 'CSV lines (incl. header):', outLines.length);
    console.log('Pricing rules from Variants:', pricingRules.length);
}

main();
