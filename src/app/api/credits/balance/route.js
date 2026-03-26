import { NextResponse } from 'next/server';
import { getUserCreditBalance } from '../../../../lib/creditsServer';

export async function GET() {
  try {
    const res = await getUserCreditBalance();
    if (res.success === false) {
      console.error('GET /api/credits/balance failed:', {
        status: res.status,
        error: res.error,
      });
      return NextResponse.json({ success: false, error: res.error }, { status: res.status || 400 });
    }

    return NextResponse.json({
      success: true,
      credits: res.credits,
      exempt: res.exempt,
    });
  } catch (err) {
    console.error('GET /api/credits/balance threw:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to get credits' },
      { status: 500 }
    );
  }
}

