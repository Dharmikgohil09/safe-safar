'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinates, Destination } from '../../types/tracker';
import { Compass, Locate, Maximize2, ShieldAlert } from 'lucide-react';

interface SafetyMapClientProps {
  currentLocation: Coordinates | null;
  destination?: Destination | null;
  breadcrumbs: [number, number][];
  isSosActive?: boolean;
  isStale?: boolean;
  tileUrl: string;
  attribution: string;
}

export default function SafetyMapClient({
  currentLocation,
  destination,
  breadcrumbs,
  isSosActive = false,
  isStale = false,
  tileUrl,
  attribution,
}: SafetyMapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const pathLineRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  const [autoFollow, setAutoFollow] = useState<boolean>(true);

  // Initialize Map instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center (New Delhi / fallback)
    const initialLat = currentLocation?.latitude ?? 28.6139;
    const initialLng = currentLocation?.longitude ?? 77.2090;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false, // We render custom polished controls
      attributionControl: true,
    });

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(map);

    // If user pans manually, disable autoFollow
    map.on('dragstart', () => {
      setAutoFollow(false);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [tileUrl, attribution]);

  // Create or Update Destination Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!destination) {
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }
      return;
    }

    const destLatLng: L.LatLngTuple = [destination.latitude, destination.longitude];

    const destIcon = L.divIcon({
      className: 'safesafar-destination-marker',
      html: `
        <div class="dest-pin">
          <div class="dest-pin-inner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
          </div>
          <div class="dest-label">${destination.name}</div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setLatLng(destLatLng);
    } else {
      const marker = L.marker(destLatLng, { icon: destIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px;">
          <strong style="color: #0f172a;">Destination:</strong> ${destination.name}<br/>
          ${destination.address ? `<span style="color: #64748b; font-size: 11px;">${destination.address}</span>` : ''}
        </div>
      `);
      destinationMarkerRef.current = marker;
    }
  }, [destination]);

  // Update Breadcrumbs Path
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (breadcrumbs.length > 1) {
      if (!pathLineRef.current) {
        pathLineRef.current = L.polyline(breadcrumbs, {
          color: isSosActive ? '#ef4444' : '#0284c7',
          weight: 4,
          opacity: 0.7,
          dashArray: '8, 8',
          lineCap: 'round',
        }).addTo(map);
      } else {
        pathLineRef.current.setLatLngs(breadcrumbs);
        pathLineRef.current.setStyle({
          color: isSosActive ? '#ef4444' : '#0284c7',
        });
      }
    }
  }, [breadcrumbs, isSosActive]);

  // Update User Marker & Accuracy Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation) return;

    const userLatLng: L.LatLngTuple = [currentLocation.latitude, currentLocation.longitude];

    // Marker styling classes
    const markerColorClass = isSosActive ? 'sos-marker' : isStale ? 'stale-marker' : 'live-marker';
    const headingRotation = typeof currentLocation.heading === 'number' ? currentLocation.heading : null;

    const userIcon = L.divIcon({
      className: 'safesafar-user-marker-container',
      html: `
        <div class="safesafar-pulse-marker ${markerColorClass}">
          <div class="pulse-ring"></div>
          <div class="pulse-ring delay"></div>
          <div class="marker-core">
            ${
              headingRotation !== null
                ? `<div class="heading-arrow" style="transform: rotate(${headingRotation}deg);">▲</div>`
                : `<div class="core-dot"></div>`
            }
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLatLng);
      userMarkerRef.current.setIcon(userIcon);
    } else {
      userMarkerRef.current = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    }

    // Accuracy Circle
    const accuracy = currentLocation.accuracy || 15;
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(userLatLng);
      accuracyCircleRef.current.setRadius(accuracy);
    } else {
      accuracyCircleRef.current = L.circle(userLatLng, {
        radius: accuracy,
        color: isSosActive ? '#ef4444' : '#0ea5e9',
        fillColor: isSosActive ? '#ef4444' : '#38bdf8',
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(map);
    }

    // Connect line to destination if available
    if (destination) {
      const routePoints: [L.LatLngTuple, L.LatLngTuple] = [
        userLatLng,
        [destination.latitude, destination.longitude],
      ];
      if (routeLineRef.current) {
        routeLineRef.current.setLatLngs(routePoints);
      } else {
        routeLineRef.current = L.polyline(routePoints, {
          color: '#94a3b8',
          weight: 2,
          opacity: 0.5,
          dashArray: '4, 6',
        }).addTo(map);
      }
    }

    // Auto-center if enabled
    if (autoFollow) {
      map.panTo(userLatLng, { animate: true, duration: 1 });
    }
  }, [currentLocation, destination, isSosActive, isStale, autoFollow]);

  // Map Controls Handlers
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation) return;
    map.flyTo([currentLocation.latitude, currentLocation.longitude], 16, { duration: 1.2 });
    setAutoFollow(true);
  };

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const boundsPoints: L.LatLngTuple[] = [];
    if (currentLocation) {
      boundsPoints.push([currentLocation.latitude, currentLocation.longitude]);
    }
    if (destination) {
      boundsPoints.push([destination.latitude, destination.longitude]);
    }
    if (breadcrumbs.length > 0) {
      boundsPoints.push(...breadcrumbs);
    }

    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      setAutoFollow(false);
    }
  };

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} className="map-leaflet-container" />

      {/* Floating Action Map Controls */}
      <div className="map-floating-controls">
        <button
          onClick={handleRecenter}
          className={`map-ctrl-btn ${autoFollow ? 'active' : ''}`}
          title="Recenter and follow user"
          aria-label="Recenter map on tracked user"
        >
          <Locate size={18} />
          <span className="btn-label">{autoFollow ? 'Tracking' : 'Recenter'}</span>
        </button>

        {destination && (
          <button
            onClick={handleFitAll}
            className="map-ctrl-btn"
            title="View full journey route"
            aria-label="Fit entire route on map"
          >
            <Maximize2 size={18} />
            <span className="btn-label">Fit Route</span>
          </button>
        )}
      </div>

      {isSosActive && (
        <div className="sos-map-banner">
          <ShieldAlert size={18} className="banner-icon" />
          <span>EMERGENCY SOS MODE ACTIVE — HIGH PRIORITY LIVE TRACKING</span>
        </div>
      )}
    </div>
  );
}
