"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, X } from "lucide-react";

/**
 * Radius filter block rendered inside FilterPanel.
 *
 * Why this is its own component:
 *   - Slider drag was visibly laggy when each pointer-move propagated up through
 *     ExploreView → catalog filtering → marker re-render. We now keep the slider
 *     value LOCAL while the user drags and only push it to the parent after a
 *     200 ms quiet period (industry-standard debounce for range inputs).
 *   - The visible km label reads from local state so the number tracks the
 *     thumb in real time even though the heavy filter doesn't fire until the
 *     debounce window elapses.
 *   - Pointer/touch/mouse `up` events flush the pending value immediately so
 *     releasing the thumb never feels stuck on an in-flight value.
 *
 * Spec note: per the latest UX pass we removed the help paragraph, slider
 * min/max labels, and the lat/long readout — they were noise. The block now
 * just shows the toggle, the slider, and the current radius value.
 */
export default function RadiusFilterControl({ radiusFilter, onRadiusFilterChange }) {
    const active = Boolean(radiusFilter?.active);
    const center = radiusFilter?.center || null;
    const incomingKm = useMemo(
        () => clampRadius(radiusFilter?.radiusKm),
        [radiusFilter?.radiusKm]
    );

    const [localKm, setLocalKm] = useState(incomingKm);
    const debounceRef = useRef(null);
    const pendingValueRef = useRef(incomingKm);

    // Keep local mirror in sync when the parent value changes from outside (e.g.
    // place-center auto-exits place mode and produces a fresh filter object).
    useEffect(() => {
        setLocalKm(incomingKm);
        pendingValueRef.current = incomingKm;
    }, [incomingKm]);

    function pushToParent(km) {
        onRadiusFilterChange({
            ...(radiusFilter || {}),
            radiusKm: km,
        });
    }

    function scheduleDebouncedPush(km) {
        pendingValueRef.current = km;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            pushToParent(pendingValueRef.current);
        }, 200);
    }

    function flushPendingPush() {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
            pushToParent(pendingValueRef.current);
        }
    }

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    function togglePlace() {
        // Place-mode toggling is a discrete action — don't debounce.
        flushPendingPush();
        onRadiusFilterChange({
            ...(radiusFilter || {}),
            active: !active,
            radiusKm: localKm,
        });
    }

    function clear() {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        onRadiusFilterChange({ active: false, center: null, radiusKm: localKm });
    }

    return (
        <div className="bg-[#0f1115] border border-gray-800 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={togglePlace}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${active
                        ? "bg-amber-400 text-black border-amber-300"
                        : center
                            ? "bg-green-600 text-black border-green-500"
                            : "bg-gray-900 text-white border-gray-700 hover:border-green-500"
                        }`}
                >
                    <Crosshair size={11} />
                    {active ? "Click map…" : center ? "Move center" : "Place on map"}
                </button>
                {center && (
                    <button
                        type="button"
                        onClick={clear}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                    >
                        <X size={11} /> Clear
                    </button>
                )}
            </div>
            {center && (
                <div>
                    <div className="flex items-baseline justify-between mb-1">
                        <span className="text-[10px] text-gray-600 uppercase tracking-wide">Within</span>
                        <span className="text-xs font-bold text-green-400">{localKm} km</span>
                    </div>
                    <input
                        type="range"
                        min={1}
                        max={500}
                        step={1}
                        value={localKm}
                        onChange={(e) => {
                            const v = clampRadius(e.target.value);
                            setLocalKm(v);
                            scheduleDebouncedPush(v);
                        }}
                        // Flush on release so the final value is committed immediately
                        // rather than waiting out the debounce window.
                        onMouseUp={flushPendingPush}
                        onTouchEnd={flushPendingPush}
                        onPointerUp={flushPendingPush}
                        onKeyUp={flushPendingPush}
                        className="w-full accent-green-500"
                        aria-label="Radius in kilometers"
                    />
                </div>
            )}
        </div>
    );
}

function clampRadius(input) {
    const n = Number(input);
    if (!Number.isFinite(n)) return 10;
    return Math.max(1, Math.min(500, Math.round(n)));
}
