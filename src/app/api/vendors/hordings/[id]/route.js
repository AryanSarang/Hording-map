import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch a single hording by ID
export async function GET(req, { params }) {
    const { id } = params;
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('hordings')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return NextResponse.json({ success: false, error: 'Hording not found' }, { status: 404 });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        console.error(`GET /api/vendors/hordings/${id} Error:`, error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch hording' }, { status: 500 });
    }
}


// PUT - Update a hording
export async function PUT(req, { params }) {
    const { id } = params;
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const body = await req.json();

        if (Object.keys(body).length === 0) {
            return NextResponse.json({ success: false, error: 'Missing request body' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('hordings')
            .update(body)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data, message: 'Hording updated successfully' }, { status: 200 });

    } catch (error) {
        console.error(`PUT /api/vendors/hordings/${id} Error:`, error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to update hording' }, { status: 500 });
    }
}


// DELETE - Delete a hording
export async function DELETE(req, { params }) {
    const { id } = params;
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const { error } = await supabaseAdmin
            .from('hordings')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Hording deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error(`DELETE /api/vendors/hordings/${id} Error:`, error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to delete hording' }, { status: 500 });
    }
}