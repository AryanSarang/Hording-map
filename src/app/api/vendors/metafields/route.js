// app/api/vendors/metafields/route.js
// Metafields are user-specific: scoped to the current logged-in user.
import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/authServer';
import { supabaseAdmin } from '../../../../lib/supabase';

// GET - Fetch current user's metafield definitions
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'You must be logged in to view metafields'
            }, { status: 401 });
        }

        const { data: metafields, error } = await supabaseAdmin
            .from('vendor_metafields')
            .select(`
                id,
                name,
                key,
                definition_id,
                options,
                display_order,
                created_at,
                explore_filter_enabled,
                metafield_definitions (id, key, label, value_type)
            `)
            .eq('user_id', user.id)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: metafields || []
        }, { status: 200 });

    } catch (error) {
        console.error('GET /api/vendors/metafields Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch metafields'
        }, { status: 500 });
    }
}

// POST - Create metafield for current user (no vendorId required)
export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'You must be logged in to create metafields'
            }, { status: 401 });
        }

        const body = await req.json();

        if (!body.name?.trim() || !body.definitionId) {
            return NextResponse.json({
                success: false,
                error: 'Name and metafield type are required'
            }, { status: 400 });
        }

        const key = body.name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

        const dbPayload = {
            user_id: user.id,
            vendor_id: null, // user-scoped; no vendor required
            name: body.name.trim(),
            key: key || `field_${Date.now()}`,
            definition_id: parseInt(body.definitionId),
            options: body.options || null,
            display_order: body.displayOrder ?? 0,
            explore_filter_enabled: Boolean(body.exploreFilterEnabled),
        };

        const { data: newMetafield, error } = await supabaseAdmin
            .from('vendor_metafields')
            .insert([dbPayload])
            .select(`
                *,
                metafield_definitions (id, key, label, value_type)
            `)
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({
                    success: false,
                    error: 'A metafield with this name already exists'
                }, { status: 400 });
            }
            throw error;
        }

        return NextResponse.json({
            success: true,
            data: newMetafield
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/vendors/metafields Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to create metafield'
        }, { status: 500 });
    }
}
