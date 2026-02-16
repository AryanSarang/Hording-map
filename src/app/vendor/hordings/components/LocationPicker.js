'use client';

import { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [19.076, 72.8777];
const DEFAULT_ZOOM = 12;

const markerIcon = typeof window !== 'undefined' ? L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
}) : null;

function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function FlyToLocation({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
            map.flyTo([lat, lng], 16, { duration: 0.5 });
        }
    }, [lat, lng, map]);
    return null;
}

export default function LocationPicker({ latitude, longitude, onLocationSelect, height = 280 }) {
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;
    const hasMarker = lat != null && !isNaN(lat) && lng != null && !isNaN(lng);
    const center = hasMarker ? [lat, lng] : DEFAULT_CENTER;
    const zoom = hasMarker ? 16 : DEFAULT_ZOOM;

    const handleDragEnd = useCallback((e) => {
        const pos = e.target.getLatLng();
        onLocationSelect(pos.lat, pos.lng);
    }, [onLocationSelect]);

    return (
        <div className="location-picker" style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #1e293b' }}>
            <div style={{ height: height - 32 }}>
                <MapContainer
                    center={center}
                    zoom={zoom}
                    scrollWheelZoom
                    style={{ height: '100%', width: '100%' }}
                    className="location-picker-map"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onLocationSelect={onLocationSelect} />
                    {hasMarker && <FlyToLocation lat={lat} lng={lng} />}
                    {hasMarker && (
                        <Marker
                            position={[lat, lng]}
                            icon={markerIcon}
                            draggable
                            eventHandlers={{ dragend: handleDragEnd }}
                        />
                    )}
                </MapContainer>
            </div>
            <p style={{ fontSize: 10, color: '#64748b', margin: 6, paddingTop: 4 }}>
                Click on the map to place a marker, or drag the marker to adjust. Latitude and longitude are set automatically.
            </p>
        </div>
    );
}
