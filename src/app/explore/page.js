// app/explore/page.js
import ExploreView from './_components/ExploreView';
import { supabase } from '../../lib/supabase'; // Import the Public client

// Force the page to fetch fresh data on every visit
export const revalidate = 0;

export default async function ExplorePage() {
    // 1. Fetch data using Supabase Client
    // Use hordings_complete view if possible, otherwise join manually
    // The schema showed 'hordings_complete' view exists. Let's try to use it as it likely has formatted data.
    // But to be safe and strictly follow the previous logic with fixes:
    const { data: hoardings, error } = await supabase
        .from('hordings')
        .select('*, vendor:vendors(name)'); // Fix: Vendors -> vendors (lowercase)

    if (error) {
        console.error("Supabase Error:", error);
        return <div className="p-10 text-red-500">Error loading data.</div>;
    }

    // 2. Format data (Parse JSON strings, ensure numbers)
    const formattedHoardings = (hoardings || []).map(h => ({
        ...h,
        // Map DB columns to frontend expected props (camelCase)
        vendorId: h.vendor_id,
        rate: h.monthly_rental,
        mediaType: h.media_type,
        imageUrls: h.media || [], // Fix: Use media column, it's already an array

        // Ensure numbers
        latitude: parseFloat(h.latitude),
        longitude: parseFloat(h.longitude),

        // Flatten vendor name if needed
        vendorName: h.vendor?.name
    }));

    return <ExploreView hoardings={formattedHoardings} />;
}
