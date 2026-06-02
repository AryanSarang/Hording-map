/**
 * Plans landing — instant shell, no blocking SSR.
 *
 * The page paints immediately (header + skeleton grid via PlansList's own
 * loading state). Plans and media types are fetched client-side after mount
 * so clicking "Explore" never waits on a Supabase round-trip.
 */

import { Suspense } from 'react';
import PlansList from './_components/PlansList';
import PlansLoading from './loading';

export default function PlansPage() {
    return (
        <Suspense fallback={<PlansLoading />}>
            <PlansList />
        </Suspense>
    );
}
