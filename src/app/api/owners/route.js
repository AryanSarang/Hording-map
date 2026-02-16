// app/api/owners/route.js
// Owners = vendors table (who owns the hording). Separate from logged-in user/vendor.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

// GET - List all owners (vendors) for dropdown
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('vendors')
            .select('id, name, contact_email, contact_phone')
            .order('name', { ascending: true });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data || []
        }, { status: 200 });
    } catch (error) {
        console.error('GET /api/owners Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch owners'
        }, { status: 500 });
    }
}

// POST - Create new owner (vendor)
export async function POST(req) {
    try {
        const body = await req.json();

        if (!body.name?.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Vendor name is required'
            }, { status: 400 });
        }

        const payload = {
            name: body.name.trim(),
            description: body.description?.trim() || null,
            contact_email: body.contactEmail?.trim() || null,
            contact_phone: body.contactPhone?.trim() || null,
            status: body.status || 'active'
        };

        const { data, error } = await supabaseAdmin
            .from('vendors')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data
        }, { status: 201 });
    } catch (error) {
        console.error('POST /api/owners Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to create vendor'
        }, { status: 500 });
    }
}
