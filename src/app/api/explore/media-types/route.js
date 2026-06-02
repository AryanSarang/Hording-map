import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getOrSetCached } from '../../../../lib/memoryCache';

export const dynamic = 'force-dynamic';

const MEDIA_TYPES_TTL_MS = 5 * 60_000;

/** Lightweight list of distinct media types for plan creation / filters. */
export async function GET() {
    try {
        const mediaTypes = await getOrSetCached(
            'explore:distinct-media-types',
            MEDIA_TYPES_TTL_MS,
            async () => {
                const { data: typeRows, error: typeErr } = await supabaseAdmin
                    .from('media')
                    .select('media_type')
                    .or('status.eq.active,status.is.null');
                if (typeErr || !Array.isArray(typeRows)) return [];
                return [
                    ...new Set(
                        typeRows.map((r) => (r?.media_type || '').trim()).filter(Boolean)
                    ),
                ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            }
        );
        return NextResponse.json(
            { success: true, mediaTypes },
            { headers: { 'Cache-Control': 'private, max-age=60' } }
        );
    } catch (error) {
        console.error('GET /api/explore/media-types error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to load media types' },
            { status: 500 }
        );
    }
}
