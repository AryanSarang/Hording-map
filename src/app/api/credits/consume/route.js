import { NextResponse } from 'next/server';
import { applyCreditDelta } from '../../../../lib/creditsServer';

const COSTS = {
  search: 3,
  filter: 5,
};

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

    const cost = COSTS[action];
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

