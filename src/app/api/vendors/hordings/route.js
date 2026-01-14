import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch all vendor hordings (with optional filters)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const vendorId = searchParams.get('vendorId');
        const status = searchParams.get('status');
        const city = searchParams.get('city');

        let query = supabaseAdmin
            .from('hordings')
            .select('*');

        // Apply filters if provided
        if (vendorId) {
            query = query.eq('vendorId', vendorId);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (city) {
            query = query.ilike('city', `%${city}%`);
        }

        const { data: hordings, error } = await query.order('id', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: hordings || [],
            count: hordings?.length || 0
        }, { status: 200 });

    } catch (error) {
        console.error('GET /api/vendor/hordings Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch hordings'
        }, { status: 500 });
    }
}

// POST - Create new hording
export async function POST(req) {
    try {
        const body = await req.json();

        // Validate required fields
        if (!body.name || !body.city) {
            return NextResponse.json({
                success: false,
                error: 'Name and City are required'
            }, { status: 400 });
        }

        // Clean numeric fields
        const numericFields = ['width', 'height', 'rate', 'ourRate', 'latitude', 'longitude', 'screenNumber'];
        const cleanBody = { ...body };

        numericFields.forEach(field => {
            if (cleanBody[field] === '' || cleanBody[field] === undefined) {
                cleanBody[field] = null;
            } else if (cleanBody[field] !== null) {
                cleanBody[field] = Number(cleanBody[field]);
            }
        });

        // Set default status if not provided
        if (!cleanBody.status) {
            cleanBody.status = 'pending';
        }

        const { data: newHording, error } = await supabaseAdmin
            .from('hordings')
            .insert([cleanBody])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({
                success: false,
                error: error.message || 'Failed to create hording',
                details: error.details
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            data: newHording,
            message: 'Hording created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/vendor/hordings Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to process request'
        }, { status: 500 });
    }
}
