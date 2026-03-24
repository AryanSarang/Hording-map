// app/api/plans/[id]/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/authServer';

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

export async function GET(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const resolved = await params;
        const { id } = resolved;
        const { data, error } = await supabaseAdmin
            .from('plans')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
        if (error) throw error;

        const plan = {
            ...data,
            items: normalizePlanItems(data?.items),
        };

        const mediaIds = plan.items.map((i) => i.mediaId).filter(Boolean);
        let media = [];
        let variants = [];
        if (mediaIds.length > 0) {
            const [{ data: mediaRows }, { data: variantRows }] = await Promise.all([
                supabaseAdmin
                    .from('media')
                    .select('id, city, state, address, landmark, media_type, monthly_rental, media, screen_size, display_format, latitude, longitude')
                    .in('id', mediaIds)
                    .eq('user_id', user.id),
                supabaseAdmin
                    .from('media_variants')
                    .select('id, media_id, variant_title, option1_value, option2_value, option3_value, rate')
                    .in('media_id', mediaIds)
                    .order('display_order', { ascending: true }),
            ]);
            media = mediaRows || [];
            variants = variantRows || [];
        }

        return NextResponse.json({ success: true, plan, media, variants });
    } catch (error) {
        console.error('GET /api/plans/[id] error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to load plan' },
            { status: 500 }
        );
    }
}

// Update a plan (name and/or items) for the current user
export async function PUT(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const resolved = await params;
        const { id } = resolved;
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
            updates.items = normalizePlanItems(body.items);
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

        return NextResponse.json({ success: true, plan: { ...data, items: normalizePlanItems(data?.items) } });
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

        const resolved = await params;
        const { id } = resolved;

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

