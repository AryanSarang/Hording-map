// app/api/vendors/metafields/[id]/route.js
// Vendor metafield template (name, type, options) - not values
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

// GET - Fetch single vendor metafield (template)
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const { data: metafield, error } = await supabaseAdmin
            .from('vendor_metafields')
            .select(`
                *,
                metafield_definitions (id, key, label, value_type)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    success: false,
                    error: 'Metafield not found'
                }, { status: 404 });
            }
            throw error;
        }

        return NextResponse.json({
            success: true,
            data: metafield
        }, { status: 200 });

    } catch (error) {
        console.error('GET /api/vendors/metafields/[id] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch metafield'
        }, { status: 500 });
    }
}

// PUT - Update vendor metafield template (name, type, options)
export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const body = await req.json();

        const updates = {};
        if (body.name !== undefined) updates.name = body.name.trim();
        if (body.definitionId !== undefined) updates.definition_id = parseInt(body.definitionId);
        if (body.options !== undefined) updates.options = body.options;
        if (body.displayOrder !== undefined) updates.display_order = body.displayOrder;

        if (body.name && !updates.key) {
            updates.key = body.name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `field_${id}`;
        }

        const { data: updatedMetafield, error } = await supabaseAdmin
            .from('vendor_metafields')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                metafield_definitions (id, key, label, value_type)
            `)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    success: false,
                    error: 'Metafield not found'
                }, { status: 404 });
            }
            throw error;
        }

        return NextResponse.json({
            success: true,
            data: updatedMetafield
        }, { status: 200 });

    } catch (error) {
        console.error('PUT /api/vendors/metafields/[id] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to update metafield'
        }, { status: 500 });
    }
}

// DELETE - Delete vendor metafield template
export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const { error } = await supabaseAdmin
            .from('vendor_metafields')
            .delete()
            .eq('id', id);

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    success: false,
                    error: 'Metafield not found'
                }, { status: 404 });
            }
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Metafield deleted successfully'
        }, { status: 200 });

    } catch (error) {
        console.error('DELETE /api/vendors/metafields/[id] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to delete metafield'
        }, { status: 500 });
    }
}
