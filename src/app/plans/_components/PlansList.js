"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Eye, Pencil, Trash2, MapPin, Layers } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../../_components/ui/ConfirmDialog";
import { SkeletonCard } from "../../_components/ui/Skeleton";
import CreatePlanModal from "./CreatePlanModal";

/**
 * Client-side interactive plans list + Create Plan flow.
 *
 * Each plan card surfaces three actions, mirroring the new flow:
 *   - View   → `/plans/[id]`              (read-only summary + remove media)
 *   - Edit   → `/explore?planId=[id]`     (full filter/map UI, scoped to plan)
 *   - Delete → confirmation modal → DELETE /api/plans/[id]
 *
 * Plan metadata (media type + states) appears as subtle pills so the user can
 * scan a long list and find the right plan at a glance.
 *
 * The page also honors `?new=1` (e.g. PublicHeader "Start Planning" deep-link)
 * by opening the Create modal automatically.
 */
export default function PlansList() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmPlan, setConfirmPlan] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [availableMediaTypes, setAvailableMediaTypes] = useState([]);
    const [mediaTypesLoading, setMediaTypesLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/plans", { credentials: "include" });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || "Failed to load plans");
                if (!cancelled) setPlans(Array.isArray(data.plans) ? data.plans : []);
            } catch (err) {
                if (!cancelled) setError(err?.message || "Failed to load plans");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Load media types only when the create modal opens — keeps /plans first paint instant.
    useEffect(() => {
        if (!createOpen || availableMediaTypes.length > 0) return;
        let cancelled = false;
        (async () => {
            setMediaTypesLoading(true);
            try {
                const res = await fetch("/api/explore/media-types", { credentials: "include" });
                const data = await res.json().catch(() => ({}));
                if (!cancelled && res.ok && data?.success) {
                    setAvailableMediaTypes(Array.isArray(data.mediaTypes) ? data.mediaTypes : []);
                }
            } catch {
                // Modal still works; user sees empty dropdown until retry
            } finally {
                if (!cancelled) setMediaTypesLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [createOpen, availableMediaTypes.length]);

    // Auto-open the Create modal if URL says so. Strip the param after opening so
    // refreshing doesn't re-open the modal on every reload.
    useEffect(() => {
        if (searchParams.get("new") === "1") {
            setCreateOpen(true);
            const next = new URLSearchParams(searchParams.toString());
            next.delete("new");
            router.replace(`/plans${next.toString() ? `?${next.toString()}` : ""}`);
        }
    }, [searchParams, router]);

    const sortedPlans = useMemo(
        () => [...plans].sort((a, b) => (new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))),
        [plans]
    );

    function handleCreated(newPlan) {
        setCreateOpen(false);
        setPlans((prev) => [newPlan, ...prev]);
        toast.success("Plan created", { description: newPlan?.name });
        // Jump straight into Edit mode — that's what the user wants right after
        // creating a plan. They'd otherwise have to click "Edit" anyway.
        if (newPlan?.id) {
            router.push(`/explore?planId=${encodeURIComponent(newPlan.id)}`);
        }
    }

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-gray-800 mb-6">
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Your workspace</p>
                        <h1 className="text-lg sm:text-xl font-medium text-white">All Plans</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/"
                            className="px-3 py-2 rounded-lg border border-gray-700 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:border-green-500/60 hover:text-green-400 transition-colors"
                        >
                            Home
                        </Link>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-black text-[10px] font-bold uppercase tracking-widest"
                        >
                            <Plus size={14} />
                            New Plan
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2" aria-label="Loading plans">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                )}
                {error && (
                    <div className="text-xs text-red-400 border border-red-500/30 bg-red-950/20 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {!loading && !error && sortedPlans.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-800 bg-[#0f1115] px-6 py-12 text-center">
                        <p className="text-sm text-gray-200 font-medium">No plans yet.</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                            A plan groups the media you're considering for a single campaign. Start by picking
                            a media type and up to two states.
                        </p>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-black text-[11px] font-bold uppercase tracking-widest"
                        >
                            <Plus size={14} /> Create your first plan
                        </button>
                    </div>
                )}

                {!loading && !error && sortedPlans.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {sortedPlans.map((plan) => {
                            const itemCount = Array.isArray(plan.items) ? plan.items.length : 0;
                            const states = Array.isArray(plan.states) ? plan.states : [];
                            const mediaType = plan.media_type || null;
                            return (
                                <div
                                    key={plan.id}
                                    className="group rounded-lg border border-gray-800 bg-[#111] p-4 hover:border-green-500/40 transition-colors flex flex-col"
                                >
                                    <Link href={`/plans/${plan.id}`} className="block">
                                        <p className="text-sm font-medium text-white leading-snug group-hover:text-green-400 transition-colors">
                                            {plan.name}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {mediaType && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-300 bg-gray-800/70 border border-gray-700 rounded-full px-2 py-0.5">
                                                    <Layers size={10} /> {mediaType}
                                                </span>
                                            )}
                                            {states.map((s) => (
                                                <span
                                                    key={s}
                                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-300 bg-gray-800/70 border border-gray-700 rounded-full px-2 py-0.5"
                                                >
                                                    <MapPin size={10} /> {s}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-3 uppercase tracking-wide">
                                            {itemCount} media · updated {new Date(plan.updated_at || plan.created_at).toLocaleDateString()}
                                        </p>
                                    </Link>
                                    <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-1.5">
                                        <Link
                                            href={`/plans/${plan.id}`}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest text-gray-300 border border-gray-700 hover:border-green-500/60 hover:text-green-400 transition-colors"
                                        >
                                            <Eye size={12} /> View
                                        </Link>
                                        <Link
                                            href={`/explore?planId=${encodeURIComponent(plan.id)}`}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest text-green-400 border border-green-500/40 hover:bg-green-500/10 transition-colors"
                                        >
                                            <Pencil size={12} /> Edit
                                        </Link>
                                        <div className="ml-auto" />
                                        <button
                                            type="button"
                                            disabled={deletingId === plan.id}
                                            onClick={() => setConfirmPlan(plan)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest text-red-400 border border-red-500/40 hover:border-red-400/60 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                                            title="Delete plan"
                                            aria-label="Delete plan"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <CreatePlanModal
                open={createOpen}
                availableMediaTypes={availableMediaTypes}
                mediaTypesLoading={mediaTypesLoading}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
            />

            <ConfirmDialog
                open={!!confirmPlan}
                title="Delete plan?"
                description={
                    confirmPlan
                        ? `This will permanently delete "${confirmPlan.name}".`
                        : undefined
                }
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                loading={!!deletingId}
                onCancel={() => {
                    if (deletingId) return;
                    setConfirmPlan(null);
                }}
                onConfirm={async () => {
                    if (!confirmPlan || deletingId) return;
                    setDeletingId(confirmPlan.id);
                    setError(null);
                    try {
                        const res = await fetch(`/api/plans/${encodeURIComponent(confirmPlan.id)}`, {
                            method: "DELETE",
                            credentials: "include",
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok || data?.success === false) {
                            throw new Error(data?.error || "Failed to delete plan");
                        }
                        setPlans((prev) => prev.filter((p) => p.id !== confirmPlan.id));
                        toast.success("Plan deleted", { description: confirmPlan.name });
                        setConfirmPlan(null);
                    } catch (err) {
                        const msg = err?.message || "Failed to delete plan";
                        setError(msg);
                        toast.error("Delete failed", { description: msg });
                    } finally {
                        setDeletingId(null);
                    }
                }}
            />
        </main>
    );
}
