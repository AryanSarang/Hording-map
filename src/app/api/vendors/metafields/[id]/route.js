import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch single metafield
export async function GET(req, { params }) {
    try {
        const { data: metafield, error } = await supabaseAdmin
            .from('Metafields')
            .select('*')
            .eq('id', params.id)
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
        console.error('GET /api/vendor/metafields/[id] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch metafield'
        }, { status: 500 });
    }
}

// PUT - Update metafield
export async function PUT(req, { params }) {
    try {
        const body = await req.json();

        const { data: updatedMetafield, error } = await supabaseAdmin
            .from('Metafields')
            .update(body)
            .eq('id', params.id)
            .select()
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
        console.error('PUT /api/vendor/metafields/[id] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to update metafield'
        }, { status: 500 });
    }
}

// DELETE - Delete metafield
export async function DELETE(req, { params }) {
    try {
        const { error } = await supabaseAdmin
            .from('Metafields')
            .delete()
            .eq('id', params.id);

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
        console.error('DELETE /api/vendor/metafields/[id] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to delete metafield'
        }, { status: 500 });
    }
}
