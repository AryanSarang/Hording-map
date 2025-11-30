import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// 1. PUBLIC CLIENT (For Read-Only / Browser)
// Uses the 'anon' key. Safe for the Explore page.
export const supabase = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 2. ADMIN CLIENT (For Write / API Routes)
// Uses the 'service_role' key. Bypasses security. Use only in /api routes.
export const supabaseAdmin = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_KEY
);