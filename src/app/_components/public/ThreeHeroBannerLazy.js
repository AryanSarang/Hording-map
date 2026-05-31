"use client";

/**
 * Client-side lazy wrapper for the Three.js hero canvas.
 *
 * `ThreeHeroBanner` pulls in the full Three.js bundle (~150kB gzipped). It's
 * decorative background art behind the hero copy — never the primary content
 * — so we defer the JS until after first paint with `dynamic({ ssr: false })`.
 * The visible CTAs and copy render instantly; Three boots in the background
 * and the canvas fades in once it's ready.
 */

import dynamic from "next/dynamic";

const ThreeHeroBanner = dynamic(
    () => import("./ThreeHeroBanner"),
    { ssr: false, loading: () => null }
);

export default function ThreeHeroBannerLazy() {
    return <ThreeHeroBanner />;
}
