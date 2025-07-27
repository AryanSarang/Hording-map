"use client";

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const places = [
    { lat: 43.642693, lng: -79.3871189 },
    { lat: 43.642793, lng: -79.3871789 },
    { lat: 43.647693, lng: -79.3877189 }
];

const center = [43.642693, -79.3871189];

export default function Map() {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        // This check ensures the code only runs on the client side
        if (typeof window === 'undefined') {
            return;
        }

        // Initialize the map only if it hasn't been initialized yet
        if (mapContainerRef.current && !mapInstanceRef.current) {
            // Fix for default marker icon issues
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            });

            // Create the map instance
            mapInstanceRef.current = L.map(mapContainerRef.current).setView(center, 13);

            // Add the tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);

            // Add markers
            places.forEach(place => {
                L.marker([place.lat, place.lng])
                    .addTo(mapInstanceRef.current)
                    .bindPopup(`Location: ${place.lat}, ${place.lng}`);
            });
        }

        // IMPORTANT: The cleanup function
        // This function will run when the component is unmounted or re-rendered in development
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []); // The empty dependency array is crucial for this to run only once.

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            {/* This div is the target for our Leaflet map */}
            <div ref={mapContainerRef} style={{ width: '600px', height: '600px' }} />
        </main>
    );
}