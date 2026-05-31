/**
 * Lightweight skeleton primitives. Tailwind's `animate-pulse` does the shimmer; we
 * keep these as plain spans/divs so they cost nothing at runtime (no JS, no
 * lifecycle, no portal). Use them as drop-in placeholders for text, images, and
 * card blocks while real content is loading.
 *
 * Visual choices:
 *   - Default surface color matches the dark UI (`bg-gray-800/70`) so skeletons
 *     blend into our existing cards rather than fighting the design.
 *   - All shapes use rounded corners by default — modern apps avoid hard-edged
 *     placeholders because they signal "broken" more than "loading".
 */

export function SkeletonBlock({ className = "", style }) {
    return (
        <div
            className={`animate-pulse rounded-md bg-gray-800/70 ${className}`.trim()}
            style={style}
            aria-hidden="true"
        />
    );
}

export function SkeletonText({ width = "100%", className = "" }) {
    const w = typeof width === "number" ? `${width}px` : width;
    return (
        <span
            className={`block h-3 animate-pulse rounded bg-gray-800/70 ${className}`.trim()}
            style={{ width: w }}
            aria-hidden="true"
        />
    );
}

export function SkeletonCircle({ size = 32, className = "" }) {
    return (
        <div
            className={`animate-pulse rounded-full bg-gray-800/70 ${className}`.trim()}
            style={{ width: size, height: size }}
            aria-hidden="true"
        />
    );
}

/**
 * Card skeleton tuned for plan/media tiles — a small icon-sized block, a couple of
 * text rows, and a footer line. Used by the plans list and the plan-detail item
 * list while the API response is in flight.
 */
export function SkeletonCard({ className = "" }) {
    return (
        <div
            className={`rounded-lg border border-gray-800 bg-[#111] p-4 ${className}`.trim()}
            aria-hidden="true"
        >
            <div className="flex items-start justify-between gap-3">
                <SkeletonText width="60%" className="h-4" />
                <SkeletonBlock className="h-7 w-7" />
            </div>
            <SkeletonText width="30%" className="mt-3" />
            <SkeletonText width="40%" className="mt-2" />
        </div>
    );
}
