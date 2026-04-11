"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Download,
    Trash2,
    Filter,
    MapPinned,
    List,
    IndianRupee,
    Boxes,
    Building2,
    Target,
    LocateFixed
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import '../../explore/_components/explore-map.css';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

export default function PlanDetailsPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [plan, setPlan] = useState(null);
    const [media, setMedia] = useState([]);
    const [variants, setVariants] = useState([]);
    const [saving, setSaving] = useState(false);
    const [filters, setFilters] = useState({ city: '', mediaType: '', q: '' });
    const [viewMode, setViewMode] = useState('split');
    const [selectedMediaId, setSelectedMediaId] = useState(null);

    async function loadPlan() {
        try {
            setLoading(true);
            const res = await fetch(`/api/plans/${encodeURIComponent(params.id)}`, { credentials: 'include' });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load plan');
            setPlan(data.plan || null);
            setMedia(Array.isArray(data.media) ? data.media : []);
            setVariants(Array.isArray(data.variants) ? data.variants : []);
        } catch (err) {
            setError(err?.message || 'Failed to load plan');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!cancelled) await loadPlan();
        })();
        return () => { cancelled = true; };
    }, [params.id]);

    const mediaById = useMemo(() => Object.fromEntries(media.map((m) => [m.id, m])), [media]);
    const variantsByMedia = useMemo(() => {
        const out = {};
        variants.forEach((v) => {
            if (!out[v.media_id]) out[v.media_id] = [];
            out[v.media_id].push(v);
        });
        Object.keys(out).forEach((k) => {
            out[k].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        });
        return out;
    }, [variants]);

    const cityOptions = useMemo(
        () => Array.from(new Set(media.map((m) => m.city).filter(Boolean))).sort(),
        [media]
    );
    const mediaTypeOptions = useMemo(
        () => Array.from(new Set(media.map((m) => m.media_type).filter(Boolean))).sort(),
        [media]
    );

    const filteredItems = useMemo(() => {
        const items = Array.isArray(plan?.items) ? plan.items : [];
        return items.filter((item) => {
            const m = mediaById[item.mediaId];
            if (!m) return false;
            if (filters.city && m.city !== filters.city) return false;
            if (filters.mediaType && m.media_type !== filters.mediaType) return false;
            if (filters.q) {
                const q = filters.q.toLowerCase();
                const hay = `${m.title || ''} ${m.address || ''} ${m.landmark || ''} ${m.city || ''} ${m.state || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [plan?.items, mediaById, filters]);

    const metrics = useMemo(() => {
        const mediaCount = filteredItems.length;
        const cityCount = new Set(
            filteredItems
                .map((it) => mediaById[it.mediaId]?.city)
                .filter(Boolean)
        ).size;

        let selectedVariantCount = 0;
        let estimatedCost = 0;

        filteredItems.forEach((item) => {
            const availableVariants = variantsByMedia[item.mediaId] || [];
            const idSet = new Set((Array.isArray(item.variantIds) ? item.variantIds : []).map(String));
            const selected =
                idSet.size > 0
                    ? availableVariants.filter((v) => idSet.has(String(v.id)))
                    : availableVariants;

            selectedVariantCount += selected.length;
            selected.forEach((v) => {
                const val = Number(v?.rate);
                if (Number.isFinite(val)) estimatedCost += val;
            });
        });

        return { mediaCount, cityCount, selectedVariantCount, estimatedCost };
    }, [filteredItems, mediaById, variantsByMedia]);

    const mapPoints = useMemo(() => (
        filteredItems
            .map((item) => {
                const m = mediaById[item.mediaId];
                if (!m) return null;
                const lat = Number(m.latitude ?? m.lat);
                const lng = Number(m.longitude ?? m.lng ?? m.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                return {
                    item,
                    media: m,
                    lat,
                    lng,
                };
            })
            .filter(Boolean)
    ), [filteredItems, mediaById]);

    const defaultCenter = useMemo(() => {
        if (mapPoints.length > 0) return [mapPoints[0].lat, mapPoints[0].lng];
        return [20.5937, 78.9629];
    }, [mapPoints]);

    async function saveItems(nextItems) {
        if (!plan) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/plans/${encodeURIComponent(plan.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ items: nextItems }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update plan');
            setPlan(data.plan);
        } catch (err) {
            setError(err?.message || 'Failed to update plan');
        } finally {
            setSaving(false);
        }
    }

    async function removeMediaFromPlan(mediaId) {
        if (!plan) return;
        const nextItems = (plan.items || []).filter((it) => it.mediaId !== mediaId);
        await saveItems(nextItems);
    }

    async function removeVariantFromPlan(mediaId, variantId) {
        if (!plan) return;
        const mediaVariants = variantsByMedia[mediaId] || [];
        const nextItems = (plan.items || []).map((it) => {
            if (it.mediaId !== mediaId) return it;
            const currentIds = Array.isArray(it.variantIds) ? it.variantIds : [];
            // Empty variantIds means "all variants selected" -> convert to explicit then remove one.
            const explicitIds = currentIds.length > 0 ? currentIds : mediaVariants.map((v) => v.id);
            const nextVariantIds = explicitIds.filter((id) => String(id) !== String(variantId));
            return { ...it, variantIds: nextVariantIds };
        }).filter((it) => {
            if (it.mediaId !== mediaId) return true;
            return Array.isArray(it.variantIds) && it.variantIds.length > 0;
        });
        await saveItems(nextItems);
    }

    function exportCsv() {
        const headers = [
            'plan_id', 'plan_name', 'media_id', 'city', 'state', 'media_type', 'address',
            'variant_id', 'variant_title', 'option1_value', 'option2_value', 'option3_value', 'variant_rate'
        ];
        const rows = [];
        for (const item of filteredItems) {
            const m = mediaById[item.mediaId];
            if (!m) continue;
            const allVariants = variantsByMedia[item.mediaId] || [];
            const idSet = new Set((Array.isArray(item.variantIds) ? item.variantIds : []).map(String));
            const selected = idSet.size > 0
                ? allVariants.filter((v) => idSet.has(String(v.id)))
                : allVariants;
            if (selected.length === 0) {
                rows.push([
                    plan.id, plan.name, m.id, m.city || '', m.state || '', m.media_type || '', m.address || '',
                    '', '', '', '', '', ''
                ]);
                continue;
            }
            selected.forEach((v) => {
                rows.push([
                    plan.id,
                    plan.name,
                    m.id,
                    m.city || '',
                    m.state || '',
                    m.media_type || '',
                    m.address || '',
                    v.id || '',
                    v.variant_title || '',
                    v.option1_value || '',
                    v.option2_value || '',
                    v.option3_value || '',
                    v.rate ?? ''
                ]);
            });
        }
        const escape = (val) => {
            const s = String(val ?? '');
            if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `plan-${plan?.id || 'export'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-gray-800 mb-6">
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Plan</p>
                        <h1 className="text-lg sm:text-xl font-medium text-white leading-snug">{plan?.name || 'Plan'}</h1>
                        {plan && (
                            <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wide">
                                {(Array.isArray(plan.items) ? plan.items.length : 0)} media in plan
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/plans"
                            className="px-3 py-2 rounded-lg border border-gray-700 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:border-green-500/60 hover:text-green-400 transition-colors"
                        >
                            All Plans
                        </Link>
                        <Link
                            href="/explore"
                            className="px-3 py-2 rounded-lg border border-gray-700 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:border-green-500/60 hover:text-green-400 transition-colors"
                        >
                            Explore
                        </Link>
                    </div>
                </div>

                {loading && <div className="text-xs text-gray-500 uppercase tracking-wide">Loading plan…</div>}
                {error && <div className="text-xs text-red-400 border border-red-500/30 bg-red-950/20 rounded-lg px-3 py-2">{error}</div>}

                {!loading && !error && plan && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                            <div className="rounded-lg border border-gray-800 bg-[#111] p-3">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Media in Plan</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <Target size={15} className="text-green-400" />
                                    <p className="text-lg font-medium text-white">{metrics.mediaCount}</p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-gray-800 bg-[#111] p-3">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Variants</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <Boxes size={15} className="text-green-400/90" />
                                    <p className="text-lg font-medium text-white">{metrics.selectedVariantCount}</p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-gray-800 bg-[#111] p-3">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cities</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <Building2 size={15} className="text-green-400/90" />
                                    <p className="text-lg font-medium text-white">{metrics.cityCount}</p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-gray-800 bg-[#111] p-3">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Est. Total</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <IndianRupee size={15} className="text-green-400" />
                                    <p className="text-lg font-medium text-green-400">₹{Math.round(metrics.estimatedCost).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
                            <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <Filter size={12} />
                                Filters
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                <select
                                    value={filters.city}
                                    onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                                    className="bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-green-500/60"
                                >
                                    <option value="">All Cities</option>
                                    {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select
                                    value={filters.mediaType}
                                    onChange={(e) => setFilters((f) => ({ ...f, mediaType: e.target.value }))}
                                    className="bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-green-500/60"
                                >
                                    <option value="">All Media Types</option>
                                    {mediaTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <input
                                    value={filters.q}
                                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                                    placeholder="Search title / address / city"
                                    className="bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-green-500/60"
                                />
                                <button
                                    type="button"
                                    onClick={exportCsv}
                                    className="inline-flex items-center justify-center gap-2 bg-[#0a0a0a] border border-gray-700 hover:border-green-500/60 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-white transition-colors"
                                >
                                    <Download size={14} />
                                    Export CSV
                                </button>
                                <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('list')}
                                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex-1 ${viewMode === 'list' ? 'bg-green-600 text-black' : 'bg-[#0a0a0a] text-gray-400 hover:text-gray-200'}`}
                                    >
                                        <List size={14} />
                                        List
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('split')}
                                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex-1 border-l border-gray-700 ${viewMode === 'split' ? 'bg-green-600 text-black' : 'bg-[#0a0a0a] text-gray-400 hover:text-gray-200'}`}
                                    >
                                        <MapPinned size={14} />
                                        Split
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={`grid gap-4 ${viewMode === 'split' ? 'xl:grid-cols-[1.2fr_1fr]' : 'grid-cols-1'}`}>
                            <div className="space-y-3">
                                {filteredItems.map((item, idx) => {
                                    const mediaId = item.mediaId;
                                    const m = mediaById[mediaId];
                                    const selectedVariantIds = Array.isArray(item.variantIds) ? item.variantIds : [];
                                    const variantIdSet = new Set(selectedVariantIds.map(String));
                                    const availableVariants = variantsByMedia[mediaId] || [];
                                    const selectedVariants = variantIdSet.size > 0
                                        ? availableVariants.filter((v) => variantIdSet.has(String(v.id)))
                                        : availableVariants;
                                    const isSelected = selectedMediaId === mediaId;

                                    return (
                                        <div
                                            key={`${mediaId}-${idx}`}
                                            className={`rounded-lg border p-3 cursor-pointer transition ${isSelected ? 'border-green-500/70 bg-[#111a14]' : 'border-gray-800 bg-[#111] hover:border-gray-700'}`}
                                            onClick={() => setSelectedMediaId(mediaId)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-medium text-white leading-snug">{m?.title || m?.address || m?.landmark || mediaId}</h3>
                                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">
                                                        {[m?.city, m?.state, m?.media_type].filter(Boolean).join(' · ')}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedMediaId(mediaId);
                                                        }}
                                                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-500 hover:text-green-400"
                                                    >
                                                        <LocateFixed size={12} />
                                                        Focus map
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeMediaFromPlan(mediaId);
                                                    }}
                                                    className="shrink-0 inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-400/60 rounded-lg px-2 py-1.5 disabled:opacity-60"
                                                    title="Remove media from plan"
                                                    aria-label="Remove media from plan"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-gray-800">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                                    {selectedVariantIds.length > 0 ? 'Variants' : 'All Variants'}
                                                </p>
                                                <div className="space-y-1.5">
                                                    {selectedVariants.length === 0 && (
                                                        <p className="text-xs text-gray-600">No variants.</p>
                                                    )}
                                                    {selectedVariants.map((v) => (
                                                        <div key={v.id} className="flex items-center justify-between gap-3 text-xs text-gray-300 bg-[#1a1a1a] border border-gray-800 rounded px-2 py-1.5">
                                                            <span className="min-w-0 truncate">
                                                                {(v.variant_title || [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(' / '))}
                                                                {v.rate ? <span className="text-green-400 font-medium"> · ₹{v.rate.toLocaleString()}</span> : null}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                disabled={saving}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeVariantFromPlan(mediaId, v.id);
                                                                }}
                                                                className="shrink-0 inline-flex items-center justify-center text-red-400 hover:text-red-300 border border-red-500/35 hover:border-red-400/55 rounded p-1 disabled:opacity-60"
                                                                title="Remove variant"
                                                                aria-label="Remove variant"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!saving && filteredItems.length === 0 && (
                                    <div className="text-xs text-gray-600 uppercase tracking-wide">No media match filters.</div>
                                )}
                            </div>

                            {viewMode === 'split' && (
                                <div className="explore-map-root rounded-lg border border-gray-800 bg-[#dcdfe2] p-3 h-[620px] sticky top-4">
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Map</p>
                                    {mapPoints.length === 0 ? (
                                        <div className="h-[calc(100%-2rem)] flex items-center justify-center text-xs text-gray-600 uppercase tracking-wide bg-[#111] rounded-lg border border-gray-800">
                                            No locations for current filters.
                                        </div>
                                    ) : (
                                        <MapContainer
                                            center={defaultCenter}
                                            zoom={11}
                                            scrollWheelZoom
                                            className="w-full h-[580px] rounded-lg z-0"
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            {mapPoints.map(({ media: m, item, lat, lng }) => {
                                                const active = selectedMediaId === m.id;
                                                const availV = variantsByMedia[m.id] || [];
                                                const vset = new Set((Array.isArray(item.variantIds) ? item.variantIds : []).map(String));
                                                const selectedVariantCount = vset.size > 0
                                                    ? availV.filter((v) => vset.has(String(v.id))).length
                                                    : availV.length;
                                                return (
                                                    <CircleMarker
                                                        key={m.id}
                                                        center={[lat, lng]}
                                                        radius={active ? 10 : 7}
                                                        pathOptions={{
                                                            color: active ? '#15803d' : '#22c55e',
                                                            fillColor: active ? '#22c55e' : '#4ade80',
                                                            fillOpacity: active ? 0.95 : 0.75,
                                                            weight: active ? 2 : 1,
                                                        }}
                                                        eventHandlers={{
                                                            click: () => setSelectedMediaId(m.id),
                                                        }}
                                                    >
                                                        <Popup className="explore-map-popup">
                                                            <div className="explore-map-popup-title text-xs">
                                                                {m.title || m.address || m.landmark || m.id}
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 mt-1">{[m.city, m.state].filter(Boolean).join(', ')}</p>
                                                            <p className="text-[10px] text-green-400/90 mt-1 font-medium">Variants: {selectedVariantCount}</p>
                                                        </Popup>
                                                    </CircleMarker>
                                                );
                                            })}
                                        </MapContainer>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
