"use client";

import { useState, useEffect } from 'react';
import { Bell, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function HomeHeader({ user }) {
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    useEffect(() => {
        // Check profile status to generate notifications
        const fetchStatus = async () => {
            if (!user) return;
            const { data: profile } = await supabase
                .from('profiles')
                .select('status')
                .eq('id', user.id)
                .single();

            if (profile?.status === 'pending') {
                setNotifications([
                    {
                        id: 1,
                        title: "Verification Pending",
                        text: "Your account is currently under review by an admin.",
                        time: "Now",
                        type: "warning"
                    }
                ]);
            }
        };
        fetchStatus();
    }, [user, supabase]);

    return (
        <header className="h-16 bg-black border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-50">

            {/* LEFT: LOGO */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/20">
                    <Lock className="text-green-500" size={16} />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">Hording Explorer</span>
            </div>

            {/* RIGHT: ACTIONS */}
            {user ? (
                <div className="flex items-center gap-4">
                    {/* NOTIFICATION BELL */}
                    <div className="relative">
                        <button
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-900 text-gray-400 hover:text-white transition-colors relative"
                        >
                            <Bell size={20} />
                            {notifications.length > 0 && (
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></span>
                            )}
                        </button>

                        {isNotifOpen && (
                            <div className="absolute top-full right-0 mt-2 w-80 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                                    <span className="text-sm font-bold text-white">Notifications</span>
                                    <span className="text-xs text-gray-500">{notifications.length} New</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-gray-600 text-sm">All caught up!</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n.id} className="p-4 hover:bg-gray-900 border-b border-gray-800/50 flex gap-3">
                                                <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                                <div>
                                                    <p className="text-sm text-gray-200 font-medium mb-1">{n.title}</p>
                                                    <p className="text-xs text-gray-500 leading-relaxed">{n.text}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PROFILE */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 flex items-center justify-center text-sm font-bold text-white border border-gray-700 hover:border-gray-500 transition-all"
                        >
                            {user.email[0].toUpperCase()}
                        </button>

                        {isProfileOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="p-1">
                                    <button
                                        onClick={() => router.push('/explore')}
                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-800 rounded-lg flex items-center gap-2"
                                    >
                                        🗺️ Explore Map
                                    </button>
                                    <div className="h-px bg-gray-800 my-1"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2"
                                    >
                                        🚪 Log Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => router.push('/login')}
                    className="px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors"
                >
                    Log In
                </button>
            )}

            {/* Overlay */}
            {(isNotifOpen || isProfileOpen) && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => { setIsNotifOpen(false); setIsProfileOpen(false); }} />
            )}
        </header>
    );
}