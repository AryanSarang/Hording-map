// middleware.js
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
    let response = NextResponse.next({
        request: { headers: request.headers },
    });

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get(name) { return request.cookies.get(name)?.value; },
                    set(name, value, options) {
                        try {
                            request.cookies.set({ name, value, ...options });
                            response = NextResponse.next({ request: { headers: request.headers } });
                            response.cookies.set({ name, value, ...options });
                        } catch (e) {
                            // Ignore cookie errors
                        }
                    },
                    remove(name, options) {
                        try {
                            request.cookies.set({ name, value: '', ...options });
                            response = NextResponse.next({ request: { headers: request.headers } });
                            response.cookies.set({ name, value: '', ...options });
                        } catch (e) {
                            // Ignore cookie errors
                        }
                    },
                },
            }
        );

        // 1. Get the User (wrap in try-catch: fetch can fail in Edge when Supabase is unreachable)
        let user = null;
        try {
            const { data } = await supabase.auth.getUser();
            user = data?.user ?? null;
        } catch (authErr) {
            console.warn('Middleware: Auth getUser failed (network/Supabase unreachable):', authErr?.message || 'fetch failed');
            return response;
        }

        // Define paths
        const path = request.nextUrl.pathname;
        const isAuthPage = path.startsWith('/login') || path.startsWith('/auth') || path.startsWith('/callback');
        const isPublicPage = path === '/'; // Homepage is public
        // Pending page should be public-ish for those stuck there
        const isPendingPage = path === '/pending';

        // SCENARIO 1: User is NOT logged in (Guest)
        if (!user) {
            // Allow Public Page & Auth Pages. Block everything else.
            if (!isAuthPage && !isPublicPage) {
                return NextResponse.redirect(new URL('/login', request.url));
            }
            return response;
        }

        // SCENARIO 2: User IS logged in
        if (user) {
            try {
                // Fetch Profile status
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('status, is_onboarded')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    // If error is not "row not found", log it but don't block
                    console.error('Middleware Profile Fetch Error:', error);
                }

                if (profile) {

                    // A. NOT ONBOARDED YET
                    if (!profile.is_onboarded) {
                        // Rule: Allow Homepage, but block Login/Explore -> Force Onboarding
                        if (path === '/') {
                            return response; // ✅ Allow Homepage
                        }
                        // If they try to go to Login or Explore, send them to Onboarding
                        if (path !== '/onboarding') {
                            return NextResponse.redirect(new URL('/onboarding', request.url));
                        }
                    }

                    // B. PENDING APPROVAL
                    else if (profile.status === 'pending') {
                        // Rule: Allow Homepage, but block Login/Explore -> Force Pending Page
                        if (path === '/') {
                            return response; // ✅ Allow Homepage
                        }
                        if (path !== '/pending') {
                            return NextResponse.redirect(new URL('/pending', request.url));
                        }
                    }

                    // C. ACTIVE (Approved)
                    else if (profile.status === 'approved' || profile.status === 'active') {
                        // If they try to go to setup pages, send them to Explore
                        if (path === '/login' || path === '/onboarding' || path === '/pending') {
                            return NextResponse.redirect(new URL('/explore', request.url));
                        }
                    }
                }
            } catch (err) {
                console.error('Middleware Logic Error:', err);
                // On error, let them through to avoid infinite loops, or redirect to home
            }
        }
    } catch (e) {
        // Top level error handler
        console.error('Middleware Top Level Error:', e);
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
