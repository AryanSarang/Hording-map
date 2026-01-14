// src/app/auth/callback/route.js
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    // If there's a "next" param (e.g. /explore), go there. Otherwise default to /explore
    const next = requestUrl.searchParams.get('next') || '/explore';

    if (code) {
        const cookieStore = await cookies();

        // Create a Supabase client that can set cookies
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get(name) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name, value, options) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name, options) {
                        cookieStore.set({ name, value: '', ...options });
                    },
                },
            }
        );

        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // SUCCESS: The user is now logged in!
            return NextResponse.redirect(`${requestUrl.origin}${next}`);
        }
    }

    // ERROR: Something went wrong, send them back to login
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_code_error`);
}