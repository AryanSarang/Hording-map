/**
 * Route-segment loading skeleton for `/explore`.
 *
 * Next.js renders this as a Suspense fallback while the page-level SSR (catalog
 * fetch + variants + metafields) is in flight. Without it the user sees a blank
 * white viewport for the duration of the slowest query. The mock mirrors the
 * real layout — header, filter rail on the left, big map area in the middle,
 * details panel on the right — so the layout doesn't shift when the real
 * content paints in.
 */

import { SkeletonBlock, SkeletonText } from "../_components/ui/Skeleton";

export default function ExploreLoading() {
    return (
        <div className="h-[100svh] bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
            {/* Header strip */}
            <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-6 w-24" />
                    <SkeletonBlock className="h-5 w-40" />
                </div>
                <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-7 w-24" />
                    <SkeletonBlock className="h-7 w-7 rounded-full" />
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] min-h-0">
                {/* Filter rail */}
                <aside className="hidden lg:flex flex-col border-r border-gray-800 p-4 gap-5">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <SkeletonText width="40%" />
                            <SkeletonBlock className="h-9 w-full" />
                        </div>
                    ))}
                    <SkeletonBlock className="h-10 w-full mt-auto" />
                </aside>

                {/* Map */}
                <div className="relative bg-[#dde0e3] min-h-[400px] overflow-hidden">
                    <SkeletonBlock className="absolute inset-0 rounded-none" />
                    <div className="absolute top-4 left-1/2 -translate-x-1/2">
                        <SkeletonBlock className="h-9 w-72" />
                    </div>
                </div>

                {/* Details rail */}
                <aside className="hidden lg:flex flex-col border-l border-gray-800 p-4 gap-3">
                    <SkeletonText width="50%" />
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="space-y-2 rounded-lg border border-gray-800 bg-[#111] p-3">
                            <SkeletonText width="80%" className="h-4" />
                            <SkeletonText width="50%" />
                            <SkeletonText width="30%" />
                        </div>
                    ))}
                </aside>
            </div>
        </div>
    );
}
