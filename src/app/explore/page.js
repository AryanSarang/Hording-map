// app/explore/page.js
import ExploreView from './_components/ExploreView';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/authServer';

// Force the page to fetch fresh data on every visit
export const revalidate = 0;

export default async function ExplorePage() {
    // 1. Fetch data using Supabase Client (public)
    const { data: hoardings, error } = await supabase
        .from('media')
        .select('*, vendor:vendors(name)');

    // 2. Get current user (may be null; explore is public)
    const user = await getCurrentUser();

    if (error) {
        console.error("Supabase Error:", error);
        return <div className="p-10 text-red-500">Error loading data.</div>;
    }

    // 3. Format data (parse JSON strings, ensure numbers, map to camelCase used in explore components)
    const formattedHoardings = (hoardings || []).map(h => ({
        ...h,
        // Identity / vendor / pricing
        vendorId: h.vendor_id,
        rate: h.monthly_rental,
        mediaType: h.media_type,
        imageUrls: h.media || [],

        // Geometry / location
        latitude: h.latitude != null ? parseFloat(h.latitude) : null,
        longitude: h.longitude != null ? parseFloat(h.longitude) : null,
        roadName: h.road_name,
        positionWRTRoad: h.position_wrt_road,

        // Screen / display details
        screenSize: h.screen_size,
        screenPlacement: h.screen_placement,
        displayFormat: h.display_format,
        width: h.width,
        height: h.height,

        // Visibility / meta
        trafficType: h.traffic_type,
        landmark: h.landmark,
        visibility: h.visibility,
        dwellTime: h.dwell_time,

        // Flatten vendor name if needed
        vendorName: h.vendor?.name
    }));

    return <ExploreView hoardings={formattedHoardings} user={user} />;
}
