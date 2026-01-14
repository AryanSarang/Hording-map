// src/app/onboarding/page.js
"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { User, Phone, Building, Loader2, Globe } from 'lucide-react';

export default function OnboardingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(null);

    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        company_name: '',
        referral_select: '',
        referral_other: '',
    });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) router.push('/login');
            setUserId(user?.id);

            if (user?.user_metadata?.full_name) {
                setFormData(prev => ({ ...prev, full_name: user.user_metadata.full_name }));
            }
        };
        getUser();
    }, [supabase, router]);

    // --- NEW: Phone Number Validation ---
    const handlePhoneChange = (e) => {
        const rawValue = e.target.value;
        // 1. Regex: Remove any character that is NOT a digit (0-9)
        const numericValue = rawValue.replace(/[^0-9]/g, '');

        // 2. Limit length to 10 digits (Standard Mobile)
        if (numericValue.length <= 10) {
            setFormData({ ...formData, phone_number: numericValue });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Safety Check: Ensure phone is exactly 10 digits
        if (formData.phone_number.length !== 10) {
            alert("Please enter a valid 10-digit phone number.");
            return;
        }

        setLoading(true);

        const finalReferral = formData.referral_select === 'Other'
            ? `Other: ${formData.referral_other}`
            : formData.referral_select;

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: formData.full_name,
                phone_number: formData.phone_number,
                company_name: formData.company_name,
                referral_source: finalReferral,
                is_onboarded: true,
                status: 'pending'
            })
            .eq('id', userId);

        if (error) {
            alert("Error updating profile: " + error.message);
            setLoading(false);
        } else {
            // SUCCESS: Redirect to Homepage (not Explore)
            router.push('/?onboarding_complete=true');
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl">

                <div className="text-center mb-8">
                    <h1 className="text-xl  text-white mb-2">Complete Your Profile</h1>
                    <p className="text-sm text-gray-500">Tell us a bit about yourself to get started.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Full Name */}
                    <div>
                        <label className="block text-xs  text-gray-500 uppercase mb-1">Full Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-green-500 outline-none transition-colors"
                                required
                            />
                            <User className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        </div>
                    </div>

                    {/* Phone Number (Strictly Numeric) */}
                    <div>
                        <label className="block text-xs  text-gray-500 uppercase mb-1">Phone Number</label>
                        <div className="relative">
                            <input
                                type="tel" // 'tel' brings up numeric keypad on mobile
                                value={formData.phone_number}
                                onChange={handlePhoneChange} // 👈 Uses our custom handler
                                placeholder="9876543210"
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-green-500 outline-none transition-colors tracking-widest placeholder-gray-600"
                                required
                            />
                            <Phone className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        </div>
                        {formData.phone_number.length > 0 && formData.phone_number.length < 10 && (
                            <p className="text-[10px] text-red-400 mt-1 ml-1">Must be 10 digits</p>
                        )}
                    </div>

                    {/* Company (Optional) */}
                    <div>
                        <label className="block text-xs  text-gray-500 uppercase mb-1">Company Name <span className="text-gray-600 font-normal lowercase">(optional)</span></label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-green-500 outline-none transition-colors"
                            />
                            <Building className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        </div>
                    </div>

                    {/* Referral Source */}
                    <div>
                        <label className="block text-xs  text-gray-500 uppercase mb-1">Where did you hear about us?</label>
                        <div className="relative">
                            <select
                                value={formData.referral_select}
                                onChange={(e) => setFormData({ ...formData, referral_select: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-8 py-2.5 text-sm focus:border-green-500 outline-none appearance-none transition-colors"
                                required
                            >
                                <option value="" disabled>Select an option</option>
                                <option value="Google Search">Google Search</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Friend/Colleague">Friend / Colleague</option>
                                <option value="Other">Other</option>
                            </select>
                            <Globe className="absolute left-3 top-2.5 text-gray-500" size={16} />
                            <span className="absolute right-3 top-3 text-gray-500 text-xs">▼</span>
                        </div>
                    </div>

                    {/* Conditional "Other" Input */}
                    {formData.referral_select === 'Other' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <input
                                type="text"
                                placeholder="Please specify..."
                                value={formData.referral_other}
                                onChange={(e) => setFormData({ ...formData, referral_other: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:border-green-500 outline-none transition-colors"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || formData.phone_number.length !== 10}
                        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black  py-3 rounded-lg transition-colors text-sm mt-4 uppercase tracking-wide"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Complete Setup'}
                    </button>
                </form>
            </div>
        </div>
    );
}