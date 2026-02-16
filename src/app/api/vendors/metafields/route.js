// app/api/vendors/metafields/route.js
// Vendor metafields = custom field templates (name + type). Available when creating ANY hording.
// Values are filled when creating/editing a hording, not here.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// GET - Fetch all vendor metafields (custom field definitions - templates)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const vendorId = searchParams.get('vendorId') || 1; // Default to 1 until auth

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
                metafield_definitions (id, key, label, value_type)
            `)
            .eq('vendor_id', vendorId)
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

// POST - Create new metafield (name + type only; values filled when creating hordings)
export async function POST(req) {
    try {
        const body = await req.json();

        if (!body.name?.trim() || !body.definitionId) {
            return NextResponse.json({
                success: false,
                error: 'Name and metafield type are required'
            }, { status: 400 });
        }

        const vendorId = body.vendorId || 1;

        // Auto-generate key from name
        const key = body.name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

        const dbPayload = {
            vendor_id: parseInt(vendorId),
            name: body.name.trim(),
            key: key || `field_${Date.now()}`,
            definition_id: parseInt(body.definitionId),
            options: body.options || null, // For dropdown: ["Option A", "Option B"]
            display_order: body.displayOrder ?? 0
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
