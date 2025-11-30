// src/app/api/formdata/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase'; // Adjust path if needed

export async function POST(req) {
    try {
        const body = await req.json();
        console.log("Received data:", body);

        let vendorId = null;

        // --- 1. LOGIC: Vendor Find or Create ---
        // (Replicates Sequelize's findOrCreate)
        if (body.vendorName && body.vendorName.trim() !== '') {
            const vendorName = body.vendorName.trim();

            // A. Try to find existing vendor
            const { data: existingVendor } = await supabaseAdmin
                .from('Vendors')
                .select('id')
                .eq('name', vendorName)
                .single();

            if (existingVendor) {
                vendorId = existingVendor.id;
            } else {
                // B. If not found, Create new one
                const { data: newVendor, error: createError } = await supabaseAdmin
                    .from('Vendors')
                    .insert([{ name: vendorName }])
                    .select('id')
                    .single();

                if (createError) {
                    throw new Error(`Failed to create vendor: ${createError.message}`);
                }
                vendorId = newVendor.id;
            }
        }

        // --- 2. LOGIC: Data Cleaning ---
        // (Matches your exact numericFields list)
        const numericFields = ['width', 'height', 'rate', 'ourRate', 'latitude', 'longitude', 'screenNumber'];
        const cleanBody = { ...body };

        numericFields.forEach(field => {
            if (cleanBody[field] === '' || cleanBody[field] === undefined) {
                cleanBody[field] = null;
            }
        });

        // Prepare final object for insertion
        cleanBody.vendorId = vendorId;
        delete cleanBody.vendorName; // Remove field not present in Hordings table

        // --- 3. LOGIC: Create Hording Entry ---
        const { data: newEntry, error: insertError } = await supabaseAdmin
            .from('Hordings')
            .insert([cleanBody])
            .select()
            .single();

        // --- 4. LOGIC: Error Handling ---
        if (insertError) {
            console.error("Supabase Insert Error:", insertError);

            // Mimic Validation Error response structure
            return NextResponse.json({
                message: "Validation failed or Database Error.",
                error: insertError.message,
                details: insertError.details
            }, { status: 400 });
        }

        return NextResponse.json(newEntry, { status: 201 });

    } catch (error) {
        console.error("!!! API Error:", error);
        return NextResponse.json({
            message: "Failed to process request.",
            error: error.message
        }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        // Fetch all data
        const { data: allHordings, error } = await supabaseAdmin
            .from('Hordings')
            .select('*');

        if (error) {
            throw error;
        }

        return NextResponse.json(allHordings, { status: 200 });

    } catch (error) {
        console.error("!!! API Error (GET):", error);
        return NextResponse.json({
            message: "Failed to fetch data.",
            error: error.message
        }, { status: 500 });
    }
}