// src/app/explore/_components/MapSection.js
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster'; // 👈 IMPORT THIS
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';

// Fix icons
const icon = typeof window !== 'undefined' ? L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
}) : null;

const DEFAULT_CENTER = [19.0760, 72.8777];

function MapController({ selectedId, hoardings }) {
    const map = useMap();
    useEffect(() => {
        if (selectedId) {
            const target = hoardings.find(h => h.id === selectedId);
            if (target && target.latitude && target.longitude) {
                map.flyTo([target.latitude, target.longitude], 16, { duration: 1.5 });
            }
        }
    }, [selectedId, hoardings, map]);
    return null;
}

export default function MapSection({ hoardings, selectedId, onSelect }) {
    return (
        <div className="w-full h-full relative isolate bg-black"> {/* Dark bg for loading */}

            {/* Floating Search Bar (Dark Mode) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[40%]">
                <div className="relative shadow-xl">
                    <input
                        type="text"
                        placeholder="Search location..."
                        className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-700 bg-gray-900/90 text-white placeholder-gray-400 backdrop-blur-md focus:bg-black focus:border-green-500 outline-none text-sm transition"
                    />
                    <span className="absolute left-4 top-3.5 text-gray-400">🔍</span>
                </div>
            </div>

            <MapContainer
                center={DEFAULT_CENTER}
                zoom={11}
                scrollWheelZoom={true}
                className="w-full h-full z-0"
                style={{ height: "100%", width: "100%", background: "#111" }}
            >
                {/* 👇 DARK MODE TILES */}
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController selectedId={selectedId} hoardings={hoardings} />

                {/* 👇 CLUSTERING WRAPPER */}
                <MarkerClusterGroup
                    chunkedLoading
                    spiderfyOnMaxZoom={true}
                >
                    {hoardings.map((h) => (
                        h.latitude && h.longitude ? (
                            <Marker
                                key={h.id}
                                position={[h.latitude, h.longitude]}
                                icon={icon}
                                eventHandlers={{
                                    click: () => onSelect(h.id), // This triggers the detail view update
                                }}
                            >
                                {/* Optional: Remove Popup if you want users to look at the side panel instead */}
                                <Popup className="custom-popup">
                                    <div className="text-black text-xs font-bold">{h.address}</div>
                                </Popup>
                            </Marker>
                        ) : null
                    ))}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}