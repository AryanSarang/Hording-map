// app/api/profile/explore-preferences/route.js
//
// Get/set the current user's first-visit explore preferences (state + media type).
// Used by the onboarding modal on /explore — see UX spec #6.
//
// Reads/writes go against `public.profiles.explore_preferences` (jsonb).
import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/authServer';
import { supabaseAdmin } from '../../../../lib/supabase';

function sanitize(input) {
    if (!input || typeof input !== 'object') return {};
    const out = {};
    if (input.state != null) out.state = String(input.state).trim().slice(0, 80);
    if (input.mediaType != null) out.mediaType = String(input.mediaType).trim().slice(0, 80);
    return out;
}

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('explore_preferences')
        .eq('id', user.id)
        .maybeSingle();
    if (error) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to read preferences' },
            { status: 500 }
        );
    }
    return NextResponse.json({
        success: true,
        preferences: data?.explore_preferences || {},
    });
}

export async function PUT(req) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    let body = {};
    try {
        body = await req.json();
    } catch (_e) {
        return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }
    const next = sanitize(body);
    if (!next.state) {
        // The form is single-step with no skip button (spec #6), so a state is required.
        return NextResponse.json({ success: false, error: 'State is required' }, { status: 400 });
    }
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ explore_preferences: next })
        .eq('id', user.id);
    if (error) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to save preferences' },
            { status: 500 }
        );
    }
    return NextResponse.json({ success: true, preferences: next });
}
