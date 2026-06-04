import fs from 'fs';

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQ) {
            if (c === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (c === '"') inQ = false;
            else field += c;
        } else if (c === '"') inQ = true;
        else if (c === ',') {
            row.push(field);
            field = '';
        } else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            if (c === '\r') i++;
        } else field += c;
    }
    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

function toObjects(rows) {
    const [headers, ...data] = rows;
    return data.map((r) =>
        Object.fromEntries(headers.map((h, i) => [h.trim(), (r[i] ?? '').trim()]))
    );
}

const rawPath =
    'C:/Users/thear/Downloads/Main Data Entry Media Hub.xlsx - Corporate Screens.csv';
const fmtPath = 'C:/Users/thear/Downloads/corporate-screens-import.csv';
const expPath = 'C:/Users/thear/Downloads/media_rows (2).csv';

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const rawRows = parseCsv(fs.readFileSync(rawPath, 'utf8'));
const fmtRows = parseCsv(fs.readFileSync(fmtPath, 'utf8'));
const expRows = parseCsv(fs.readFileSync(expPath, 'utf8'));

const rawHdrIdx = rawRows.findIndex((r) => (r[0] ?? '').includes('Sr. No.'));
const rawData = rawRows.slice(rawHdrIdx + 1).filter((r) => (r[6] ?? '').trim());

const fmtObjs = toObjects(fmtRows);
const expObjs = toObjects(expRows);

const fmtMedia = fmtObjs.filter((o) => o.title);
const expCorp = expObjs.filter((o) => o.media_type === 'Corporate Screen');

const rawTitleSet = new Set(rawData.map((r) => norm(r[6])));
const fmtTitleSet = new Set(fmtMedia.map((o) => norm(o.title)));
const expTitleSet = new Set(expCorp.map((o) => norm(o.title)));

const onlyRaw = [...rawTitleSet].filter((t) => !expTitleSet.has(t));
const onlyExp = [...expTitleSet].filter((t) => !rawTitleSet.has(t));
const onlyFmtNotExp = [...fmtTitleSet].filter((t) => !expTitleSet.has(t));
const onlyExpNotFmt = [...expTitleSet].filter((t) => !fmtTitleSet.has(t));

// Duplicate titles within each source
function dupes(setArr, label) {
    const counts = new Map();
    for (const t of setArr) counts.set(t, (counts.get(t) || 0) + 1);
    const d = [...counts.entries()].filter(([, n]) => n > 1);
    if (d.length) {
        console.log(`Duplicate titles in ${label}:`, d.length);
        d.slice(0, 10).forEach(([t, n]) => console.log(`  "${t}" x${n}`));
    }
}

console.log('=== COUNTS ===');
console.log('Raw data rows (with Media Title):', rawData.length);
console.log('Formatted import — media rows (with title):', fmtMedia.length);
console.log('Formatted import — total CSV rows (incl variants):', fmtObjs.length);
console.log('Supabase export — Corporate Screen:', expCorp.length);
console.log('Supabase export — all media types:', expObjs.length);

console.log('\n=== UNIQUE TITLES ===');
console.log('Raw unique titles:', rawTitleSet.size);
console.log('Formatted unique titles:', fmtTitleSet.size);
console.log('Export unique titles:', expTitleSet.size);

console.log('\n=== DIFF: raw vs export ===');
console.log('In raw, NOT in export:', onlyRaw.length);
onlyRaw.forEach((t) => console.log('  missing from DB:', t));
console.log('In export, NOT in raw:', onlyExp.length);
onlyExp.forEach((t) => console.log('  extra in DB:', t));

console.log('\n=== DIFF: formatted vs export ===');
console.log('In formatted, NOT in export:', onlyFmtNotExp.length);
onlyFmtNotExp.forEach((t) => console.log('  -', t));
console.log('In export, NOT in formatted:', onlyExpNotFmt.length);
onlyExpNotFmt.forEach((t) => console.log('  +', t));

// Check import duplicates by handle
const handleCounts = new Map();
for (const o of fmtMedia) {
    handleCounts.set(o.handle, (handleCounts.get(o.handle) || 0) + 1);
}
const dupHandles = [...handleCounts.entries()].filter(([, n]) => n > 1);
if (dupHandles.length) {
    console.log('\nDuplicate handles in formatted (should be 0):', dupHandles.length);
}

// Raw rows without title
const rawNoTitle = rawRows.slice(rawHdrIdx + 1).filter((r) => !(r[6] ?? '').trim());
console.log('\nRaw rows skipped (no title):', rawNoTitle.length);

// Duplicate titles in raw (same title, multiple rows)
const rawTitleCounts = new Map();
for (const r of rawData) {
    const t = norm(r[6]);
    rawTitleCounts.set(t, (rawTitleCounts.get(t) || 0) + 1);
}
const rawDupes = [...rawTitleCounts.entries()].filter(([, n]) => n > 1);
console.log('\nRaw duplicate titles:', rawDupes.length);
rawDupes.forEach(([t, n]) => console.log(`  "${t}" x${n}`));

// Duplicate titles in export
const expTitleCounts = new Map();
for (const o of expCorp) {
    const t = norm(o.title);
    expTitleCounts.set(t, (expTitleCounts.get(t) || 0) + 1);
}
const expDupes = [...expTitleCounts.entries()].filter(([, n]) => n > 1);
console.log('\nExport duplicate titles:', expDupes.length);
console.log('Extra export rows from dupes:', expDupes.reduce((s, [, n]) => s + n - 1, 0));
expDupes.slice(0, 15).forEach(([t, n]) => console.log(`  "${t}" x${n}`));
