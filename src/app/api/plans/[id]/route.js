// app/api/plans/[id]/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/authServer';

// Update a plan (name and/or items) for the current user
export async function PUT(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = params;
        const body = await req.json();
        const updates = {};

        if (typeof body.name === 'string') {
            const name = body.name.trim();
            if (!name) {
                return NextResponse.json({ success: false, error: 'Plan name cannot be empty' }, { status: 400 });
            }
            updates.name = name;
        }

        if (Array.isArray(body.items)) {
            updates.items = body.items;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('plans')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select('*')
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, plan: data });
    } catch (error) {
        console.error('PUT /api/plans/[id] error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to update plan' },
            { status: 500 }
        );
    }
}

// Delete a plan for the current user
export async function DELETE(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = params;

        const { error } = await supabaseAdmin
            .from('plans')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/plans/[id] error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to delete plan' },
            { status: 500 }
        );
    }
}

