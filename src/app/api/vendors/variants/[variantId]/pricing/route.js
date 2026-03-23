import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
    await params;
    await req.json().catch(() => ({}));
    return NextResponse.json(
        { success: false, error: 'Variant price tiers have been removed. Use variant rate only.' },
        { status: 410 }
    );
}

