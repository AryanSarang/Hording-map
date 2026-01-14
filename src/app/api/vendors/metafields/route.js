import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch all metafields
export async function GET(req) {
    try {
        const { data: metafields, error } = await supabaseAdmin
            .from('Metafields')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: metafields || []
        }, { status: 200 });

    } catch (error) {
        console.error('GET /api/vendor/metafields Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch metafields'
        }, { status: 500 });
    }
}

// POST - Create new metafield
export async function POST(req) {
    try {
        const body = await req.json();

        if (!body.name) {
            return NextResponse.json({
                success: false,
                error: 'Name is required'
            }, { status: 400 });
        }

        const { data: newMetafield, error } = await supabaseAdmin
            .from('Metafields')
            .insert([body])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: newMetafield
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/vendor/metafields Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to create metafield'
        }, { status: 500 });
    }
}
