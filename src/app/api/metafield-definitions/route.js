// src/app/api/metafield-definitions/route.js
'use client';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST - Create new metafield definition
export async function POST(request) {
    try {
        const data = await request.json();

        // Validate required fields
        if (!data.key || !data.label || !data.value_type) {
            return Response.json(
                { error: 'Missing required fields: key, label, value_type' },
                { status: 400 }
            );
        }

        // Validate key format (lowercase, underscores only)
        if (!/^[a-z_]+$/.test(data.key)) {
            return Response.json(
                { error: 'Key must contain only lowercase letters and underscores' },
                { status: 400 }
            );
        }

        // Check if key already exists
        const { data: existing } = await supabase
            .from('metafield_definitions')
            .select('id')
            .eq('key', data.key)
            .single();

        if (existing) {
            return Response.json(
                { error: 'A metafield with this key already exists' },
                { status: 400 }
            );
        }

        // Insert new definition
        const { data: definition, error } = await supabase
            .from('metafield_definitions')
            .insert([
                {
                    key: data.key,
                    label: data.label,
                    value_type: data.value_type,
                    is_multiple: data.is_multiple || false,
                    example_value: data.example_value || null,
                    display_order: data.display_order || 0,
                },
            ])
            .select();

        if (error) throw error;

        return Response.json(definition[0], { status: 201 });
    } catch (err) {
        console.error('Error creating definition:', err);
        return Response.json(
            { error: err.message || 'Failed to create definition' },
            { status: 500 }
        );
    }
}

// GET - Fetch all metafield definitions
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const sortBy = searchParams.get('sort') || 'display_order';

        const { data: definitions, error } = await supabase
            .from('metafield_definitions')
            .select('*')
            .order(sortBy, { ascending: true });

        if (error) throw error;

        return Response.json(definitions);
    } catch (err) {
        console.error('Error fetching definitions:', err);
        return Response.json(
            { error: err.message || 'Failed to fetch definitions' },
            { status: 500 }
        );
    }
}