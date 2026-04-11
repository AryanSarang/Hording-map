// app/api/plans/[id]/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/authServer';
import { applyCreditDelta } from '../../../../lib/creditsServer';

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
                    .select('id, city, state, address, landmark, title, media_type, monthly_rental, media, screen_size, display_format, latitude, longitude')
                    .in('id', mediaIds),
                supabaseAdmin
                    .from('media_variants')
                    .select('id, media_id, variant_title, option1_value, option2_value, option3_value, rate, display_order')
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
        let creditCharge = null; // { cost, addedVariantCount }
        let creditChargeRes = null;

        if (typeof body.name === 'string') {
            const name = body.name.trim();
            if (!name) {
                return NextResponse.json({ success: false, error: 'Plan name cannot be empty' }, { status: 400 });
            }
            updates.name = name;
        }

        if (Array.isArray(body.items)) {
            const incomingItems = normalizePlanItems(body.items);

            // Load existing plan items to compute newly added variants
            const { data: existingPlanRow, error: existingErr } = await supabaseAdmin
                .from('plans')
                .select('items')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (existingErr) throw existingErr;

            const oldItems = normalizePlanItems(existingPlanRow?.items);

            // Validate that incoming media belong to the user (prevents charging for invalid media ids)
            const incomingMediaIds = incomingItems.map((it) => it.mediaId).filter(Boolean);
            const { data: validMediaRows, error: validMediaErr } = await supabaseAdmin
                .from('media')
                .select('id')
                .in('id', incomingMediaIds);

            if (validMediaErr) throw validMediaErr;

            const validMediaIds = new Set((validMediaRows || []).map((r) => r.id));
            const filteredIncomingItems = incomingItems.filter((it) => validMediaIds.has(it.mediaId));

            updates.items = filteredIncomingItems;

            const oldByMediaId = new Map(oldItems.map((it) => [it.mediaId, it]));
            const incomingByMediaId = new Map(filteredIncomingItems.map((it) => [it.mediaId, it]));

            const mediaIdsForVariants = new Set();
            for (const k of oldByMediaId.keys()) mediaIdsForVariants.add(k);
            for (const k of incomingByMediaId.keys()) mediaIdsForVariants.add(k);

            const mediaIdsArray = Array.from(mediaIdsForVariants);

            // Fetch all variant ids per media (needed for interpreting empty variantIds as "all variants")
            let allVariantsByMediaId = {};
            if (mediaIdsArray.length > 0) {
                const { data: variantRows, error: variantErr } = await supabaseAdmin
                    .from('media_variants')
                    .select('id, media_id')
                    .in('media_id', mediaIdsArray);
                if (variantErr) throw variantErr;
                allVariantsByMediaId = (variantRows || []).reduce((acc, v) => {
                    if (!acc[v.media_id]) acc[v.media_id] = [];
                    acc[v.media_id].push(v.id);
                    return acc;
                }, {});
            }

            const asSet = (arr) => new Set((arr || []).map((x) => String(x)));

            const computeEffectiveVariantSet = (entry, mediaId) => {
                if (!entry) return new Set(); // media not previously present -> nothing selected
                const explicit = Array.isArray(entry.variantIds) ? entry.variantIds : [];
                if (explicit.length > 0) return asSet(explicit);
                // Empty variantIds means "all variants" for that media
                return asSet(allVariantsByMediaId[mediaId] || []);
            };

            let addedVariantCount = 0;
            for (const mediaId of mediaIdsArray) {
                const oldEntry = oldByMediaId.get(mediaId);
                const incomingEntry = incomingByMediaId.get(mediaId);

                const oldSet = computeEffectiveVariantSet(oldEntry, mediaId);
                const incomingSet = computeEffectiveVariantSet(incomingEntry, mediaId);

                for (const vid of incomingSet) {
                    if (!oldSet.has(vid)) addedVariantCount += 1;
                }
            }

            if (addedVariantCount > 0) {
                const cost = addedVariantCount * 3;
                creditCharge = { cost, addedVariantCount };

                // Charge credits BEFORE saving plan update
                creditChargeRes = await applyCreditDelta({
                    action: 'add_to_plan',
                    delta: -cost,
                    metadata: { plan_id: id, added_variant_count: addedVariantCount },
                });

                if (creditChargeRes?.success === false) {
                    return NextResponse.json(
                        { success: false, error: creditChargeRes?.error || 'Failed to charge credits' },
                        { status: creditChargeRes?.status || 400 }
                    );
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
        }

        let data = null;
        let updateError = null;
        try {
            const res = await supabaseAdmin
                .from('plans')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .eq('user_id', user.id)
                .select('*')
                .single();
            data = res?.data ?? null;
            updateError = res?.error ?? null;
            if (updateError) throw updateError;
        } catch (updateErr) {
            // Refund credits if we had charged and the user was not admin-exempt
            if (creditCharge && creditChargeRes?.success && creditChargeRes?.applied) {
                try {
                    await applyCreditDelta({
                        action: 'refund_add_to_plan',
                        delta: creditCharge.cost,
                        metadata: { plan_id: id, added_variant_count: creditCharge.addedVariantCount },
                    });
                } catch (_) { /* ignore refund failure */ }
            }
            throw updateErr;
        }

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

