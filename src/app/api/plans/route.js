// app/api/plans/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/authServer';
import { applyCreditDelta } from '../../../lib/creditsServer';
import { normalizeMediaType } from '../../../lib/mediaTypes';

/**
 * Normalize plan items received from the client. Preserves the pricing-condition
 * picks the user made on each line item (`pricingSelections`) so the plan reflects
 * the agreed-upon multipliers and the same numbers show up across edit sessions.
 */
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
        const incomingSelections =
            raw && typeof raw === 'object' && raw.pricingSelections && typeof raw.pricingSelections === 'object'
                ? raw.pricingSelections
                : null;
        if (!merged.has(mediaId)) {
            merged.set(mediaId, { mediaId, variantIds: [], pricingSelections: {} });
        }
        const entry = merged.get(mediaId);
        const nextSet = new Set([...(entry.variantIds || []), ...incomingVariantIds]);
        entry.variantIds = Array.from(nextSet);
        if (incomingSelections) {
            const cleaned = {};
            for (const [ruleName, picked] of Object.entries(incomingSelections)) {
                const rn = String(ruleName || '').trim();
                if (!rn || !picked) continue;
                const optionLabel = String(picked.optionLabel ?? picked ?? '').trim();
                const mult = Number(picked.multiplier);
                if (!optionLabel) continue;
                cleaned[rn] = {
                    optionLabel,
                    multiplier: Number.isFinite(mult) && mult > 0 ? mult : 1,
                };
            }
            entry.pricingSelections = { ...(entry.pricingSelections || {}), ...cleaned };
        }
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

/** Soft cap mirrors the DB CHECK constraint `plans_states_max_two`. */
export const PLAN_STATES_MAX = 2;

/** Coerce + validate the plan "intent" inputs (media type + states). */
function normalizePlanIntent(body) {
    const mediaTypeRaw = body?.mediaType ?? body?.media_type ?? null;
    const statesRaw = body?.states ?? null;
    const mediaType =
        mediaTypeRaw == null ? null : normalizeMediaType(String(mediaTypeRaw).trim()) || null;

    let states = [];
    if (Array.isArray(statesRaw)) {
        const dedup = new Map();
        for (const s of statesRaw) {
            const v = String(s ?? '').trim();
            if (!v) continue;
            dedup.set(v.toLowerCase(), v);
        }
        states = Array.from(dedup.values()).slice(0, PLAN_STATES_MAX);
    }
    return { mediaType, states };
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
        const { mediaType, states } = normalizePlanIntent(body);

        if (!name) {
            return NextResponse.json({ success: false, error: 'Plan name is required' }, { status: 400 });
        }
        if (!mediaType) {
            return NextResponse.json({ success: false, error: 'Media type is required' }, { status: 400 });
        }
        if (states.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Pick at least one state (max two)' },
                { status: 400 }
            );
        }
        if (states.length > PLAN_STATES_MAX) {
            return NextResponse.json(
                { success: false, error: `Pick at most ${PLAN_STATES_MAX} states` },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('plans')
            .insert({
                user_id: user.id,
                name,
                items,
                media_type: mediaType,
                states,
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

