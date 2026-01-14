// src/app/login/page.js
"use client";

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, Lock } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState(null);

    // Initialize Supabase Client
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/callback`,
            },
        });
        if (error) setMessage({ type: 'error', text: error.message });
        setLoading(false);
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: "Check your email for the login link!" });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">

            {/* Brand Logo / Title */}
            <div className="mb-8 text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                    <Lock className="text-green-500" size={20} />
                </div>
                <h1 className="text-2xl  text-white tracking-tight">Hording Explorer</h1>
                <p className="text-sm text-gray-500 mt-2">Sign in to access your dashboard</p>
            </div>

            <div className="w-full max-w-sm bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl">

                {/* Google Login Button */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white text-black  py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors mb-6 text-sm"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </>
                    )}
                </button>

                {/* Divider */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase  tracking-widest"><span className="bg-[#111] px-2 text-gray-500">Or use email</span></div>
                </div>

                {/* Email Login Form */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs  text-gray-500 uppercase mb-1.5 ml-1">Email Address</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:border-green-500 focus:bg-black outline-none transition-all placeholder-gray-600"
                                required
                            />
                            <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
                        </div>
                    </div>

                    {/* Messages (Success/Error) */}
                    {message && (
                        <div className={`p-3 rounded-lg text-xs font-medium border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white  py-3 rounded-lg transition-colors text-xs uppercase tracking-widest border border-gray-700"
                    >
                        {loading ? 'Sending Link...' : 'Send Magic Link'}
                    </button>
                </form>
            </div>

            {/* Footer Text */}
            <p className="mt-8 text-xs text-gray-600">
                By continuing, you agree to our Terms of Service.
            </p>
        </div>
    );
}