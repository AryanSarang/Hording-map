// app/explore/_components/MapSection.js
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import './explore-map.css';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

const TILE_OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Per-media-type inner shape so advertisers can tell media types apart from the pin alone
 * (industry standard: Google Maps and Apple Maps use category glyphs inside their droplet
 * pins). Each entry returns an SVG fragment positioned to sit centered at (16, 14.5) — the
 * white circle area of the teardrop — at a consistent ~10px footprint.
 *
 * Glyphs are intentionally geometric (not full icons) so they render crisply at the marker
 * size on Leaflet and don't add weight to the per-pin divIcon HTML payload (which matters
 * with several hundred markers + clustering).
 */
const PIN_GLYPHS = {
    // Pentagon — film-strip silhouette evokes cinema.
    'Cinema Screen': '<polygon points="16,8.5 21,12.5 19,18.5 13,18.5 11,12.5" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>',
    // Filled circle with a hollow ring inside — cup-top silhouette.
    'Cafe Screen': '<circle cx="16" cy="14.5" r="5" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/><circle cx="16" cy="14.5" r="2" fill="none" stroke="#fff" stroke-width="1"/>',
    // Rounded landscape rectangle — bus/shelter silhouette.
    'Bus Shelter': '<rect x="10" y="11" width="12" height="7" rx="1.5" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>',
    // Square monitor.
    'Digital Screens': '<rect x="11" y="9.5" width="10" height="8" rx="0.5" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/><rect x="14" y="18.5" width="4" height="1" fill="#0a0a0a"/>',
    // Roof triangle — residential.
    'Residential': '<polygon points="16,8.5 22,15 22,19 10,19 10,15" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>',
    // Tall rectangle — briefcase / corporate screen.
    'Corporate Screen': '<rect x="11" y="11" width="10" height="8" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/><rect x="13.5" y="9.5" width="5" height="1.5" fill="#0a0a0a"/>',
    // Concentric circle — coffee machine.
    'Corporate Coffee Machines': '<circle cx="16" cy="14.5" r="5" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/><circle cx="16" cy="14.5" r="1.5" fill="#fff"/>',
    // Hexagon — Croma stores.
    'Croma Stores': '<polygon points="16,9 21,12 21,17 16,20 11,17 11,12" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>',
    // Diamond — ATM.
    'ATM': '<polygon points="16,9 21,14.5 16,20 11,14.5" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>',
    // Default dot — same as the original generic pin so unknown / "other" types still look right.
    'other': '<circle cx="16" cy="14.5" r="4.5" fill="#0a0a0a" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>',
};

function pinGlyph(mediaType) {
    return PIN_GLYPHS[mediaType] || PIN_GLYPHS.other;
}

/**
 * Teardrop pin SVG with a 3-way color scheme so users can tell at a glance:
 *   - yellow  → media currently being browsed (selected in details panel)
 *   - blue    → media already added to the active plan
 *   - green   → available media that's neither selected nor on the plan
 *
 * Priority: selected > inPlan > default. We still flag in-plan with a subtle blue ring
 * even when selected (yellow body), so users don't lose track of which sites are saved.
 * The inner glyph encodes media type — see PIN_GLYPHS above.
 */
function createExplorePinIcon({ selected, inPlan, mediaType }) {
    let fill = '#22c55e';
    if (selected) fill = '#facc15';
    else if (inPlan) fill = '#38bdf8';
    const filter = selected
        ? 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.65))'
        : inPlan
            ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.45))'
            : 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55))';
    const ringStroke = selected && inPlan ? '#38bdf8' : 'rgba(0,0,0,0.4)';
    const ringWidth = selected && inPlan ? 2 : 1;
    return L.divIcon({
        className: 'explore-map-pin',
        html: `
<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="filter:${filter}">
  <path d="M16 2C8.8 2 3 7.6 3 14.5c0 8.5 12.2 21.3 12.6 21.7.2.2.5.3.8.3s.6-.1.8-.3C17.6 35.8 29 23 29 14.5 29 7.6 23.2 2 16 2z" fill="${fill}" stroke="${ringStroke}" stroke-width="${ringWidth}"/>
  ${pinGlyph(mediaType)}
</svg>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -36],
    });
}

const DEFAULT_CENTER = [19.0760, 72.8777];

function MapController({ selectedId, hoardings, searchTarget, filterFocus }) {
    const map = useMap();

    const getLatLng = (h) => {
        const lat = h?.latitude ?? h?.lat;
        const lng = h?.longitude ?? h?.lng ?? h?.lon;
        const latNum = lat != null ? Number(lat) : NaN;
        const lngNum = lng != null ? Number(lng) : NaN;
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
        return [latNum, lngNum];
    };

    useEffect(() => {
        if (selectedId) {
            const target = hoardings.find((h) => String(h.id) === String(selectedId));
            const latLng = getLatLng(target);
            if (latLng) {
                map.flyTo(latLng, 16, { duration: 1.5 });
            }
        }
    }, [selectedId, hoardings, map]);

    useEffect(() => {
        if (!searchTarget) return;
        map.flyTo(searchTarget, 13, { duration: 1.3 });
    }, [searchTarget, map]);

    useEffect(() => {
        if (!filterFocus?.key || filterFocus.pointCount === 0) return;
        if (filterFocus.pointCount === 1 && filterFocus.center) {
            map.flyTo(filterFocus.center, filterFocus.zoom ?? 12, { duration: 1.2 });
            return;
        }
        if (filterFocus.bounds) {
            const b = L.latLngBounds(filterFocus.bounds[0], filterFocus.bounds[1]);
            map.fitBounds(b, { padding: [48, 48], maxZoom: 13, animate: true });
        }
    }, [filterFocus?.key, map]);
    return null;
}

/**
 * Inner component that captures the next map click and forwards it as `[lat, lng]`.
 * Mounted only while the user is in "place radius center" mode so we don't conflict
 * with normal pan/click behavior. Returns null — this is a pure side-effect component.
 */
function RadiusPlacer({ active, onPlace }) {
    useMapEvents({
        click(e) {
            if (!active) return;
            onPlace?.([e.latlng.lat, e.latlng.lng]);
        },
    });
    return null;
}

/**
 * `MapSection` is wrapped in `memo` because the map (Leaflet + clustering + pin
 * SVGs) is the most expensive component on the page to re-render. Every other
 * client interaction in `ExploreView` (filter draft changes, plan add/remove,
 * details-panel scroll, etc.) would otherwise trigger a wasted re-render. Our
 * setters from `useState` are stable refs so `memo`'s shallow comparison does
 * the right thing — actual data changes (hoardings, selectedId, planMediaIds,
 * radiusFilter, filterFocus) still flow through normally.
 */
function MapSection({
    hoardings,
    selectedId,
    onSelect,
    filterFocus,
    planMediaIds,
    radiusFilter,
    onRadiusFilterChange,
}) {
    const planIdSet = useMemo(() => {
        if (!planMediaIds) return new Set();
        if (planMediaIds instanceof Set) return planMediaIds;
        return new Set((planMediaIds || []).map((x) => String(x)));
    }, [planMediaIds]);

    /**
     * Lazy per-(mediaType × state) icon cache. We can't pre-build every combo because
     * mediaType is high-cardinality (10 canonical values × 4 states = 40 icons), and
     * Leaflet markers re-render frequently. The cache lives in a ref so toggling the
     * selected pin doesn't blow it away.
     */
    const iconCacheRef = useRef(new Map());
    function getPinIcon(mediaType, selected, inPlan) {
        if (typeof window === 'undefined') return null;
        const key = `${mediaType || 'other'}|${selected ? 1 : 0}|${inPlan ? 1 : 0}`;
        let cached = iconCacheRef.current.get(key);
        if (!cached) {
            cached = createExplorePinIcon({ selected, inPlan, mediaType });
            iconCacheRef.current.set(key, cached);
        }
        return cached;
    }

    const [searchValue, setSearchValue] = useState('');
    const [searchTarget, setSearchTarget] = useState(null);
    const [searching, setSearching] = useState(false);
    const [consumingCredits, setConsumingCredits] = useState(false);
    const consumingCreditsRef = useRef(false);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [debounceMs] = useState(350);
    /**
     * Top-of-list place suggestion served by Nominatim. We keep it separate from the
     * local media suggestions so the two-way nature is explicit in the UI (a place
     * pin icon vs the standard media row) and so a slow geocoder response never blocks
     * the media autocomplete from rendering.
     */
    const [placeSuggestion, setPlaceSuggestion] = useState(null);

    const getLatLng = (h) => {
        const lat = h?.latitude ?? h?.lat;
        const lng = h?.longitude ?? h?.lng ?? h?.lon;
        const latNum = lat != null ? Number(lat) : NaN;
        const lngNum = lng != null ? Number(lng) : NaN;
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
        return [latNum, lngNum];
    };

    const matchesMediaDetails = (h, qLower, tokens) => {
        const haystack = [
            h?.title,
            h?.displayTitle,
            h?.address,
            h?.locality,
            h?.landmark,
            h?.area,
            h?.city,
            h?.zone,
            h?.state,
            h?.roadName,
            h?.pincode,
            h?.mediaType,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        // Fast path: query is contained somewhere
        if (qLower && haystack.includes(qLower)) return true;

        // Token path: all tokens must exist (helps with "MG Road Mumbai" etc.)
        return tokens.length > 0 && tokens.every((t) => haystack.includes(t));
    };

    const buildSuggestions = (q) => {
        const query = String(q || '').trim();
        if (!query || query.length < 3) return [];

        const qLower = query.toLowerCase();
        const tokens = qLower.split(/[\s,]+/).filter(Boolean).slice(0, 8);

        // Only suggest items that can be mapped (have valid coordinates)
        const matches = hoardings
            .map((h) => {
                const latLng = getLatLng(h);
                if (!latLng) return null;
                const ok = matchesMediaDetails(h, qLower, tokens);
                if (!ok) return null;

                const label =
                    h.displayTitle ||
                    h.title ||
                    h.address ||
                    h.landmark ||
                    h.zone ||
                    `Site #${h.id}`;

                const sublabel = [h.locality, h.area, h.city, h.state].filter(Boolean).join(', ');
                return { id: h.id, latLng, label, sublabel };
            })
            .filter(Boolean)
            // Lightweight ranking: prefer longer direct contains
            .sort((a, b) => {
                const aScore = Number(String(a.label).toLowerCase().includes(qLower));
                const bScore = Number(String(b.label).toLowerCase().includes(qLower));
                return bScore - aScore;
            })
            .slice(0, 8);

        return matches;
    };

    useEffect(() => {
        if (!searchValue || searchValue.trim().length < 3) {
            setSuggestions([]);
            setSuggestionsOpen(false);
            setPlaceSuggestion(null);
            return;
        }

        const t = setTimeout(() => {
            const next = buildSuggestions(searchValue);
            setSuggestions(next);
            // Open even if local matches are empty, because we may still have a place suggestion to show.
            setSuggestionsOpen(true);
        }, debounceMs);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchValue, hoardings]);

    /**
     * Two-way search: in parallel with the local media autocomplete, hit Nominatim and
     * surface ONE place suggestion at the top of the dropdown. Clicking it just flies
     * the map to that location; it does not touch filters or open the details panel.
     *
     * Implementation notes:
     *   - 600ms debounce (Nominatim's rate limit is 1 req/sec, and we want to be polite).
     *   - AbortController on every typed character so we don't display stale results.
     *   - `countrycodes=in` biases results to India which is the only market we serve.
     *   - Network errors are swallowed silently — geocoding is a "nice to have" beside
     *     the local media list, which still works without it.
     */
    useEffect(() => {
        const q = String(searchValue || '').trim();
        if (q.length < 3) {
            setPlaceSuggestion(null);
            return;
        }
        const ac = new AbortController();
        const t = setTimeout(async () => {
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&addressdetails=1&q=${encodeURIComponent(q)}`;
                const res = await fetch(url, {
                    signal: ac.signal,
                    headers: { Accept: 'application/json' },
                });
                if (!res.ok) return;
                const arr = await res.json();
                const r = Array.isArray(arr) ? arr[0] : null;
                if (!r) {
                    setPlaceSuggestion(null);
                    return;
                }
                const lat = Number(r.lat);
                const lng = Number(r.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    setPlaceSuggestion(null);
                    return;
                }
                const labelParts = String(r.display_name || '').split(',').map((s) => s.trim()).filter(Boolean);
                setPlaceSuggestion({
                    latLng: [lat, lng],
                    label: labelParts[0] || r.display_name || q,
                    sublabel: labelParts.slice(1, 4).join(', '),
                });
            } catch (_err) {
                // network/abort errors: silently keep prior suggestion null
            }
        }, 600);
        return () => {
            ac.abort();
            clearTimeout(t);
        };
    }, [searchValue]);

    const consumeSearchCredits = async () => {
        if (consumingCreditsRef.current || searching) return false;

        setConsumingCredits(true);
        consumingCreditsRef.current = true;
        try {
            const res = await fetch('/api/credits/consume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'search', source: 'explore' }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data?.success === false) {
                if (res.status === 401) {
                    window.location.href = '/login';
                    return false;
                }
                throw new Error(data?.error || 'Failed to consume credits');
            }

            return true;
        } catch (err) {
            toast.error('Could not run search', { description: err?.message || 'Try again' });
            return false;
        } finally {
            setConsumingCredits(false);
            consumingCreditsRef.current = false;
        }
    };

    async function searchLocation() {
        const q = String(searchValue || '').trim();
        if (!q) return;
        if (q.length < 3) return;

        if (consumingCreditsRef.current || searching) return;
        const canProceed = await consumeSearchCredits();
        if (!canProceed) return;

        setSearching(true);
        try {
            // 1) First search inside your existing media dataset (address/locality/landmark/city/zone/state etc.)
            const qLower = q.toLowerCase();
            const tokens = qLower.split(/[\s,]+/).filter(Boolean).slice(0, 8);

            const internalMatches = hoardings
                .map((h) => {
                    const latLng = getLatLng(h);
                    if (!latLng) return null;
                    const ok = matchesMediaDetails(h, qLower, tokens);
                    return ok ? { id: h.id, latLng, match: h } : null;
                })
                .filter(Boolean)
                .slice(0, 5);

            if (internalMatches.length > 0) {
                const first = internalMatches[0];
                setSearchTarget(first.latLng);
                onSelect?.(first.id);
                return;
            }

            // 2) Fallback to OSM geocoding if nothing matches inside media fields.
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
            const res = await fetch(url, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);

            const results = await res.json();
            if (!Array.isArray(results) || results.length === 0) return;

            const first = results[0];
            const lat = Number(first?.lat);
            const lng = Number(first?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            setSearchTarget([lat, lng]);
        } catch (e) {
            // Silently ignore to avoid breaking explore map UI.
            // (We can add a toast later if needed.)
        } finally {
            setSearching(false);
        }
    }

    /**
     * Radius state is owned by ExploreView (so FilterPanel can render the controls and
     * the filtering pipeline can consume it). Here we just need to expose the active
     * place-mode flag, the current center, the slider value (for the circle overlay),
     * and a callback to push a freshly-clicked center back up.
     */
    const radiusActive = Boolean(radiusFilter?.active);
    const radiusCenter = radiusFilter?.center || null;
    const radiusKm = Number(radiusFilter?.radiusKm) || 10;
    function placeRadiusCenter(latLng) {
        onRadiusFilterChange?.({
            ...radiusFilter,
            center: latLng,
            // Auto-exit place mode after a successful drop so the user can pan again.
            active: false,
        });
    }

    return (
        <div className="explore-map-root w-full h-full relative isolate bg-[#dcdfe2]">
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* While radius-place mode is active the user's next map click drops the
                center. The full radius controls live in the FilterPanel; this thin
                banner is just a non-blocking hint so they understand the cursor change. */}
            {radiusActive && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1500] pointer-events-none">
                    <div className="bg-amber-400 text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg inline-flex items-center gap-1.5">
                        <Crosshair size={12} /> Click the map to place radius center
                    </div>
                </div>
            )}

            {/* --- SEARCH BAR (Floating on Map) --- */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[40%] max-w-md">
                <div className="relative shadow-2xl">
                    <input
                        type="text"
                        placeholder="Search location..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') searchLocation();
                        }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-600 bg-black/80 text-white placeholder-gray-400 backdrop-blur-xl focus:bg-black focus:border-green-500 outline-none text-xs transition-all shadow-lg"
                        disabled={searching || consumingCredits}
                        onFocus={() => {
                            if ((searchValue || '').trim().length >= 3 && suggestions.length > 0) {
                                setSuggestionsOpen(true);
                            }
                        }}
                    />
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    {suggestionsOpen && (
                        <div
                            className="absolute top-[calc(100%+10px)] left-0 right-0 bg-black/90 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-[1100]"
                            onMouseDown={(e) => e.preventDefault()} // keep focus for input
                        >
                            <div className="max-h-72 overflow-y-auto no-scrollbar">
                                {placeSuggestion && (
                                    <>
                                        <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wide bg-black/40">
                                            Place
                                        </div>
                                        <button
                                            type="button"
                                            className="w-full text-left px-3 py-2 hover:bg-gray-900 transition-colors border-b border-gray-800 flex items-start gap-2"
                                            onClick={() => {
                                                /**
                                                 * Per spec (#5): clicking a place result only flies the map.
                                                 * It does NOT change filters, consume search credits, or
                                                 * open the details panel. Place lookups via Nominatim are
                                                 * free; only media-row clicks (below) cost a credit.
                                                 */
                                                setSuggestionsOpen(false);
                                                setSearchTarget(placeSuggestion.latLng);
                                            }}
                                        >
                                            <MapPin size={14} className="mt-0.5 text-amber-400 shrink-0" />
                                            <span className="min-w-0">
                                                <div className="text-xs font-medium text-white truncate">
                                                    {placeSuggestion.label}
                                                </div>
                                                {placeSuggestion.sublabel ? (
                                                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                                        {placeSuggestion.sublabel}
                                                    </div>
                                                ) : null}
                                            </span>
                                        </button>
                                    </>
                                )}
                                {suggestions.length > 0 && (
                                    <>
                                        <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wide bg-black/40">
                                            Media
                                        </div>
                                        {suggestions.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 hover:bg-gray-900 transition-colors border-b border-gray-800 last:border-b-0"
                                                onClick={async () => {
                                                    setSuggestionsOpen(false);
                                                    const canProceed = await consumeSearchCredits();
                                                    if (!canProceed) return;
                                                    setSearchTarget(s.latLng);
                                                    onSelect?.(s.id);
                                                }}
                                            >
                                                <div className="text-xs font-normal text-white truncate">
                                                    {s.label}
                                                </div>
                                                {s.sublabel ? (
                                                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                                        {s.sublabel}
                                                    </div>
                                                ) : null}
                                            </button>
                                        ))}
                                    </>
                                )}
                                {!placeSuggestion && suggestions.length === 0 && (
                                    <div className="px-3 py-3 text-xs text-gray-500">
                                        Searching…
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <MapContainer
                center={DEFAULT_CENTER}
                zoom={11}
                scrollWheelZoom={true}
                zoomControl={false}
                className="w-full h-full z-0"
                style={{
                    height: "100%",
                    width: "100%",
                    cursor: radiusActive ? 'crosshair' : undefined,
                }}
            >
                {/* OSM: parent-zoom tiles scale up until z-level tiles arrive; updateWhenIdle=false requests sooner. */}
                <TileLayer
                    attribution={TILE_ATTRIBUTION}
                    url={TILE_OSM}
                    maxZoom={19}
                    maxNativeZoom={19}
                    updateWhenIdle={false}
                    keepBuffer={4}
                />

                <ZoomControl position="bottomright" />

                <MapController selectedId={selectedId} hoardings={hoardings} searchTarget={searchTarget} filterFocus={filterFocus} />

                <RadiusPlacer active={radiusActive} onPlace={placeRadiusCenter} />

                {radiusCenter && (
                    <Circle
                        center={radiusCenter}
                        radius={Number(radiusKm) * 1000}
                        pathOptions={{
                            color: '#22c55e',
                            weight: 2,
                            fillColor: '#22c55e',
                            fillOpacity: 0.08,
                        }}
                    />
                )}

                <MarkerClusterGroup chunkedLoading spiderfyOnMaxZoom={true}>
                    {hoardings.map((h) => (
                        getLatLng(h) ? (
                            <Marker
                                key={h.id}
                                position={getLatLng(h)}
                                icon={getPinIcon(
                                    h.mediaType,
                                    String(selectedId) === String(h.id),
                                    planIdSet.has(String(h.id))
                                )}
                                eventHandlers={{
                                    click: () => onSelect(h.id),
                                }}
                            >
                                <Popup className="explore-map-popup">
                                    <div className="explore-map-popup-title">
                                        {h.displayTitle || h.title || h.address || h.landmark || h.zone || `Site #${h.id}`}
                                    </div>
                                </Popup>
                            </Marker>
                        ) : null
                    ))}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}

export default memo(MapSection);