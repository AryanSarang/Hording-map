"use client";

import { useEffect, useMemo, useState } from "react";
import { State } from "country-state-city";
import { X } from "lucide-react";

/**
 * Modal that captures the new "plan intent" form: name + media type + up to two
 * states. This is the front door of the new plans-driven flow — the user has
 * to commit to a category and geographic slice before they can enter /explore.
 *
 * Layout choices:
 *   - Plain `<select>` for media type because the canonical list is tiny.
 *   - Inline state checklist (max 2) for clear feedback on the cap. Selecting
 *     a third state visually disables the rest until one is unticked.
 *   - Single submit button; no skip. The whole point of the modal is to capture
 *     this data, so allowing skip would just push the friction elsewhere.
 *
 * Props:
 *   open                      — controlled visibility
 *   availableMediaTypes       — array of strings, normally the SSR-computed set
 *                               of media types currently present in the DB
 *   onClose()                 — fires on backdrop click / cancel / Esc
 *   onCreated(plan)           — fires after a successful POST /api/plans
 */
const MAX_STATES = 2;

export default function CreatePlanModal({
    open,
    availableMediaTypes = [],
    mediaTypesLoading = false,
    onClose,
    onCreated,
}) {
    const indianStates = useMemo(() => {
        const states = State.getStatesOfCountry("IN") || [];
        return states.map((s) => s.name).sort((a, b) => a.localeCompare(b));
    }, []);

    const [name, setName] = useState("");
    const [mediaType, setMediaType] = useState("");
    const [pickedStates, setPickedStates] = useState([]);
    const [stateFilter, setStateFilter] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Reset the form whenever the modal reopens.
    useEffect(() => {
        if (!open) return;
        setName("");
        setMediaType("");
        setPickedStates([]);
        setStateFilter("");
        setError(null);
        setSaving(false);
    }, [open]);

    // Close on Escape.
    useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === "Escape" && !saving) onClose?.();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, saving, onClose]);

    // Hooks must run on every render — never place hooks after an early return.
    const filteredStates = useMemo(() => {
        const q = stateFilter.trim().toLowerCase();
        if (!q) return indianStates;
        return indianStates.filter((s) => s.toLowerCase().includes(q));
    }, [indianStates, stateFilter]);

    const stateCap = pickedStates.length >= MAX_STATES;
    const canSubmit =
        name.trim().length > 0 &&
        mediaType.trim().length > 0 &&
        pickedStates.length > 0 &&
        !saving;

    function toggleState(s) {
        setPickedStates((prev) => {
            if (prev.includes(s)) return prev.filter((p) => p !== s);
            if (prev.length >= MAX_STATES) return prev;
            return [...prev, s];
        });
    }

    if (!open) return null;

    async function handleSubmit(e) {
        e?.preventDefault?.();
        if (!canSubmit) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: name.trim(),
                    mediaType: mediaType.trim(),
                    states: pickedStates,
                    items: [],
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data?.success === false) {
                throw new Error(data?.error || "Could not create plan");
            }
            onCreated?.(data.plan);
        } catch (err) {
            setError(err?.message || "Could not create plan");
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[5000]" role="dialog" aria-modal="true">
            <button
                type="button"
                aria-label="Close"
                onClick={() => !saving && onClose?.()}
                className="absolute inset-0 bg-black/70 backdrop-blur-[3px] cursor-default"
            />
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#0f1115] shadow-2xl p-6 text-white pointer-events-auto"
                >
                    <div className="flex items-start justify-between mb-1">
                        <div>
                            <h2 className="text-base font-semibold">Create a new plan</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Pick a category and where you want to advertise. You can refine and add media next.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => !saving && onClose?.()}
                            className="text-gray-500 hover:text-gray-200 -mt-1 -mr-1 p-1 rounded"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-4 mt-5">
                        <div>
                            <label
                                htmlFor="cp-name"
                                className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5"
                            >
                                Plan name
                            </label>
                            <input
                                id="cp-name"
                                type="text"
                                value={name}
                                maxLength={120}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Diwali Cinema — Mumbai + Pune"
                                autoFocus
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-green-500"
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="cp-mediatype"
                                className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5"
                            >
                                Media type
                            </label>
                            <select
                                id="cp-mediatype"
                                value={mediaType}
                                onChange={(e) => setMediaType(e.target.value)}
                                disabled={mediaTypesLoading}
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-green-500 disabled:opacity-60"
                                required
                            >
                                <option value="">
                                    {mediaTypesLoading ? 'Loading media types…' : 'Select a media type…'}
                                </option>
                                {availableMediaTypes.map((mt) => (
                                    <option key={mt} value={mt}>{mt}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="flex items-baseline justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    States (max {MAX_STATES})
                                </span>
                                <span className={`text-[10px] ${pickedStates.length === MAX_STATES ? "text-amber-400" : "text-gray-500"}`}>
                                    {pickedStates.length} / {MAX_STATES} selected
                                </span>
                            </div>
                            <input
                                type="text"
                                value={stateFilter}
                                onChange={(e) => setStateFilter(e.target.value)}
                                placeholder="Search states…"
                                className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-green-500 mb-2"
                            />
                            <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-800 bg-[#0a0a0a] p-1">
                                {filteredStates.length === 0 && (
                                    <p className="text-[11px] text-gray-600 px-2 py-3 text-center">No matches.</p>
                                )}
                                {filteredStates.map((s) => {
                                    const checked = pickedStates.includes(s);
                                    const disabled = !checked && stateCap;
                                    return (
                                        <label
                                            key={s}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${disabled
                                                ? "opacity-40 cursor-not-allowed"
                                                : "hover:bg-gray-900 text-gray-200"
                                                } ${checked ? "bg-green-500/10 text-green-300" : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={disabled}
                                                onChange={() => toggleState(s)}
                                                className="accent-green-500"
                                            />
                                            <span>{s}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 text-[11px] text-red-400 bg-red-950/40 border border-red-500/30 rounded px-3 py-2">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => !saving && onClose?.()}
                            className="px-4 py-2 rounded text-[11px] uppercase tracking-widest text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="px-4 py-2 rounded text-[11px] uppercase tracking-widest font-bold bg-green-500 hover:bg-green-400 text-black disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {saving ? "Creating…" : "Create plan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
