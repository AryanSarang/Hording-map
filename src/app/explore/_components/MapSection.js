// app/explore/_components/MapSection.js
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import './explore-map.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

const TILE_OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Teardrop pin SVG — green accent, dark inner dot (matches explore panels). */
function createExplorePinIcon(selected) {
    const fill = selected ? '#4ade80' : '#22c55e';
    const filter = selected
        ? 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.55))'
        : 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55))';
    return L.divIcon({
        className: 'explore-map-pin',
        html: `
<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="filter:${filter}">
  <path d="M16 2C8.8 2 3 7.6 3 14.5c0 8.5 12.2 21.3 12.6 21.7.2.2.5.3.8.3s.6-.1.8-.3C17.6 35.8 29 23 29 14.5 29 7.6 23.2 2 16 2z" fill="${fill}" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
  <circle cx="16" cy="14.5" r="4.5" fill="#0a0a0a" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
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
            const target = hoardings.find(h => h.id === selectedId);
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

export default function MapSection({ hoardings, selectedId, onSelect, filterFocus }) {
    const pinIcons = useMemo(() => {
        if (typeof window === 'undefined') return { default: null, selected: null };
        return {
            default: createExplorePinIcon(false),
            selected: createExplorePinIcon(true),
        };
    }, []);

    const [searchValue, setSearchValue] = useState('');
    const [searchTarget, setSearchTarget] = useState(null);
    const [searching, setSearching] = useState(false);
    const [consumingCredits, setConsumingCredits] = useState(false);
    const consumingCreditsRef = useRef(false);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [debounceMs] = useState(350);

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
            return;
        }

        const t = setTimeout(() => {
            const next = buildSuggestions(searchValue);
            setSuggestions(next);
            setSuggestionsOpen(next.length > 0);
        }, debounceMs);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchValue, hoardings]);

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

    return (
        <div className="explore-map-root w-full h-full relative isolate bg-[#dcdfe2]">
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

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
                            <div className="p-2 border-b border-gray-800 text-[10px] text-gray-400 uppercase tracking-wide">
                                Suggestions
                            </div>
                            <div className="max-h-56 overflow-y-auto no-scrollbar">
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
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution={TILE_ATTRIBUTION}
                    url={TILE_OSM}
                />

                <ZoomControl position="bottomright" />

                <MapController selectedId={selectedId} hoardings={hoardings} searchTarget={searchTarget} filterFocus={filterFocus} />

                <MarkerClusterGroup chunkedLoading spiderfyOnMaxZoom={true}>
                    {hoardings.map((h) => (
                        getLatLng(h) ? (
                            <Marker
                                key={h.id}
                                position={getLatLng(h)}
                                icon={selectedId === h.id ? pinIcons.selected : pinIcons.default}
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