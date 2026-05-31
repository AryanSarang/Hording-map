/**
 * Route-segment loading skeleton for `/plans/[id]`.
 *
 * Mirrors the real plan detail layout: header strip, metric tiles, filter bar,
 * and the split list/map. The body uses the same column ratio as the live
 * page so when the data arrives the list cards drop into place without a jump.
 */

import { SkeletonBlock, SkeletonText } from "../../_components/ui/Skeleton";

export default function PlanDetailLoading() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-gray-800 mb-6">
                    <div className="space-y-2">
                        <SkeletonBlock className="h-3 w-12" />
                        <SkeletonBlock className="h-6 w-64" />
                        <SkeletonText width="40%" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <SkeletonBlock className="h-8 w-24" />
                        <SkeletonBlock className="h-8 w-24" />
                    </div>
                </div>

                {/* Metric tiles */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-gray-800 bg-[#111] p-3 space-y-2">
                            <SkeletonText width="50%" />
                            <SkeletonBlock className="h-6 w-24" />
                        </div>
                    ))}
                </div>

                {/* Filter bar */}
                <div className="rounded-lg border border-gray-800 bg-[#111] p-4 mb-4">
                    <SkeletonText width="20%" className="mb-3" />
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonBlock key={i} className="h-9 w-full" />
                        ))}
                    </div>
                </div>

                {/* Split list/map */}
                <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="rounded-lg border border-gray-800 bg-[#111] p-3 space-y-2">
                                <SkeletonText width="30%" />
                                <SkeletonBlock className="h-5 w-3/4" />
                                <SkeletonText width="40%" />
                                <SkeletonText width="60%" />
                                <div className="flex gap-3 pt-1">
                                    <SkeletonBlock className="h-4 w-20" />
                                    <SkeletonBlock className="h-4 w-24" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <SkeletonBlock className="h-[620px] w-full rounded-lg" />
                </div>
            </div>
        </main>
    );
}
