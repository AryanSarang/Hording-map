"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                    <h1 className="text-2xl font-bold">All Plans</h1>
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
                                <p className="text-lg font-semibold text-white">{plan.name}</p>
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
        </main>
    );
}
