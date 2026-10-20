'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CommunityReport } from '../../types/community';
import { Locate, Maximize2 } from 'lucide-react';

interface HeatmapClientProps {
  reports: CommunityReport[];
  selectedReport: CommunityReport | null;
  onSelectReport: (report: CommunityReport) => void;
  tileUrl: string;
  attribution: string;
}

export default function HeatmapClient({
  reports,
  selectedReport,
  onSelectReport,
  tileUrl,
  attribution,
}: HeatmapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const selectedCircleRef = useRef<L.Circle | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center on Delhi safety corridor (Connaught Place / Central Delhi)
    const map = L.map(mapContainerRef.current, {
      center: [28.6185, 77.2255],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    layersGroupRef.current = group;
    mapInstanceRef.current = map;

    // Invalidate size immediately and after layout settles
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Watch for parent container size changes (resizing, sidebar changes, orientation change)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (selectedCircleRef.current) {
        selectedCircleRef.current.remove();
        selectedCircleRef.current = null;
      }
      if (layersGroupRef.current) {
        layersGroupRef.current.clearLayers();
        layersGroupRef.current.remove();
        layersGroupRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [tileUrl, attribution]);

  // Render heatmap circles and report markers whenever reports list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    // Clear previous report layers
    group.clearLayers();

    const severityColors: Record<string, string> = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#0284c7',
    };

    reports.forEach((report) => {
      const latLng: L.LatLngTuple = [report.latitude, report.longitude];
      const circleColor = severityColors[report.severity] || '#0284c7';

      let circleRadius = 160;
      let fillOpacity = 0.18;

      if (report.severity === 'critical') {
        circleRadius = 300;
        fillOpacity = 0.28;
      } else if (report.severity === 'high') {
        circleRadius = 240;
        fillOpacity = 0.22;
      } else if (report.severity === 'medium') {
        circleRadius = 190;
        fillOpacity = 0.20;
      }

      // 1. Severity-weighted colored density circle (native Leaflet)
      const heatCircle = L.circle(latLng, {
        radius: circleRadius,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity,
        weight: 2,
        interactive: true,
      });

      // 2. Custom category marker pin
      const isSelected = selectedReport?.id === report.id;
      const markerHtml = `
        <div class="heatmap-map-pin ${report.severity} ${isSelected ? 'is-selected' : ''}" style="--pin-color: ${circleColor};">
          <div class="pin-head">
            <span class="pin-symbol">!</span>
          </div>
          <div class="pin-point"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'heatmap-custom-div-icon',
        html: markerHtml,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });

      const marker = L.marker(latLng, {
        icon: customIcon,
        interactive: true,
      });

      // Selection handler: updates selected report and pans map
      const handleSelect = (e?: L.LeafletMouseEvent) => {
        if (e) {
          L.DomEvent.stopPropagation(e);
        }
        onSelectReport(report);
        map.panTo(latLng, { animate: true, duration: 0.5 });
      };

      heatCircle.on('click', handleSelect);
      marker.on('click', handleSelect);

      group.addLayer(heatCircle);
      group.addLayer(marker);
    });
  }, [reports, selectedReport, onSelectReport]);

  // Highlight and focus selected report with dashed halo ring
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedCircleRef.current) {
      selectedCircleRef.current.remove();
      selectedCircleRef.current = null;
    }

    // Ensure any open popups are closed
    map.closePopup();

    if (selectedReport) {
      const latLng: L.LatLngTuple = [selectedReport.latitude, selectedReport.longitude];

      selectedCircleRef.current = L.circle(latLng, {
        radius: 90,
        color: '#0f172a',
        fillColor: '#0f172a',
        fillOpacity: 0.14,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);

      map.panTo(latLng, { animate: true, duration: 0.5 });
    }
  }, [selectedReport]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([28.6185, 77.2255], 14, { duration: 0.8 });
  };

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map || reports.length === 0) return;

    const points: L.LatLngTuple[] = reports.map((r) => [r.latitude, r.longitude]);
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  };

  return (
    <div className="heatmap-canvas-wrapper">
      <div ref={mapContainerRef} className="heatmap-leaflet-container" />

      {/* Floating Map Actions (Center Area & Fit All) */}
      <div className="heatmap-map-controls">
        <button
          type="button"
          onClick={handleRecenter}
          className="map-ctrl-btn"
          title="Recenter to Central Delhi corridor"
          aria-label="Recenter map"
        >
          <Locate size={14} />
          <span>Center Area</span>
        </button>

        {reports.length > 0 && (
          <button
            type="button"
            onClick={handleFitAll}
            className="map-ctrl-btn"
            title="Fit all visible reports into view"
            aria-label="Fit all visible reports"
          >
            <Maximize2 size={14} />
            <span>Fit All</span>
          </button>
        )}
      </div>
    </div>
  );
}
