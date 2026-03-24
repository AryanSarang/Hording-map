import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/authServer';

const overpassCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30;
const POI_KEYWORDS = ['hospital', 'temple', 'school', 'college', 'park', 'mall'];
const MEDIA_TYPE_DICT = [
  { key: 'cinema', aliases: ['cinema'] },
  { key: 'busshelter', aliases: ['bus shelter', 'bus-shelter', 'busshelter'] },
  { key: 'billboard', aliases: ['billboard', 'hoarding'] },
  { key: 'digital', aliases: ['digital', 'dooh', 'digital screen'] },
];

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeKey(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function titleCase(value) {
  const v = String(value || '').trim();
  if (!v) return v;
  return v
    .split(/\s+/)
    .map((s) => s[0].toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');
}

function parseBudgetFromPrompt(prompt) {
  const normalized = prompt.replace(/,/g, '').toLowerCase();
  let m = normalized.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|lacs)/i);
  if (m) return Number(m[1]) * 100000;
  m = normalized.match(/(\d+(?:\.\d+)?)\s*(crore|cr)/i);
  if (m) return Number(m[1]) * 10000000;
  m = normalized.match(/(?:budget|under|upto|up to|around)\s*(?:is\s*)?(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)/i);
  if (m) return Number(m[1]);
  m = normalized.match(/(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)/i);
  if (m) return Number(m[1]);
  return 0;
}

function parseMaxItemsFromPrompt(prompt) {
  const m = prompt.match(/(?:top|select|pick|add)\s+(\d{1,2})/i);
  if (!m) return 15;
  return Math.max(1, Math.min(Number(m[1]), 50));
}

function extractMediaTypesFromPrompt(prompt) {
  const p = normalizeText(prompt);
  const set = new Set();
  for (const entry of MEDIA_TYPE_DICT) {
    if (entry.aliases.some((a) => p.includes(a))) set.add(entry.key);
  }
  return Array.from(set);
}

function extractPoiFromPrompt(prompt) {
  const p = normalizeText(prompt);
  return POI_KEYWORDS.filter((k) => p.includes(k));
}

function extractCityFromPrompt(prompt) {
  const regexes = [
    /(?:in|at|for)\s+([a-zA-Z ]{2,40})/gi,
    /city\s*(?:is|:)?\s*([a-zA-Z ]{2,40})/gi,
  ];
  for (const regex of regexes) {
    let m;
    while ((m = regex.exec(prompt)) !== null) {
      const c = String(m[1] || '').replace(/[^a-zA-Z ]/g, '').trim();
      if (c.length >= 2 && c.split(' ').length <= 3) return titleCase(c);
    }
  }
  return '';
}

function extractNumericMeta(meta, keys) {
  for (const key of keys) {
    const raw = meta[key];
    if (raw == null) continue;
    const num = Number(String(raw).replace(/[^\d.]/g, ''));
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function normalizeRange(value, min, max) {
  if (!Number.isFinite(value)) return 0.5;
  if (max <= min) return 0.5;
  return (value - min) / (max - min);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function poiTagForType(type) {
  switch (type) {
    case 'hospital':
      return ['amenity', 'hospital'];
    case 'temple':
      return ['amenity', 'place_of_worship'];
    case 'school':
      return ['amenity', 'school'];
    case 'college':
      return ['amenity', 'college'];
    case 'park':
      return ['leisure', 'park'];
    case 'mall':
      return ['shop', 'mall'];
    default:
      return null;
  }
}

async function fetchPoisForBbox(bboxKey, bbox, poiTypes) {
  const cached = overpassCache.get(bboxKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const clauses = [];
  for (const type of poiTypes) {
    const tag = poiTagForType(type);
    if (!tag) continue;
    const [k, v] = tag;
    clauses.push(`node["${k}"="${v}"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});`);
    clauses.push(`way["${k}"="${v}"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});`);
    clauses.push(`relation["${k}"="${v}"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});`);
  }

  if (clauses.length === 0) return [];

  const query = `[out:json][timeout:20];(${clauses.join('')});out center 200;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) {
    throw new Error('POI enrichment unavailable');
  }
  const json = await res.json();
  const elements = Array.isArray(json?.elements) ? json.elements : [];
  const data = elements
    .map((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        lat,
        lon,
        tags: el.tags || {},
      };
    })
    .filter(Boolean);

  overpassCache.set(bboxKey, { ts: Date.now(), data });
  return data;
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const prompt = String(body.prompt || '').trim();
    let planName = String(body.planName || '').trim();
    let city = String(body.city || '').trim();
    let budget = parseNumber(body.budget, 0);
    let mediaTypes = Array.isArray(body.mediaTypes) ? body.mediaTypes.map((x) => normalizeKey(x)) : [];
    let poiPreferences = Array.isArray(body.poiPreferences) ? body.poiPreferences.map((x) => normalizeText(x)).filter(Boolean) : [];
    let maxItems = Math.max(1, Math.min(parseNumber(body.maxItems, 15), 50));

    if (prompt) {
      if (!budget) budget = parseBudgetFromPrompt(prompt);
      if (!city) city = extractCityFromPrompt(prompt);
      if (!mediaTypes.length) mediaTypes = extractMediaTypesFromPrompt(prompt);
      if (!poiPreferences.length) poiPreferences = extractPoiFromPrompt(prompt);
      if (!planName) planName = `AI Plan - ${city || 'General'}`;
      if (!body.maxItems) maxItems = parseMaxItemsFromPrompt(prompt);
    }
    if (!planName) planName = `AI Plan - ${city || 'General'}`;
    const cityKey = normalizeKey(city);

    if (!city || !budget || mediaTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not extract city, budget, or media types from prompt. Please mention these explicitly.' },
        { status: 400 }
      );
    }

    let { data: mediaRows, error: mediaErr } = await supabaseAdmin
      .from('media')
      .select('id, city, media_type, latitude, longitude, monthly_rental, traffic_type')
      .ilike('city', city)
      .limit(1200);

    if (mediaErr) throw mediaErr;
    if (!mediaRows?.length) {
      const fallback = await supabaseAdmin
        .from('media')
        .select('id, city, media_type, latitude, longitude, monthly_rental, traffic_type')
        .limit(2000);
      if (fallback.error) throw fallback.error;
      mediaRows = (fallback.data || []).filter((row) => normalizeKey(row.city) === cityKey);
    }
    if (!mediaRows?.length) {
      return NextResponse.json({ success: false, error: 'No media found for selected city/types' }, { status: 404 });
    }

    const mediaIds = mediaRows.map((r) => r.id);

    const [{ data: variants, error: varErr }, { data: metas, error: metaErr }] = await Promise.all([
      supabaseAdmin
        .from('media_variants')
        .select('media_id, rate')
        .in('media_id', mediaIds),
      supabaseAdmin
        .from('media_metafields')
        .select('media_id, key, value')
        .in('media_id', mediaIds),
    ]);
    if (varErr) throw varErr;
    if (metaErr) throw metaErr;

    const minVariantRate = {};
    for (const row of variants || []) {
      const rate = parseNumber(row.rate, NaN);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      const prev = minVariantRate[row.media_id];
      if (!Number.isFinite(prev) || rate < prev) minVariantRate[row.media_id] = rate;
    }

    const metaByMedia = {};
    for (const row of metas || []) {
      if (!metaByMedia[row.media_id]) metaByMedia[row.media_id] = {};
      metaByMedia[row.media_id][normalizeText(row.key)] = row.value;
    }

    const candidates = mediaRows
      .map((row) => {
        const rate = parseNumber(minVariantRate[row.id], parseNumber(row.monthly_rental, 0));
        return {
          id: row.id,
          city: row.city,
          mediaType: row.media_type,
          lat: Number(row.latitude),
          lng: Number(row.longitude),
          rate,
          trafficType: normalizeText(row.traffic_type),
          meta: metaByMedia[row.id] || {},
        };
      })
      .filter((c) => mediaTypes.includes(normalizeKey(c.mediaType)))
      .filter((c) => Number.isFinite(c.rate) && c.rate > 0 && c.rate <= budget);

    if (!candidates.length) {
      return NextResponse.json({ success: false, error: 'No media fit the specified budget' }, { status: 404 });
    }

    // One POI request per planning request (bbox around all candidates).
    let poiData = [];
    if (poiPreferences.length > 0) {
      const validGeo = candidates.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
      if (validGeo.length > 0) {
        const lats = validGeo.map((x) => x.lat);
        const lngs = validGeo.map((x) => x.lng);
        const pad = 0.04;
        const bbox = {
          s: Math.min(...lats) - pad,
          w: Math.min(...lngs) - pad,
          n: Math.max(...lats) + pad,
          e: Math.max(...lngs) + pad,
        };
        const bboxKey = `${city}:${bbox.s.toFixed(2)}:${bbox.w.toFixed(2)}:${bbox.n.toFixed(2)}:${bbox.e.toFixed(2)}:${poiPreferences.join(',')}`;
        try {
          poiData = await fetchPoisForBbox(bboxKey, bbox, poiPreferences);
        } catch {
          poiData = [];
        }
      }
    }

    const rates = candidates.map((c) => c.rate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    const scored = candidates.map((c) => {
      const audience = extractNumericMeta(c.meta, ['audience', 'audience_size', 'footfall', 'daily_footfall']) || 0;
      const traffic = extractNumericMeta(c.meta, ['traffic_index', 'traffic', 'traffic_score']) || (c.trafficType.includes('high') ? 80 : c.trafficType.includes('low') ? 20 : 50);

      let poiScore = 50;
      if (poiData.length > 0 && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
        let minDist = Infinity;
        for (const poi of poiData) {
          const d = haversineKm(c.lat, c.lng, poi.lat, poi.lon);
          if (d < minDist) minDist = d;
        }
        if (Number.isFinite(minDist)) {
          // <=0.5km excellent, >=5km weak
          const proximity = 1 - Math.min(Math.max((minDist - 0.5) / 4.5, 0), 1);
          poiScore = proximity * 100;
        }
      }

      const costEfficiency = 1 - normalizeRange(c.rate, minRate, maxRate);
      const reachProxy = Math.min(100, audience > 0 ? audience / 100 : traffic);
      const relevance = poiPreferences.length > 0 ? poiScore : 50;
      const quality = traffic;

      const totalScore =
        0.3 * (reachProxy / 100) +
        0.35 * (relevance / 100) +
        0.25 * costEfficiency +
        0.1 * (quality / 100);

      return {
        ...c,
        score: totalScore,
        reasons: {
          reachProxy,
          relevance,
          costEfficiency: Math.round(costEfficiency * 100),
          quality,
        },
      };
    });

    // Greedy by value density and score, constrained by budget and max items.
    const ranked = scored.sort((a, b) => (b.score / b.rate) - (a.score / a.rate));
    let remaining = budget;
    const selected = [];
    for (const item of ranked) {
      if (selected.length >= maxItems) break;
      if (item.rate <= remaining) {
        selected.push(item);
        remaining -= item.rate;
      }
    }

    if (!selected.length) {
      return NextResponse.json({ success: false, error: 'No feasible media combination found' }, { status: 404 });
    }

    const selectedIds = selected.map((x) => x.id);
    const spend = selected.reduce((sum, x) => sum + x.rate, 0);

    const { data: createdPlan, error: planErr } = await supabaseAdmin
      .from('plans')
      .insert({
        user_id: user.id,
        name: planName,
        items: selectedIds,
      })
      .select('*')
      .single();
    if (planErr) throw planErr;

    return NextResponse.json({
      success: true,
      plan: createdPlan,
      analysis: {
        totalCandidates: candidates.length,
        selectedCount: selected.length,
        spend,
        remainingBudget: remaining,
        topSelections: selected.slice(0, 5).map((x) => ({
          id: x.id,
          rate: x.rate,
          score: Number(x.score.toFixed(4)),
          reasons: x.reasons,
        })),
      },
    });
  } catch (error) {
    console.error('POST /api/plans/ai error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate AI plan' },
      { status: 500 }
    );
  }
}

