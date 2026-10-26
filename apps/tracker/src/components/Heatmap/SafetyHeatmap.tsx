'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { CommunityReport } from '../../types/community';
import { Loader2 } from 'lucide-react';

interface SafetyHeatmapProps {
  reports: CommunityReport[];
  selectedReport: CommunityReport | null;
  onSelectReport: (report: CommunityReport) => void;
  tileUrl?: string;
  attribution?: string;
}

const HeatmapClient = dynamic(() => import('./HeatmapClient'), {
  ssr: false,
  loading: () => (
    <div className="map-loading-container">
      <div className="map-loader-card">
        <Loader2 className="animate-spin text-teal" size={32} />
        <p className="loading-text">Loading Community Safety Heatmap...</p>
        <span className="loading-subtext">Aggregating reported safety zones & markers</span>
      </div>
    </div>
  ),
});

export default function SafetyHeatmap(props: SafetyHeatmapProps) {
  return (
    <HeatmapClient
      tileUrl={props.tileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
      attribution={
        props.attribution ||
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
      {...props}
    />
  );
}
