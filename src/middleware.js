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
        // Note: /explore and /plans are NOT public — they require a logged-in,
        // approved user. The new flow is: marketing → login → /plans (create) →
        // /explore?planId=X. /explore on its own should never be reachable.
        const path = request.nextUrl.pathname;
        const isAuthPage = path.startsWith('/login') || path.startsWith('/auth') || path.startsWith('/callback');
        const isPublicPage =
            path === '/' ||
            path.startsWith('/about-us') ||
            path.startsWith('/contact-us') ||
            path.startsWith('/privacy-policy') ||
            path.startsWith('/terms-of-service') ||
            path.startsWith('/cookie-policy');
        const isPublicApi = path.startsWith('/api/contact-submissions');
        // Pending page should be public-ish for those stuck there
        const isPendingPage = path === '/pending';

        // SCENARIO 1: User is NOT logged in (Guest)
        if (!user) {
            // Allow Public Page & Auth Pages. Block everything else.
            if (!isAuthPage && !isPublicPage && !isPublicApi) {
                // Bounce to /login but preserve the destination so the callback can
                // resume the user's intent (e.g. "Explore" → login → /plans).
                const loginUrl = new URL('/login', request.url);
                if (path && path !== '/') {
                    loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
                }
                return NextResponse.redirect(loginUrl);
            }
            return response;
        }

        // SCENARIO 2: User IS logged in
        if (user) {
            try {
                // Fetch Profile status — network blips to Supabase must not crash middleware.
                let profile = null;
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('status, is_onboarded')
                        .eq('id', user.id)
                        .single();
                    if (error && error.code !== 'PGRST116') {
                        console.warn('Middleware Profile Fetch Error:', error.message || error);
                    } else {
                        profile = data;
                    }
                } catch (profileErr) {
                    console.warn(
                        'Middleware: profile fetch failed (network):',
                        profileErr?.message || 'fetch failed'
                    );
                    return response;
                }

                if (profile) {

                    // A. NOT ONBOARDED YET
                    if (!profile.is_onboarded) {
                        // Rule: Allow Homepage, but block Login/Explore -> Force Onboarding
                        if (isPublicPage) {
                            return response; // Allow Homepage
                        }
                        // If they try to go to Login or Explore, send them to Onboarding
                        if (path !== '/onboarding') {
                            return NextResponse.redirect(new URL('/onboarding', request.url));
                        }
                    }

                    // B. PENDING APPROVAL
                    else if (profile.status === 'pending') {
                        // Rule: Allow Homepage, but block Login/Explore -> Force Pending Page
                        if (isPublicPage) {
                            return response; // Allow Homepage
                        }
                        if (path !== '/pending') {
                            return NextResponse.redirect(new URL('/pending', request.url));
                        }
                    }

                    // C. ACTIVE (Approved)
                    else if (profile.status === 'approved' || profile.status === 'active') {
                        // Setup pages → bounce to the plans landing (new flow). If
                        // the user was being sent through a `next` after login, the
                        // callback route honors that — this fallback only fires when
                        // someone manually lands on /login/onboarding/pending.
                        if (path === '/login' || path === '/onboarding' || path === '/pending') {
                            return NextResponse.redirect(new URL('/plans', request.url));
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
