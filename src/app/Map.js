"use client"

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamically import MapContainer and other components to ensure they are only used on the client side
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

const places = [
    { lat: 43.642693, lng: -79.3871189 },
    { lat: 43.642793, lng: -79.3871789 },
    { lat: 43.647693, lng: -79.3877189 }
];

const center = places[0];

export default function Map() {
    const [selectedPlace, setSelectedPlace] = useState(null);

    useEffect(() => {
        // Fix for default marker icon issues with React-Leaflet
        const L = require('leaflet');
        delete L.Icon.Default.prototype._getIconUrl;

        L.Icon.Default.mergeOptions({
            iconRetinaUrl: '/images/marker-icon-2x.png',
            iconUrl: '/images/marker-icon.png',
            shadowUrl: '/images/marker-shadow.png',
        });
    }, []);

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <MapContainer center={center} zoom={13} style={{ width: '600px', height: '600px' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                />
                {places.map((place, index) => (
                    <Marker
                        key={index}
                        position={place}
                        eventHandlers={{
                            click: () => {
                                setSelectedPlace(place === selectedPlace ? null : place);
                            },
                        }}
                    >
                        {selectedPlace === place && (
                            <Popup>
                                <div>
                                    <h3 style={{ color: "black" }}>{selectedPlace.lat}</h3>
                                </div>
                            </Popup>
                        )}
                    </Marker>
                ))}
            </MapContainer>
        </main>
    );
}