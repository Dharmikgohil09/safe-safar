'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Coordinates, Destination } from '../../types/tracker';
import { Loader2 } from 'lucide-react';

interface SafetyMapProps {
  currentLocation: Coordinates | null;
  destination?: Destination | null;
  breadcrumbs: [number, number][];
  isSosActive?: boolean;
  isStale?: boolean;
  tileUrl?: string;
  attribution?: string;
}

const SafetyMapClient = dynamic(() => import('./SafetyMapClient'), {
  ssr: false,
  loading: () => (
    <div className="map-loading-container">
      <div className="map-loader-card">
        <Loader2 className="animate-spin text-teal" size={32} />
        <p className="loading-text">Initializing SafeSafar Secure Map Canvas...</p>
        <span className="loading-subtext">Connecting to OpenStreetMap satellite & street layer</span>
      </div>
    </div>
  ),
});

export default function SafetyMap(props: SafetyMapProps) {
  return (
    <SafetyMapClient
      tileUrl={props.tileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
      attribution={
        props.attribution ||
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
      {...props}
    />
  );
}
