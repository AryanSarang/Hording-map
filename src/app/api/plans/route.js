// app/api/plans/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/authServer';
import { applyCreditDelta } from '../../../lib/creditsServer';

function normalizePlanItems(items) {
    if (!Array.isArray(items)) return [];
    const merged = new Map();
    for (const raw of items) {
        if (raw == null) continue;
        const mediaId = typeof raw === 'string'
            ? raw
            : String(raw.mediaId || raw.id || '').trim();
        if (!mediaId) continue;
        const incomingVariantIds = Array.isArray(raw?.variantIds)
            ? raw.variantIds.map((v) => String(v).trim()).filter(Boolean)
            : [];
        if (!merged.has(mediaId)) {
            merged.set(mediaId, { mediaId, variantIds: [] });
        }
        const entry = merged.get(mediaId);
        const nextSet = new Set([...(entry.variantIds || []), ...incomingVariantIds]);
        entry.variantIds = Array.from(nextSet);
        merged.set(mediaId, entry);
    }
    return Array.from(merged.values());
}

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

        const plans = (data || []).map((p) => ({
            ...p,
            items: normalizePlanItems(p.items),
        }));
        return NextResponse.json({ success: true, plans });
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
        const items = normalizePlanItems(body.items);

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

        // Charge non-admin users for creating plans
        const creditRes = await applyCreditDelta({
            action: 'create_plan',
            delta: -2,
            metadata: { mode: 'manual', plan_id: data?.id },
        });

        if (creditRes?.success === false) {
            // Rollback plan creation if credits failed to apply
            await supabaseAdmin
                .from('plans')
                .delete()
                .eq('id', data?.id)
                .eq('user_id', user.id);

            throw new Error(creditRes?.error || 'Failed to charge plan credits');
        }

        return NextResponse.json({ success: true, plan: data }, { status: 201 });
    } catch (error) {
        console.error('POST /api/plans error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to create plan' },
            { status: 500 }
        );
    }
}

