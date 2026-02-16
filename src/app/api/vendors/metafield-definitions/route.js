// app/api/vendors/metafield-definitions/route.js
// Read-only API for metafield definitions (schema) - used when creating metafields
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// GET - Fetch all metafield definitions (schema only - vendors use these when creating metafields)
export async function GET() {
    try {
        const { data: definitions, error } = await supabaseAdmin
            .from('metafield_definitions')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: definitions || []
        }, { status: 200 });

    } catch (error) {
        console.error('GET /api/vendors/metafield-definitions Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch metafield definitions'
        }, { status: 500 });
    }
}
