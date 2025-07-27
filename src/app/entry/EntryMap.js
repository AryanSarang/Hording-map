"use client";

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const center = [19.07785, 72.87908];

export default function EntryMap({ onMapClick, clickLocation }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        // Initialize map
        if (mapContainerRef.current && !mapInstanceRef.current) {
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            });

            mapInstanceRef.current = L.map(mapContainerRef.current).setView(center, 11);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);

            // Add map click event listener
            mapInstanceRef.current.on('click', (e) => {
                const { lat, lng } = e.latlng;
                onMapClick(lat, lng);
            });
        }

        // Cleanup function
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [onMapClick]); // Dependency on onMapClick prop

    // A separate effect to manage the marker when clickLocation changes
    useEffect(() => {
        if (mapInstanceRef.current && clickLocation) {
            if (markerRef.current) {
                markerRef.current.setLatLng([clickLocation.lat, clickLocation.lng]);
            } else {
                markerRef.current = L.marker([clickLocation.lat, clickLocation.lng]).addTo(mapInstanceRef.current);
            }
            mapInstanceRef.current.panTo([clickLocation.lat, clickLocation.lng]);
        }
    }, [clickLocation]);

    return (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    );
}