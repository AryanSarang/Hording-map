// src/app/explore/page.js
import ExploreView from './_components/ExploreView';
import { supabase } from '../../lib/supabase'; // Import the Public client

// Force the page to fetch fresh data on every visit
export const revalidate = 0;

export default async function ExplorePage() {
    // 1. Fetch data using Supabase Client
    const { data: hoardings, error } = await supabase
        .from('Hordings') // Make sure this matches your table name exactly
        .select('*, vendor:Vendors(name)');

    if (error) {
        console.error("Supabase Error:", error);
        return <div className="p-10 text-red-500">Error loading data.</div>;
    }

    // 2. Format data (Parse JSON strings, ensure numbers)
    const formattedHoardings = (hoardings || []).map(h => ({
        ...h,
        // If imageUrls is a string "['url']", parse it. If array, keep it.
        imageUrls: typeof h.imageUrls === 'string' ? JSON.parse(h.imageUrls) : (h.imageUrls || []),
        latitude: parseFloat(h.latitude),
        longitude: parseFloat(h.longitude),
        rate: Number(h.rate),
    }));

    return <ExploreView hoardings={formattedHoardings} />;
}