"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../_components/ui/ConfirmDialog';

export default function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmPlan, setConfirmPlan] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/plans', { credentials: 'include' });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load plans');
                if (!cancelled) setPlans(Array.isArray(data.plans) ? data.plans : []);
            } catch (err) {
                if (!cancelled) setError(err?.message || 'Failed to load plans');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-gray-800 mb-6">
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Your workspace</p>
                        <h1 className="text-lg sm:text-xl font-medium text-white">All Plans</h1>
                    </div>
                    <Link
                        href="/explore"
                        className="self-start sm:self-auto px-3 py-2 rounded-lg border border-gray-700 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:border-green-500/60 hover:text-green-400 transition-colors"
                    >
                        Back to Explore
                    </Link>
                </div>

                {loading && <div className="text-xs text-gray-500 uppercase tracking-wide">Loading plans…</div>}
                {error && <div className="text-xs text-red-400 border border-red-500/30 bg-red-950/20 rounded-lg px-3 py-2">{error}</div>}
                {!loading && !error && plans.length === 0 && (
                    <div className="text-xs text-gray-600 uppercase tracking-wide">No plans yet. Create one from Explore.</div>
                )}

                {!loading && !error && plans.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {plans.map((plan) => (
                            <Link
                                key={plan.id}
                                href={`/plans/${plan.id}`}
                                className="block rounded-lg border border-gray-800 bg-[#111] p-4 hover:border-green-500/50 hover:bg-[#151515] transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-medium text-white leading-snug pr-2">{plan.name}</p>
                                    <button
                                        type="button"
                                        disabled={deletingId === plan.id}
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (deletingId) return;
                                            setConfirmPlan(plan);
                                        }}
                                        className="shrink-0 inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-400/60 rounded-lg px-2 py-1.5 disabled:opacity-60"
                                        title="Delete plan"
                                        aria-label="Delete plan"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wide">
                                    {(Array.isArray(plan.items) ? plan.items.length : 0)} media in plan
                                </p>
                                <p className="text-[10px] text-gray-600 mt-2">
                                    Updated {new Date(plan.updated_at || plan.created_at).toLocaleString()}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

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
                            method: 'DELETE',
                            credentials: 'include',
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok || data?.success === false) {
                            throw new Error(data?.error || 'Failed to delete plan');
                        }
                        setPlans((prev) => prev.filter((p) => p.id !== confirmPlan.id));
                        toast.success('Plan deleted', { description: confirmPlan.name });
                        setConfirmPlan(null);
                    } catch (err) {
                        const msg = err?.message || 'Failed to delete plan';
                        setError(msg);
                        toast.error('Delete failed', { description: msg });
                    } finally {
                        setDeletingId(null);
                    }
                }}
            />
        </main>
    );
}
