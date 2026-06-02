/**
 * Route-segment loading skeleton for `/explore`.
 *
 * Mirrors the real `ExploreView` layout exactly so there's no jump when the SSR
 * finishes:
 *   - Left 60% column = Leaflet map area (light grey).
 *   - Right 40% column = stacked ExploreHeader (h-14) then a 50/50 split of
 *     DetailsPanel + FilterPanel. Both panels sit inside a dark surface.
 *
 * We use `lg:` only where the real layout does (it doesn't) — so this skeleton
 * is also fine on tablets/phones, which currently show the same 60/40 split.
 */

import { SkeletonBlock, SkeletonText } from "../_components/ui/Skeleton";

export default function ExploreLoading() {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-black text-white">
            {/* LEFT 60% — map placeholder */}
            <section className="w-[60%] h-full relative border-r border-gray-800 bg-[#dcdfe2]">
                <SkeletonBlock className="absolute inset-0 rounded-none bg-[#cdd0d3]" />
                {/* floating "search location" pill mirrors MapSection's top-centre input */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                    <SkeletonBlock className="h-9 w-[40%] min-w-[260px] max-w-md bg-white/70" />
                </div>
            </section>

            {/* RIGHT 40% — header + panels stack */}
            <section className="w-[40%] h-full flex flex-col bg-[#0a0a0a]">
                {/* ExploreHeader is h-14 with plan switcher on the left + profile on the right */}
                <header className="h-14 bg-black border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <SkeletonBlock className="h-7 w-44" />
                        <SkeletonBlock className="h-7 w-[260px]" />
                    </div>
                    <SkeletonBlock className="h-8 w-8 rounded-full" />
                </header>

                {/* Below header: 50/50 DetailsPanel | FilterPanel */}
                <div className="flex flex-1 overflow-hidden border-t border-gray-800">
                    {/* DetailsPanel placeholder — list of "site" cards */}
                    <div className="w-1/2 h-full border-r border-gray-800 bg-[#0a0a0a] p-3 space-y-2 overflow-hidden">
                        <SkeletonText width="50%" />
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex gap-3 rounded-lg border border-gray-800 bg-[#111] p-2">
                                <SkeletonBlock className="h-10 w-10 shrink-0 rounded" />
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <SkeletonText width="80%" className="h-3" />
                                    <SkeletonText width="50%" />
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* FilterPanel placeholder — section headers + controls */}
                    <div className="w-1/2 h-full bg-[#111] p-4 space-y-4 overflow-hidden">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <SkeletonText width="35%" />
                                <SkeletonBlock className="h-9 w-full" />
                            </div>
                        ))}
                        <SkeletonBlock className="h-10 w-full mt-2" />
                    </div>
                </div>
            </section>
        </div>
    );
}
