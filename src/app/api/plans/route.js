// app/api/plans/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/authServer';

// Get all plans for the current authenticated user
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('plans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, plans: data || [] });
    } catch (error) {
        console.error('GET /api/plans error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to load plans' },
            { status: 500 }
        );
    }
}

// Create a new plan for the current user
export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json();
        const name = (body.name || '').trim();
        const items = Array.isArray(body.items) ? body.items : [];

        if (!name) {
            return NextResponse.json({ success: false, error: 'Plan name is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('plans')
            .insert({
                user_id: user.id,
                name,
                items,
            })
            .select('*')
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, plan: data }, { status: 201 });
    } catch (error) {
        console.error('POST /api/plans error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to create plan' },
            { status: 500 }
        );
    }
}

