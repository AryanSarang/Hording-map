// app/explore/_components/ExploreHeader.js
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Sparkles, FolderOpen, Settings, CreditCard, LogOut, LogIn, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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

export default function ExploreHeader({ plans, currentPlan, onSwitchPlan, onCreatePlan, onCreateAiPlan, user, isAuthenticated, loadingPlans, planError }) {
    const [isPlanOpen, setIsPlanOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [newPlanName, setNewPlanName] = useState("");
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiBusy, setAiBusy] = useState(false);
    const [aiNotice, setAiNotice] = useState(null);
    const [credits, setCredits] = useState(null);
    const [creditsLoading, setCreditsLoading] = useState(false);
    const [creditsExempt, setCreditsExempt] = useState(false);

    const handleTopUpCredits = () => {
        toast('Top up coming soon', {
            description: 'Contact admin / Top up later (build phase).',
        });
    };

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        let cancelled = false;
        const loadCredits = async () => {
            setCreditsLoading(true);
            try {
                const res = await fetch('/api/credits/balance', {
                    method: 'GET',
                    credentials: 'include',
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data?.success === false) return;

                if (data?.exempt) {
                    if (!cancelled) setCreditsExempt(true);
                } else {
                    if (!cancelled) setCredits(data?.credits ?? 0);
                }
            } catch {
                // If credits endpoint fails, keep UI minimal (no badge).
            } finally {
                if (!cancelled) setCreditsLoading(false);
            }
        };

        loadCredits();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, user?.id]);

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

    useEffect(() => {
        try {
            const saved = localStorage.getItem('explore_ai_prompt_v1');
            if (saved) setAiPrompt(saved);
        } catch {
            // ignore storage failures
        }
    }, []);

    const handleAiSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            setAiNotice({ type: 'error', text: 'Please log in to use AI planning.' });
            return;
        }
        if (!aiPrompt.trim()) {
            setAiNotice({ type: 'error', text: 'Describe your campaign in one sentence.' });
            return;
        }
        try {
            localStorage.setItem('explore_ai_prompt_v1', aiPrompt);
        } catch {
            // ignore storage failures
        }
        setAiBusy(true);
        setAiNotice(null);
        const result = await onCreateAiPlan({ prompt: aiPrompt });
        setAiBusy(false);
        if (result?.success) {
            setAiNotice({
                type: 'success',
                text: `Plan created: ${result.plan?.name || 'AI Plan'} | ${result.analysis?.selectedCount || 0} media | ₹${(result.analysis?.spend || 0).toLocaleString()}`,
            });
            setIsAiPanelOpen(false);
            setAiPrompt('');
        } else {
            setAiNotice({ type: 'error', text: result?.error || 'Failed to create AI plan.' });
        }
    };

    return (
        <header className="h-14 bg-black border-b border-gray-800 flex items-center justify-between px-4 sticky top-0 z-50 shrink-0">

            {/* LEFT: PLAN SWITCHER */}
            <div className="relative flex items-center gap-2">
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
                            {isAuthenticated ? 'Plan' : 'Plans'}
                        </p>
                        <div className="flex items-center gap-1">
                            {/* Added max-width to prevent overflow on long plan names */}
                            <p className="text-xs font-bold text-white leading-none mt-1 max-w-[120px] truncate">
                                {currentPlan?.name || (isAuthenticated ? 'No plans yet' : 'Guest')}
                            </p>
                            <ChevronDown size={12} className="text-gray-500 mt-1" />
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setIsAiPanelOpen(true)}
                    className="h-9 min-w-[260px] rounded-lg border border-gray-700 bg-[#0f1115] px-3 text-left text-xs text-gray-300 hover:border-green-500 focus:border-green-500"
                >
                    <span className="flex items-center gap-2">
                        <Sparkles size={14} className="text-cyan-300" />
                        <span className="text-gray-400">Create plan with AI</span>
                    </span>
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
                            <Link
                                href="/plans"
                                onClick={() => setIsPlanOpen(false)}
                                className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 hover:border-green-500 rounded px-3 py-2 text-xs text-gray-200 transition-colors"
                            >
                                <FolderOpen size={14} />
                                View Plans
                            </Link>
                        </div>
                    </div>
                )}

                {isAiPanelOpen && (
                    <div className="absolute top-full left-0 mt-2 w-[420px] bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-gray-800">
                            <p className="text-xs font-bold text-white">AI Plan Builder</p>
                            <p className="text-[11px] text-gray-500">Type naturally. AI will extract city, budget, media types and preferences.</p>
                        </div>
                        <form onSubmit={handleAiSubmit} className="p-4 space-y-3">
                            <textarea
                                rows={5}
                                required
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Example: Create a plan for my medicine brand in Mumbai. Budget is 4 lakh. Prefer cinema and bus shelter near hospitals and high traffic areas."
                                className="w-full resize-none bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-green-500 placeholder-gray-500"
                            />
                            <div className="flex items-center justify-end">
                                <button
                                    type="submit"
                                    disabled={aiBusy}
                                    className="bg-green-600 hover:bg-green-500 disabled:opacity-60 text-black px-4 py-2 rounded text-xs font-bold transition-colors"
                                >
                                    {aiBusy ? 'Planning...' : 'Create Plan'}
                                </button>
                            </div>
                            {aiNotice && (
                                <div className={`rounded px-2 py-1 text-[11px] ${aiNotice.type === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'}`}>
                                    {aiNotice.text}
                                </div>
                            )}
                        </form>
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
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white border border-gray-600 shadow-sm">
                        {getUserInitials(user)}
                    </div>
                </button>

                {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-1">
                            {isAuthenticated ? (
                                <>
                                    {!creditsExempt && (
                                        <div className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <CreditCard size={14} className="text-green-400" />
                                                <p className="text-xs text-white font-medium leading-none whitespace-nowrap">
                                                    {creditsLoading ? '...' : `${credits ?? 0} Credits`}
                                                </p>
                                            </div>
                                            {!creditsLoading && typeof credits === 'number' && credits <= 10 && (
                                                <button
                                                    type="button"
                                                    onClick={handleTopUpCredits}
                                                    className="mt-2 w-full px-2 py-1 rounded-lg border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 text-[10px] text-yellow-200 font-medium transition-colors"
                                                >
                                                    Top up
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {!creditsExempt && <div className="h-px bg-gray-800 my-1" />}
                                    <button className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                        <Settings size={14} /> Account Settings
                                    </button>
                                    <button className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                        <CreditCard size={14} /> Billing
                                    </button>
                                    <div className="h-px bg-gray-800 my-1"></div>
                                    <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/explore'; }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2">
                                        <LogOut size={14} /> Log Out
                                    </button>
                                </>
                            ) : (
                                <a href="/login" className="w-full text-left px-3 py-2 text-xs text-green-400 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                    <LogIn size={14} /> Log In
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {(isPlanOpen || isProfileOpen || isAiPanelOpen) && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => { setIsPlanOpen(false); setIsProfileOpen(false); setIsAiPanelOpen(false); }}
                />
            )}
        </header>
    );
}