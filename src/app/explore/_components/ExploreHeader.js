// src/app/explore/_components/ExploreHeader.js
"use client";

import { useState } from 'react';

export default function ExploreHeader({ plans, currentPlan, onSwitchPlan, onCreatePlan }) {
    const [isPlanOpen, setIsPlanOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [newPlanName, setNewPlanName] = useState("");

    const handleCreate = (e) => {
        e.preventDefault();
        if (newPlanName.trim()) {
            onCreatePlan(newPlanName);
            setNewPlanName("");
            setIsPlanOpen(false);
        }
    };

    return (
        <header className="h-14 bg-black border-b border-gray-800 flex items-center justify-between px-4 sticky top-0 z-50 shrink-0">

            {/* LEFT: PLAN SWITCHER */}
            <div className="relative">
                <button
                    onClick={() => setIsPlanOpen(!isPlanOpen)}
                    className="flex items-center gap-3 hover:bg-gray-900 px-2 py-1.5 rounded-lg transition-colors group"
                >
                    <div className="bg-gray-800 h-8 w-8 rounded flex items-center justify-center text-xs font-bold text-gray-400 group-hover:text-white group-hover:bg-gray-700 transition-colors">
                        P
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none">Current Plan</p>
                        <div className="flex items-center gap-1">
                            {/* Added max-width to prevent overflow on long plan names */}
                            <p className="text-xs font-bold text-white leading-none mt-1 max-w-[120px] truncate">{currentPlan.name}</p>
                            <span className="text-[10px] text-gray-500 mt-1">▼</span>
                        </div>
                    </div>
                </button>

                {isPlanOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {plans.map(plan => (
                                <button
                                    key={plan.id}
                                    onClick={() => { onSwitchPlan(plan); setIsPlanOpen(false); }}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex justify-between items-center group ${currentPlan.id === plan.id
                                        ? 'bg-green-500/10 text-green-400'
                                        : 'text-gray-300 hover:bg-gray-800'
                                        }`}
                                >
                                    <span className="font-medium truncate">{plan.name}</span>
                                    {currentPlan.id === plan.id && <span className="text-[10px]">●</span>}
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
                        <p className="text-xs font-bold text-white">John Doe</p>
                        <p className="text-[10px] text-gray-500">Admin</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white border border-gray-600 shadow-sm">
                        JD
                    </div>
                </button>

                {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-1">
                            <button className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                <span>⚙️</span> Account Settings
                            </button>
                            <button className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                <span>💳</span> Billing
                            </button>
                            <div className="h-px bg-gray-800 my-1"></div>
                            <button className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2">
                                <span>🚪</span> Log Out
                            </button>
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