// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// 1. PUBLIC CLIENT (For Read-Only / Browser / Client Components)
// Uses the 'anon' key. Safe for the Explore page and client-side auth.
export const supabase = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 2. ADMIN CLIENT (For Write / API Routes ONLY - server-side)
// Uses the 'service_role' key. Bypasses RLS. Use only in /api routes.
// Created lazily to avoid errors when imported in client components.
let _supabaseAdmin = null;

export const supabaseAdmin = new Proxy({}, {
    get(target, prop) {
        if (!_supabaseAdmin) {
            const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!serviceKey) {
                throw new Error('SUPABASE_SERVICE_KEY is not available. supabaseAdmin can only be used in server-side code (API routes).');
            }
            _supabaseAdmin = createClient(supabaseUrl, serviceKey);
        }
        return _supabaseAdmin[prop];
    }
});
