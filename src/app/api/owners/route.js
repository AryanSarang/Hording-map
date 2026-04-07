// app/api/owners/route.js
// Owners = vendors table (media owner names), scoped to the logged-in user.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { getCurrentUser } from '../../../lib/authServer';

// GET - List vendors for the current user (dropdown / filters)
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('vendors')
            .select('id, name, contact_email, contact_phone')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data || [],
        }, { status: 200 });
    } catch (error) {
        console.error('GET /api/owners Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch owners',
        }, { status: 500 });
    }
}

// POST - Create vendor for the current user
export async function POST(req) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        if (!body.name?.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Vendor name is required',
            }, { status: 400 });
        }

        const payload = {
            name: body.name.trim(),
            description: body.description?.trim() || null,
            contact_email: body.contactEmail?.trim() || null,
            contact_phone: body.contactPhone?.trim() || null,
            status: body.status || 'active',
            user_id: user.id,
        };

        const { data, error } = await supabaseAdmin
            .from('vendors')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data,
        }, { status: 201 });
    } catch (error) {
        console.error('POST /api/owners Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to create vendor',
        }, { status: 500 });
    }
}
