/**
 * Great-circle distance between two lat/lng points using the Haversine formula.
 * Returned in kilometers. Used by the explore radius filter to test whether a media
 * pin falls within a user-defined circle on the map.
 *
 * Accuracy is fine for the scales we operate at (1–500 km) — sub-meter error vs.
 * the more accurate Vincenty formula, but ~40x faster and a fraction of the code.
 */
const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
    const a1 = Number(lat1);
    const b1 = Number(lng1);
    const a2 = Number(lat2);
    const b2 = Number(lng2);
    if (
        !Number.isFinite(a1) ||
        !Number.isFinite(b1) ||
        !Number.isFinite(a2) ||
        !Number.isFinite(b2)
    ) {
        return Infinity;
    }
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(a2 - a1);
    const dLng = toRad(b2 - b1);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h =
        sinDLat * sinDLat +
        Math.cos(toRad(a1)) * Math.cos(toRad(a2)) * sinDLng * sinDLng;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
