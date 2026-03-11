// app/api/vendors/metafields/[id]/route.js
// Vendor metafield template (name, type, options) - user-scoped
import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/authServer';
import { supabaseAdmin } from '../../../../../lib/supabase';

// GET - Fetch single metafield (only if owned by current user)
export async function GET(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        const { data: metafield, error } = await supabaseAdmin
            .from('vendor_metafields')
            .select(`
                *,
                metafield_definitions (id, key, label, value_type)
            `)
            .eq('id', id)
            .eq('user_id', user.id)
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

// PUT - Update metafield (only if owned by current user)
export async function PUT(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
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
            .eq('user_id', user.id)
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

// DELETE - Delete metafield (only if owned by current user)
export async function DELETE(req, { params }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        const { error } = await supabaseAdmin
            .from('vendor_metafields')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

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
