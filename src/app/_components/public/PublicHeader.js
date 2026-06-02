"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import LoadingLink from "../ui/LoadingLink";

/**
 * Public header for marketing / unauthenticated pages.
 *
 * Session resolution has THREE layers (each is defensive against the prior failing):
 *
 *   1. `initialUser` from SSR — fastest paint with the right state.
 *   2. `getSession()` on mount — covers the case where the user landed here right
 *      after Google OAuth via a hard redirect (cookies were written by the callback
 *      handler but SSR ran before that propagated). Without this the header used
 *      to flicker "Login" for half a second after sign-in.
 *   3. `onAuthStateChange` for the rest of the session lifetime.
 *
 * We also call `router.refresh()` after we observe a SIGNED_IN / SIGNED_OUT event
 * so any server components on the page that rely on `getCurrentUser()` re-fetch
 * with the fresh cookie (e.g. profile-aware copy elsewhere on the page).
 */
export default function PublicHeader({ initialUser }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser ?? null);
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    []
  );

  useEffect(() => {
    let cancelled = false;

    // (2) Seed from the live session cookie. This handles the OAuth-redirect race
    // where SSR `getCurrentUser` ran before the cookie was readable.
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const sessUser = data?.session?.user ?? null;
        // Only update if it actually differs — avoids an unnecessary re-render
        // when SSR `initialUser` already matched the session.
        setUser((prev) => {
          const prevId = prev?.id ?? null;
          const nextId = sessUser?.id ?? null;
          return prevId === nextId ? prev : sessUser;
        });
      } catch {
        // ignore — onAuthStateChange below will still keep us in sync
      }
    })();

    // (3) Subscribe for the rest of the page lifetime.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.refresh();
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-medium text-white">
          medvar
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/about-us" className="hover:text-white">About</Link>
          <Link href="/contact-us" className="hover:text-white">Contact</Link>
          <Link href="/privacy-policy" className="hover:text-white">Privacy</Link>
          <Link href="/terms-of-service" className="hover:text-white">Terms</Link>
        </nav>

        <div className="flex items-center gap-2">
          <LoadingLink
            href={user ? "/plans" : "/login?next=/plans"}
            className="inline-flex items-center rounded-md border border-slate-700 px-3 py-1.5 text-xs font-normal text-slate-200 hover:border-slate-500"
          >
            Explore
          </LoadingLink>
          {user ? (
            <Link
              href="/vendor/dashboard"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
