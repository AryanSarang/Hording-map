/**
 * Convert "Main Data Entry Media Hub - Corporate Screens" client sheet into our
 * Shopify-style bulk import CSV (/vendor/media → Import).
 *
 * Source layout (row 0 = banner, row 1 = headers, row 2+ = data):
 *   Sr. No., Media Type, State, City, Area, Locality, Media Title, Address,
 *   Pincode, Landmark, Latitude, Longitude, Details, Photographs, External Links,
 *   Media Owner, POC Name, POC Number, POC Email, Display Format, Size,
 *   Number of Employees (approx.), Monthly Impressions, Pixel Ratio, Site ID,
 *   Tenant Details, Number of Screens, Rate
 *
 * Mapping notes:
 *   - "Corporate Screens" → media_type `Corporate Screen`
 *   - Area → zone, Locality → locality
 *   - Number of Screens → N variant rows (Screen 1..N), same as cafe Sheet7
 *   - Photographs → images (pipe-separated if multiple)
 *   - State is often blank → inferred from city / pincode / area
 *   - Lat+Lng sometimes combined in the Latitude column
 *
 * Metafields (create these in Vendor → Metafields before import):
 *   metafield.site_id, metafield.tenant_details, metafield.monthly_impressions,
 *   metafield.number_of_employees, metafield.pixel_ratio, metafield.screens
 *
 * Usage:
 *   node scripts/convert-corporate-screens-to-import.mjs [input.csv] [output.csv]
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_IN =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/Main Data Entry Media Hub.xlsx - Corporate Screens.csv'
        : path.join(process.env.HOME || '', 'Downloads/Main Data Entry Media Hub.xlsx - Corporate Screens.csv');
const DEFAULT_OUT =
    process.platform === 'win32'
        ? 'C:/Users/thear/Downloads/corporate-screens-import.csv'
        : path.join(process.env.HOME || '', 'Downloads/corporate-screens-import.csv');

const INDIAN_STATES = new Set([
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Puducherry', 'Chandigarh',
]);

/** City / region hints when State column is empty. */
const CITY_TO_STATE = {
    hyderabad: 'Telangana',
    secunderabad: 'Telangana',
    mumbai: 'Maharashtra',
    thane: 'Maharashtra',
    navi: 'Maharashtra',
    pune: 'Maharashtra',
    bengaluru: 'Karnataka',
    bangalore: 'Karnataka',
    chennai: 'Tamil Nadu',
    kolkata: 'West Bengal',
    delhi: 'Delhi',
    'new delhi': 'Delhi',
    noida: 'Uttar Pradesh',
    gurugram: 'Haryana',
    gurgaon: 'Haryana',
    lucknow: 'Uttar Pradesh',
    ahmedabad: 'Gujarat',
    jaipur: 'Rajasthan',
    indore: 'Madhya Pradesh',
    bhopal: 'Madhya Pradesh',
    kochi: 'Kerala',
    visakhapatnam: 'Andhra Pradesh',
    vizag: 'Andhra Pradesh',
    nagpur: 'Maharashtra',
    surat: 'Gujarat',
    vadodara: 'Gujarat',
    coimbatore: 'Tamil Nadu',
    chandigarh: 'Chandigarh',
};

/** First digit of Indian pincode → state (approximate). */
const PIN_PREFIX_STATE = {
    '1': 'Delhi',
    '2': 'Uttar Pradesh',
    '3': 'Rajasthan',
    '4': 'Maharashtra',
    '5': 'Telangana',
    '6': 'Tamil Nadu',
    '7': 'West Bengal',
    '8': 'Bihar',
    '9': 'Karnataka',
};

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
    photographs: 13,
    externalLinks: 14,
    mediaOwner: 15,
    pocName: 16,
    pocNumber: 17,
    pocEmail: 18,
    displayFormat: 19,
    size: 20,
    numberOfEmployees: 21,
    monthlyImpressions: 22,
    pixelRatio: 23,
    siteId: 24,
    tenantDetails: 25,
    numberOfScreens: 26,
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
    'metafield.site_id',
    'metafield.tenant_details',
    'metafield.monthly_impressions',
    'metafield.number_of_employees',
    'metafield.pixel_ratio',
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

function isStateName(s) {
    const t = normStr(s);
    if (!t) return false;
    if (INDIAN_STATES.has(t)) return true;
    return [...INDIAN_STATES].some(
        (st) => st.toLowerCase() === t.toLowerCase()
    );
}

function normalizeMediaType(raw) {
    const s = normStr(raw).toLowerCase();
    if (/corporate\s*screens?/.test(s)) return 'Corporate Screen';
    if (/cafe\s*screens?/.test(s)) return 'Cafe Screen';
    if (/cinema\s*screens?/.test(s)) return 'Cinema Screen';
    return 'Corporate Screen';
}

function parseRate(raw) {
    const s = normStr(raw).replace(/,/g, '');
    if (!s) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseScreenCount(raw) {
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

function parseCoords(latRaw, lngRaw) {
    let lat = normStr(latRaw);
    let lng = normStr(lngRaw);
    const combined = lat.includes(',') ? lat : lng.includes(',') ? lng : '';
    if (combined) {
        const [a, b] = combined.split(',').map((x) => x.trim());
        if (a && b) {
            lat = a;
            lng = b;
        }
    }
    return { lat, lng };
}

function inferStateFromCity(city) {
    const c = normStr(city).toLowerCase();
    if (!c) return '';
    if (CITY_TO_STATE[c]) return CITY_TO_STATE[c];
    for (const [key, state] of Object.entries(CITY_TO_STATE)) {
        if (c.includes(key)) return state;
    }
    if (/mumbai|andheri|borivali|bandra|bkc|malad|powai|dadar|ghatkopar|kharghar|vashi|airoli|turbhe|thane|kalyan|navi/i.test(c)) {
        return 'Maharashtra';
    }
    if (/hyderabad|secunderabad|hitech|gachibowli|madhapur|kondapur|nanakaramguda|kukatpally|uppal|begumpet|ameerpet|film nagar|banjara|serilingampally|kokapet|financial district/i.test(c)) {
        return 'Telangana';
    }
    if (/lucknow|gomti|vibhuti/i.test(c)) return 'Uttar Pradesh';
    if (/bengaluru|bangalore|whitefield|koramangala/i.test(c)) return 'Karnataka';
    if (/chennai|tambaram|omr/i.test(c)) return 'Tamil Nadu';
    if (/delhi|ncr|gurugram|gurgaon|noida|ghaziabad|faridabad/i.test(c)) return c.includes('noida') || c.includes('lucknow') ? 'Uttar Pradesh' : c.includes('gurugram') || c.includes('gurgaon') ? 'Haryana' : 'Delhi';
    return '';
}

function inferStateFromPincode(pincode) {
    const p = normStr(pincode);
    if (p.length < 1) return '';
    return PIN_PREFIX_STATE[p[0]] || '';
}

function resolveLocation(stateRaw, cityRaw, areaRaw, localityRaw, pincode) {
    let state = normStr(stateRaw);
    let city = normStr(cityRaw);
    const area = normStr(areaRaw);
    const locality = normStr(localityRaw);

    if (city.includes(',')) {
        const parts = city.split(',').map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
            const last = parts[parts.length - 1];
            if (isStateName(last)) {
                state = state || last;
                city = parts[0];
            }
        }
    }

    if (!state && isStateName(city)) {
        state = city;
        city =
            normStr(locality.split(',')[0]) ||
            (isStateName(area) ? '' : area) ||
            '';
    }

    if (!state && isStateName(area)) {
        state = area;
    }

    if (!state) {
        state =
            inferStateFromCity(city) ||
            inferStateFromCity(area) ||
            inferStateFromCity(locality) ||
            inferStateFromPincode(pincode) ||
            '';
    }

    if (!city || isStateName(city)) {
        city =
            normStr(locality.split(',')[0]) ||
            (isStateName(area) ? '' : area) ||
            city;
    }

    if (isStateName(city)) city = normStr(locality.split(',')[0]) || area || 'Unknown';

    return { state, city };
}

function buildAddress(addressRaw, locality, area, city) {
    const explicit = normStr(addressRaw);
    if (explicit) return explicit;
    return [locality, area, city].filter(Boolean).join(', ');
}

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
        console.error('Expected banner + header + data rows.');
        process.exit(1);
    }

    const dataRows = rows.slice(2);
    const outLines = [ALL_COLS.join(',')];
    const usedHandles = new Set();

    let mediaCount = 0;
    let variantCount = 0;
    let skipped = 0;
    let missingState = 0;
    let missingRate = 0;

    for (const cells of dataRows) {
        if (!cells || cells.every((c) => !normStr(c))) continue;
        while (cells.length < 28) cells.push('');

        const title = normStr(cells[I.mediaTitle]);
        if (!title) {
            skipped++;
            continue;
        }

        const { state, city } = resolveLocation(
            cells[I.state],
            cells[I.city],
            cells[I.area],
            cells[I.locality],
            cells[I.pincode]
        );
        if (!state) missingState++;

        const { lat, lng } = parseCoords(cells[I.lat], cells[I.lng]);
        const locality = normStr(cells[I.locality]);
        const area = normStr(cells[I.area]);
        const rate = parseRate(cells[I.rate]);
        if (rate == null) missingRate++;

        const size = normStr(cells[I.size]);
        const nScreens = parseScreenCount(cells[I.numberOfScreens]);
        const handle = slugHandle(title, usedHandles);

        const photoUrl = normStr(cells[I.photographs]);
        const extUrl = normStr(cells[I.externalLinks]);
        const images = [photoUrl, extUrl].filter(Boolean).join('|');

        const parent = {
            handle,
            id: '',
            vendor_id: '',
            title,
            vendor_name: normStr(cells[I.mediaOwner]) || 'Adonmo',
            state,
            city,
            zone: area,
            locality,
            address: buildAddress(cells[I.address], locality, area, city),
            pincode: normStr(cells[I.pincode]),
            landmark: normStr(cells[I.landmark]),
            latitude: lat,
            longitude: lng,
            poc_name: normStr(cells[I.pocName]),
            poc_number: normStr(cells[I.pocNumber]),
            poc_email: normStr(cells[I.pocEmail]),
            monthly_rental: rate != null ? String(rate) : '',
            vendor_rate: '',
            minimum_booking_duration: '1 month',
            media_type: normalizeMediaType(cells[I.mediaType]),
            images,
            screen_size: size,
            display_format: normStr(cells[I.displayFormat]),
            display_hours: '',
            status: 'active',
            option1_name: nScreens > 1 ? 'Screen' : '',
            option2_name: '',
            option3_name: '',
            pricing_rules_json: '',
            'metafield.site_id': normStr(cells[I.siteId]),
            'metafield.tenant_details': normStr(cells[I.tenantDetails]),
            'metafield.monthly_impressions': normStr(cells[I.monthlyImpressions]).replace(/,/g, ''),
            'metafield.number_of_employees': normStr(cells[I.numberOfEmployees]).replace(/,/g, ''),
            'metafield.pixel_ratio': normStr(cells[I.pixelRatio]),
            'metafield.screens': normStr(cells[I.numberOfScreens]),
        };

        const variants = Array.from({ length: nScreens }, (_, i) =>
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

    console.log('Input rows      :', dataRows.length);
    console.log('Media exported  :', mediaCount);
    console.log('Variant rows    :', variantCount);
    console.log('Skipped (no title):', skipped);
    console.log('Missing state   :', missingState, '(check manually if > 0)');
    console.log('Missing rate    :', missingRate, '(Rate column empty in source — add pricing later)');
    console.log('Output          :', outPath);
    console.log('');
    console.log('Before import, create these metafields (Vendor → Metafields):');
    console.log('  site_id              — Single line text');
    console.log('  tenant_details       — Multi-line text');
    console.log('  monthly_impressions  — Single line text (or Number)');
    console.log('  number_of_employees  — Single line text (or Number)');
    console.log('  pixel_ratio          — Single line text');
    console.log('  screens              — Single line text (optional; variants also capture count)');
}

main();
