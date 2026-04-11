import { NextResponse } from 'next/server';
import { applyCreditDelta } from '../../../../lib/creditsServer';

const COSTS = {
  search: 3,
  filter: 5,
};

const FILTER_COST_MIN = 5;
const FILTER_COST_MAX = 150;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (!action || !Object.prototype.hasOwnProperty.call(COSTS, action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    let cost = COSTS[action];
    if (action === 'filter' && typeof body?.cost === 'number' && Number.isFinite(body.cost)) {
      const rounded = Math.round(body.cost);
      cost = Math.min(FILTER_COST_MAX, Math.max(FILTER_COST_MIN, rounded));
    }

    const delta = -cost;

    const meta = {
      source: body?.source || 'explore',
      ...body?.metadata,
    };

    const res = await applyCreditDelta({
      action,
      delta,
      metadata: meta,
    });

    if (res.success === false) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      cost,
      exempt: res.exempt,
      charged: res.applied,
      credits: res.credits,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to consume credits' },
      { status: 500 }
    );
  }
}

