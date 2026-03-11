// app/explore/_components/ExploreHeader.js
"use client";

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

function getDisplayName(user) {
    if (!user) return 'Guest';
    return user.user_metadata?.full_name || user.email || 'User';
}

function getUserInitials(user) {
    if (!user) return 'GU';
    const name = getDisplayName(user);
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ExploreHeader({ plans, currentPlan, onSwitchPlan, onCreatePlan, user, isAuthenticated, loadingPlans, planError }) {
    const [isPlanOpen, setIsPlanOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [newPlanName, setNewPlanName] = useState("");

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            alert('Please log in to create and save plans.');
            return;
        }
        if (newPlanName.trim()) {
            await onCreatePlan(newPlanName);
            setNewPlanName("");
            setIsPlanOpen(false);
        }
    };

    return (
        <header className="h-14 bg-black border-b border-gray-800 flex items-center justify-between px-4 sticky top-0 z-50 shrink-0">

            {/* LEFT: PLAN SWITCHER */}
            <div className="relative">
                <button
                    onClick={() => isAuthenticated && setIsPlanOpen(!isPlanOpen)}
                    disabled={!isAuthenticated}
                    className="flex items-center gap-3 hover:bg-gray-900 px-2 py-1.5 rounded-lg transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <div className="bg-gray-800 h-8 w-8 rounded flex items-center justify-center text-xs font-bold text-gray-400 group-hover:text-white group-hover:bg-gray-700 transition-colors">
                        P
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none">
                            {isAuthenticated ? 'Current Plan' : 'Login to create plan'}
                        </p>
                        <div className="flex items-center gap-1">
                            {/* Added max-width to prevent overflow on long plan names */}
                            <p className="text-xs font-bold text-white leading-none mt-1 max-w-[120px] truncate">
                                {currentPlan?.name || (isAuthenticated ? 'No plans yet' : 'Guest')}
                            </p>
                            <span className="text-[10px] text-gray-500 mt-1">▼</span>
                        </div>
                    </div>
                </button>

                {isPlanOpen && isAuthenticated && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {loadingPlans && (
                                <div className="px-3 py-2 text-[11px] text-gray-500">
                                    Loading plans...
                                </div>
                            )}
                            {planError && !loadingPlans && (
                                <div className="px-3 py-2 text-[11px] text-red-400">
                                    {planError}
                                </div>
                            )}
                            {!loadingPlans && !planError && plans.length === 0 && (
                                <div className="px-3 py-2 text-[11px] text-gray-500">
                                    No plans yet. Create your first plan below.
                                </div>
                            )}
                            {plans.map(plan => (
                                <button
                                    key={plan.id}
                                    onClick={() => { onSwitchPlan(plan); setIsPlanOpen(false); }}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex justify-between items-center group ${currentPlan?.id === plan.id
                                        ? 'bg-green-500/10 text-green-400'
                                        : 'text-gray-300 hover:bg-gray-800'
                                        }`}
                                >
                                    <span className="font-medium truncate">{plan.name}</span>
                                    {currentPlan?.id === plan.id && <span className="text-[10px]">●</span>}
                                </button>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-800 bg-[#0a0a0a]">
                            <form onSubmit={handleCreate} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newPlanName}
                                    onChange={(e) => setNewPlanName(e.target.value)}
                                    placeholder="New plan name..."
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-green-500 outline-none placeholder-gray-600"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!newPlanName.trim()}
                                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black px-3 py-1 rounded text-xs font-bold transition-colors"
                                >
                                    +
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT: PROFILE MENU */}
            <div className="relative">
                <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 hover:bg-gray-900 px-2 py-1.5 rounded-lg transition-colors"
                >
                    <div className="text-right hidden xl:block">
                        <p className="text-xs font-bold text-white">
                            {getDisplayName(user)}
                        </p>
                        <p className="text-[10px] text-gray-500">
                            {isAuthenticated ? 'Logged in' : 'Not logged in'}
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white border border-gray-600 shadow-sm">
                        {getUserInitials(user)}
                    </div>
                </button>

                {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-1">
                            {isAuthenticated ? (
                                <>
                                    <button className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                        <span>⚙️</span> Account Settings
                                    </button>
                                    <button className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                        <span>💳</span> Billing
                                    </button>
                                    <div className="h-px bg-gray-800 my-1"></div>
                                    <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/explore'; }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2">
                                        <span>🚪</span> Log Out
                                    </button>
                                </>
                            ) : (
                                <a href="/login" className="w-full text-left px-3 py-2 text-xs text-green-400 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                    <span>🔐</span> Log In
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {(isPlanOpen || isProfileOpen) && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => { setIsPlanOpen(false); setIsProfileOpen(false); }}
                />
            )}
        </header>
    );
}