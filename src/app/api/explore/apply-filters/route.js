import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/authServer';
import { supabaseAdmin } from '../../../../lib/supabase';
import { applyCreditDelta } from '../../../../lib/creditsServer';
import {
    buildExploreMediaQuery,
    fetchExploreCatalogFormatted,
} from '../../../../lib/exploreCatalogFetch';
import { computeExploreFilterCreditCost } from '../../../explore/_components/exploreFilterCredits';
import { coerceLocationStringList } from '../../../../lib/exploreFilterLocation';

export const maxDuration = 60;

const FILTER_COST_MIN = 5;
const FILTER_COST_MAX = 150;

export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json().catch(() => ({}));

        const filterPayload = {
            states: coerceLocationStringList(body.states),
            cities: coerceLocationStringList(body.cities),
            mediaTypes: Array.isArray(body.mediaTypes) ? body.mediaTypes : [],
            minPrice: typeof body.minPrice === 'number' && Number.isFinite(body.minPrice) ? body.minPrice : 0,
            maxPrice:
                typeof body.maxPrice === 'number' && Number.isFinite(body.maxPrice)
                    ? body.maxPrice
                    : null,
            metafieldSelections:
                body.metafieldSelections && typeof body.metafieldSelections === 'object'
                    ? body.metafieldSelections
                    : {},
        };

        const filterForQuery = {
            states: filterPayload.states,
            cities: filterPayload.cities,
            mediaTypes: filterPayload.mediaTypes,
        };

        let exploreMetafieldIds = [];
        try {
            const { data: mfRows, error: mfErr } = await supabaseAdmin
                .from('vendor_metafields')
                .select('id')
                .eq('explore_filter_enabled', true);
            if (!mfErr && Array.isArray(mfRows)) {
                exploreMetafieldIds = mfRows.map((r) => r.id).filter((id) => id != null);
            }
        } catch {
            exploreMetafieldIds = [];
        }

        const { hoardings, error } = await fetchExploreCatalogFormatted(
            supabaseAdmin,
            () => buildExploreMediaQuery(supabaseAdmin, filterForQuery),
            exploreMetafieldIds,
            { states: filterPayload.states, cities: filterPayload.cities }
        );
        if (error) {
            console.error('apply-filters catalog', error);
            return NextResponse.json(
                { success: false, error: 'Failed to load catalog' },
                { status: 500 }
            );
        }

        const rates = hoardings.map((h) => h.rate).filter((r) => r > 0);
        const dataMaxPrice = rates.length > 0 ? Math.max(...rates) : 100000;
        const maxPriceForCost =
            filterPayload.maxPrice != null ? filterPayload.maxPrice : dataMaxPrice;

        const filtersForCost = {
            states: filterPayload.states,
            cities: filterPayload.cities,
            mediaTypes: filterPayload.mediaTypes,
            minPrice: filterPayload.minPrice,
            maxPrice: maxPriceForCost,
            metafieldSelections: filterPayload.metafieldSelections,
        };

        const rawCost = computeExploreFilterCreditCost(filtersForCost, hoardings, dataMaxPrice);
        const cost = Math.min(
            FILTER_COST_MAX,
            Math.max(FILTER_COST_MIN, Math.round(rawCost))
        );

        const creditRes = await applyCreditDelta({
            action: 'filter',
            delta: -cost,
            metadata: {
                source: 'explore',
                filter_cost: cost,
                states: filterPayload.states.length,
                cities: filterPayload.cities.length,
            },
        });

        if (creditRes.success === false) {
            return NextResponse.json(
                { success: false, error: creditRes.error },
                { status: creditRes.status || 400 }
            );
        }

        const charged = creditRes.exempt ? 0 : cost;

        return NextResponse.json({
            success: true,
            hoardings,
            cost: charged,
            exempt: creditRes.exempt,
            credits: creditRes.credits,
        });
    } catch (err) {
        console.error('apply-filters', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to apply filters' },
            { status: 500 }
        );
    }
}
