/**
 * Route-segment loading skeleton for `/plans`.
 *
 * `plans/page.js` itself is a client component (it fetches `/api/plans` on
 * mount), so Next will show this skeleton only briefly during initial nav
 * before the client tree mounts. The grid mirrors the real page so there's no
 * layout shift when the data lands.
 */

import { SkeletonBlock, SkeletonCard } from "../_components/ui/Skeleton";

export default function PlansLoading() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-gray-800 mb-6">
                    <div className="space-y-2">
                        <SkeletonBlock className="h-3 w-28" />
                        <SkeletonBlock className="h-6 w-44" />
                    </div>
                    <SkeletonBlock className="h-8 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        </main>
    );
}
