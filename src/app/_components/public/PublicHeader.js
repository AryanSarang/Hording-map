"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function PublicHeader({ initialUser }) {
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold text-white">
          Hording Map
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/about-us" className="hover:text-white">About</Link>
          <Link href="/contact-us" className="hover:text-white">Contact</Link>
          <Link href="/privacy-policy" className="hover:text-white">Privacy</Link>
          <Link href="/terms-of-service" className="hover:text-white">Terms</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/explore"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500"
          >
            Explore
          </Link>
          {user ? (
            <Link
              href="/vendor/dashboard"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
