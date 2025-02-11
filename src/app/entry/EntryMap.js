"use client"

import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/images/marker-icon-2x.png',
    iconUrl: '/images/marker-icon.png',
    shadowUrl: '/images/marker-shadow.png',
});

const center = { lat: 19.07785, lng: 72.87908 };

function ClickHandler({ onMapClick }) {
    useMapEvents({
        click: (event) => {
            const lat = event.latlng.lat;
            const lng = event.latlng.lng;
            onMapClick(lat, lng);
            console.log("Clicked location:", lat, lng);
        },
    });
    return null;
}

export default function Map({ onMapClick, clickLocation }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-between w-full">
            <MapContainer center={center} zoom={11} style={{ width: '100%', height: '600px' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                />
                <ClickHandler onMapClick={onMapClick} />
                {clickLocation && (
                    <Marker position={[clickLocation.lat, clickLocation.lng]}>
                        <Popup>
                            Latitude: {clickLocation.lat} <br />
                            Longitude: {clickLocation.lng}
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
