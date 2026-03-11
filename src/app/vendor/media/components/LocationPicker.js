'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [19.076, 72.8777];

export default function LocationPicker({ latitude, longitude, onLocationSelect, height = 280 }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current) return;

        if (!mapRef.current) {
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            });
            const lat = latitude ? parseFloat(latitude) : DEFAULT_CENTER[0];
            const lng = longitude ? parseFloat(longitude) : DEFAULT_CENTER[1];
            mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(mapRef.current);

            mapRef.current.on('click', (e) => {
                const { lat, lng } = e.latlng;
                if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
                else markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
                onLocationSelect(lat, lng);
            });

            if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
                markerRef.current = L.marker([parseFloat(latitude), parseFloat(longitude)]).addTo(mapRef.current);
            }
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;
        const lat = latitude ? parseFloat(latitude) : null;
        const lng = longitude ? parseFloat(longitude) : null;
        if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
            }
            mapRef.current.setView([lat, lng], mapRef.current.getZoom());
        }
    }, [latitude, longitude]);

    return (
        <div
            ref={mapContainerRef}
            style={{
                width: '100%',
                height: typeof height === 'number' ? `${height}px` : height,
                borderRadius: 6,
                overflow: 'hidden',
                border: '1px solid #1e293b',
            }}
        />
    );
}
