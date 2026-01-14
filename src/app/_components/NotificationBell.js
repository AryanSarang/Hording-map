"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client"; // Adjust based on where your client helper is (e.g., src/lib/supabase)
import { Bell } from "lucide-react";

export default function NotificationBell() {
    // Use your supabase client setup
    const supabase = createClient();

    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (data) setNotifications(data);
            setLoading(false);
        };

        fetchNotifications();

        // Optional: Real-time subscription (Supabase magic)
        // This makes the notification pop up instantly without refreshing
        const channel = supabase
            .channel('realtime-notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                setNotifications((prev) => [payload.new, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // 2. Mark as Read Handler
    const markAsRead = async (id) => {
        // Optimistic UI update (update screen immediately)
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));

        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id);
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white transition"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-[#1A1D21] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 bg-[#1A1D21]">
                            <h3 className="text-sm font-semibold text-white">Notifications</h3>
                            <span className="text-xs text-gray-400">{unreadCount} Unread</span>
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-xs text-gray-500">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-500">No notifications</div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => markAsRead(n.id)}
                                        className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition flex gap-3 ${!n.is_read ? "bg-[#25282E]" : "bg-[#1A1D21]"
                                            }`}
                                    >
                                        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                                            }`} />
                                        <div>
                                            <p className="text-sm font-medium text-white">{n.title}</p>
                                            <p className="text-xs text-gray-400 mt-1">{n.message}</p>
                                            <p className="text-[10px] text-gray-500 mt-2">
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}