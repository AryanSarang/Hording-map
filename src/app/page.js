"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// This is the most important part of the fix.
// We use 'dynamic' to create a new component that will only load the Map on the client side.
const MapWithNoSSR = dynamic(
  () => import("../app/Map"), // Path to your Map component
  {
    ssr: false, // This ensures it's not rendered on the server
    loading: () => <p className="h-[600px] w-[600px] flex items-center justify-center">Loading map...</p> // Optional: A placeholder while the map loads
  }
);

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <MapWithNoSSR />
    </main>
  );
}