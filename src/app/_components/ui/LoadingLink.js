"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Drop-in `<Link>` replacement that shows a spinner + "Opening…" label as soon as the
 * user clicks. Useful for routes where the destination is heavy (e.g. /explore SSR
 * loads the catalog) so the user gets immediate feedback that their click registered
 * — otherwise the browser sits silent for up to a second and the click can feel dead.
 *
 * Implementation notes:
 *   - We don't `e.preventDefault()` — Next.js Link does the navigation; we just paint
 *     the busy state. When the new page mounts, this component unmounts, so we never
 *     need to manually reset `loading`.
 *   - `aria-busy` keeps assistive tech informed.
 *   - `loadingLabel` defaults to "Opening…" so callers usually don't need to override.
 */
export default function LoadingLink({
    href,
    children,
    loadingLabel = "Opening…",
    className,
    onClick,
    ...rest
}) {
    const [loading, setLoading] = useState(false);

    function handleClick(e) {
        // Modifier-clicks (cmd/ctrl/shift) open in a new tab — don't paint our busy
        // state because the current page isn't navigating away.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
            onClick?.(e);
            return;
        }
        setLoading(true);
        onClick?.(e);
    }

    return (
        <Link
            href={href}
            onClick={handleClick}
            aria-busy={loading}
            className={`${className || ""} ${loading ? "opacity-80 cursor-progress" : ""}`.trim()}
            {...rest}
        >
            {loading ? (
                <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    {loadingLabel}
                </span>
            ) : (
                children
            )}
        </Link>
    );
}
