// src/app/api/vendors/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Use the public client for reading

export const revalidate = 0;

export async function GET(req) {
    try {
        const { data: vendors, error } = await supabase
            .from('Vendors')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return NextResponse.json(vendors, { status: 200 });
    } catch (error) {
        console.error("Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}