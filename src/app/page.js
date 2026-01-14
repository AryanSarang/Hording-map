// src/app/page.js
"use client";

import { useEffect, useState, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import HomeHeader from './_components/HomeHeader';

function HomeContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    // 1. Get Current User
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    // 2. Handle Onboarding Toast
    if (searchParams.get('onboarding_complete') === 'true') {
      toast.success("Profile Setup Complete!", {
        description: "Your account is now pending admin verification.",
        duration: 5000,
        action: {
          label: "Dismiss",
          onClick: () => console.log('Dismissed'),
        },
      });
      // Clear the URL param so toast doesn't show on refresh
      router.replace('/');
    }
  }, [supabase, searchParams, router]);

  if (loading) return null; // Or a nice spinner

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <HomeHeader user={user} />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">

        {user ? (
          // LOGGED IN VIEW
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-gradient-to-tr from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-green-500/30">
              <span className="text-4xl">👋</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
              Welcome back!
            </h1>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-lg mx-auto">
              You are all set. While your account is under review, feel free to browse our public documentation or check your notifications.
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/explore')}
                className="px-6 py-3 bg-gray-900 border border-gray-800 hover:border-green-500 text-white rounded-xl font-medium transition-all"
              >
                Go to Map
              </button>
            </div>
          </div>
        ) : (
          // GUEST VIEW
          <div className="max-w-3xl animate-in fade-in zoom-in duration-500">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              Plan your next <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                Outdoor Campaign
              </span>
            </h1>
            <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto">
              Access the largest database of hoardings, billboards, and digital screens across India. Real-time availability and pricing.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-200 transition-transform hover:scale-105"
            >
              Get Started Now
            </button>
          </div>
        )}

      </main>

      {/* Simple Footer */}
      <footer className="border-t border-gray-900 py-8 text-center text-xs text-gray-600">
        © 2025 Hording Explorer. All rights reserved.
      </footer>
    </div>
  );
}

// Suspense wrapper is required for useSearchParams in Next.js Client Components
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black"></div>}>
      <HomeContent />
    </Suspense>
  );
}