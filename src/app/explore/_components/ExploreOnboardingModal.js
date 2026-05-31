"use client";

import { useEffect, useMemo, useState } from "react";
import { State } from "country-state-city";

/**
 * First-visit onboarding modal for /explore (UX spec #6).
 *
 * Single-step form: pick a State and a Media Type. NO skip button — the user must
 * complete the form to dismiss the modal. On submit:
 *   1. POST to /api/profile/explore-preferences to persist the choice.
 *   2. Navigate to /explore?state=<state>&type=<mediaType> so the SSR re-runs with
 *      the chosen slice (instead of relying on a heavy client-side re-fetch).
 *
 * The user can still change filters freely afterward — this just defines what they
 * see *first* on their next visit.
 */
export default function ExploreOnboardingModal({
    open,
    availableMediaTypes = [],
    onSaved,
}) {
    const indianStates = useMemo(() => {
        const states = State.getStatesOfCountry('IN') || [];
        return states.map((s) => s.name).sort((a, b) => a.localeCompare(b));
    }, []);

    const [stateChoice, setStateChoice] = useState('');
    const [mediaTypeChoice, setMediaTypeChoice] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return;
        // Reset form whenever the modal reopens (defensive — should only ever open once).
        setStateChoice('');
        setMediaTypeChoice('');
        setError(null);
        setSaving(false);
    }, [open]);

    if (!open) return null;

    const canSubmit = Boolean(stateChoice) && Boolean(mediaTypeChoice) && !saving;

    async function handleSubmit(e) {
        e?.preventDefault?.();
        if (!canSubmit) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/profile/explore-preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ state: stateChoice, mediaType: mediaTypeChoice }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data?.success === false) {
                throw new Error(data?.error || 'Could not save preferences');
            }
            /**
             * Hard navigation rather than `router.replace` so the App-Router SSR
             * for /explore re-runs with the new state/type. Soft routing here
             * would skip the server-side catalog refetch.
             */
            const params = new URLSearchParams({
                state: stateChoice,
                type: mediaTypeChoice,
            });
            window.location.href = `/explore?${params.toString()}`;
            onSaved?.({ state: stateChoice, mediaType: mediaTypeChoice });
        } catch (err) {
            setError(err?.message || 'Could not save preferences');
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[5000]">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#0f1115] shadow-2xl p-6 text-white"
                >
                    <h2 className="text-base font-semibold mb-1">Welcome to Explore</h2>
                    <p className="text-xs text-gray-400 leading-relaxed mb-5">
                        Tell us what you're looking for so we can show you the right media first.
                        You can change this later from any filter.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="onboarding-state" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                State
                            </label>
                            <select
                                id="onboarding-state"
                                value={stateChoice}
                                onChange={(e) => setStateChoice(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-green-500"
                                required
                            >
                                <option value="">Select a state...</option>
                                {indianStates.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="onboarding-mediatype" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                Media type
                            </label>
                            <select
                                id="onboarding-mediatype"
                                value={mediaTypeChoice}
                                onChange={(e) => setMediaTypeChoice(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-green-500"
                                required
                            >
                                <option value="">Select a media type...</option>
                                {availableMediaTypes.map((mt) => (
                                    <option key={mt} value={mt}>{mt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 text-[11px] text-red-400 bg-red-950/40 border border-red-500/30 rounded px-3 py-2">
                            {error}
                        </div>
                    )}

                    <div className="mt-6">
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="w-full font-bold py-2.5 rounded text-[11px] uppercase tracking-widest bg-white hover:bg-gray-200 text-black border border-transparent disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                        >
                            {saving ? 'Saving...' : 'Start exploring'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
