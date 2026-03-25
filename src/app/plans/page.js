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
        <main className="min-h-screen bg-black text-white p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-medium">All Plans</h1>
                    <Link href="/explore" className="px-3 py-2 rounded border border-gray-700 text-sm text-gray-300 hover:border-green-500">
                        Back to Explore
                    </Link>
                </div>

                {loading && <div className="text-sm text-gray-400">Loading plans...</div>}
                {error && <div className="text-sm text-red-400">{error}</div>}
                {!loading && !error && plans.length === 0 && (
                    <div className="text-sm text-gray-400">No plans yet. Create one from Explore.</div>
                )}

                {!loading && !error && plans.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plans.map((plan) => (
                            <Link
                                key={plan.id}
                                href={`/plans/${plan.id}`}
                                className="block rounded-xl border border-gray-800 bg-[#0f1115] p-4 hover:border-green-500 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-lg font-medium text-white">{plan.name}</p>
                                    <button
                                        type="button"
                                        disabled={deletingId === plan.id}
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (deletingId) return;
                                            setConfirmPlan(plan);
                                        }}
                                        className="inline-flex items-center justify-center text-xs text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-400/60 rounded p-1.5 disabled:opacity-60"
                                        title="Delete plan"
                                        aria-label="Delete plan"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    {(Array.isArray(plan.items) ? plan.items.length : 0)} media selected
                                </p>
                                <p className="text-[11px] text-gray-500 mt-2">
                                    Updated: {new Date(plan.updated_at || plan.created_at).toLocaleString()}
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
