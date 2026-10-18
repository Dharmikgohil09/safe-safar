'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Clock,
  Battery,
  Navigation,
  MapPin,
  AlertCircle,
  Share2,
  PhoneCall,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Gauge,
} from 'lucide-react';
import { Coordinates, Destination, TrackingSession, SosState } from '../types/tracker';
import { calculateDistanceKm, formatRelativeTime, formatTime } from '../utils/geo';

interface TrackerStatusCardProps {
  session: TrackingSession | null;
  currentLocation: Coordinates | null;
  isStale: boolean;
  isSos?: boolean;
  sosState?: SosState;
}

export default function TrackerStatusCard({
  session,
  currentLocation,
  isStale,
  isSos = false,
  sosState = 'normal',
}: TrackerStatusCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  const effectiveSos = isSos || sosState === 'active';
  const effectiveResolved = sosState === 'resolved';

  // Periodic tick to keep relative times live
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Distance calculation to destination using Haversine formula
  const distanceKm =
    currentLocation && session?.destination?.latitude && session?.destination?.longitude
      ? calculateDistanceKm(
          currentLocation.latitude,
          currentLocation.longitude,
          session.destination.latitude,
          session.destination.longitude
        )
      : null;

  // Safe timestamp determination: prioritize latest received telemetry timestamp, then session initial timestamp
  const latestTimestamp =
    (currentLocation as any)?.timestamp !== undefined && (currentLocation as any)?.timestamp !== null
      ? (currentLocation as any).timestamp
      : session?.lastUpdated !== undefined && session?.lastUpdated !== null
      ? session.lastUpdated
      : null;

  const handleShare = async () => {
    try {
      if (typeof window !== 'undefined') {
        const url = window.location.href;
        if (navigator.share) {
          await navigator.share({
            title: `SafeSafar Tracking: ${session?.userName || 'Personal Safety'}`,
            text: `Live tracking link for ${session?.userName || 'trip'}:`,
            url,
          });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      }
    } catch {
      // User cancelled or unsupported
    }
  };

  const handleGoogleMapsDirections = () => {
    if (!currentLocation) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${currentLocation.latitude},${currentLocation.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getStatusBadge = () => {
    if (effectiveSos) {
      return (
        <span className="status-badge badge-sos">
          <span className="status-dot dot-sos"></span>
          SOS Active
        </span>
      );
    }
    if (effectiveResolved) {
      return (
        <span className="status-badge badge-resolved">
          <span className="status-dot dot-resolved"></span>
          Resolved
        </span>
      );
    }
    return (
      <span className="status-badge badge-normal">
        <span className="status-dot dot-normal"></span>
        Active Trip
      </span>
    );
  };

  const batteryPct = session?.batteryLevel ?? (currentLocation as any)?.batteryLevel;

  return (
    <section
      className={`tracker-info-panel ${collapsed ? 'is-collapsed' : ''} ${
        effectiveSos ? 'state-sos' : effectiveResolved ? 'state-resolved' : ''
      }`}
      aria-label="Trip and Telemetry Information"
    >
      {/* Collapse / Expand toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="panel-collapse-bar"
        aria-label={collapsed ? 'Expand details' : 'Collapse details'}
      >
        <span className="collapse-handle"></span>
      </button>

      {/* Stale Warning Strip */}
      {isStale && (
        <div className="stale-alert-row" role="status">
          <AlertCircle size={14} className="alert-icon" />
          <span>Location delayed: No update received in 90+ seconds</span>
        </div>
      )}

      {/* 1. Person's Name & Tracking Status */}
      <div className="panel-primary-row">
        <div className="person-identity">
          <h2 className="person-name">{session?.userName || 'Tracked Individual'}</h2>
          <div className="person-details">
            <span className="phone-text">{session?.userPhoneMasked || 'Protected Contact'}</span>
            <span className="detail-dot">•</span>
            {getStatusBadge()}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="collapse-icon-btn"
          title={collapsed ? 'Expand details' : 'Collapse details'}
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Summary Row (Visible in collapsed state) */}
      {collapsed && (
        <div className="collapsed-summary-row">
          <div className="summary-item">
            <span className="summary-label">Dest:</span>
            <span className="summary-val">{session?.destination?.name || 'No destination specified'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Updated:</span>
            <span className="summary-val">{formatRelativeTime(latestTimestamp)}</span>
          </div>
        </div>
      )}

      {/* Expanded Information Panel */}
      {!collapsed && (
        <div className="panel-body">
          {/* 2. Last Location Update */}
          <div className="data-row">
            <div className="data-cell">
              <span className="cell-label">Last Location Update</span>
              <div className="cell-value-group">
                <span className="cell-value">{formatRelativeTime(latestTimestamp)}</span>
                {latestTimestamp && <span className="cell-sub">{formatTime(latestTimestamp)}</span>}
              </div>
            </div>

            {/* 3. Coordinates & Precision */}
            <div className="data-cell">
              <span className="cell-label">Coordinates</span>
              <div className="cell-value-group">
                <span className="cell-value cell-mono">
                  {currentLocation
                    ? `${currentLocation.latitude.toFixed(4)}°, ${currentLocation.longitude.toFixed(4)}°`
                    : 'Awaiting signal'}
                </span>
                <span className="cell-sub">
                  {currentLocation?.accuracy ? `±${Math.round(currentLocation.accuracy)}m precision` : 'Standard accuracy'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Speed & Battery Level */}
          <div className="data-row">
            <div className="data-cell">
              <span className="cell-label">Speed</span>
              <div className="cell-value-group">
                <span className="cell-value">
                  {currentLocation?.speed !== undefined && currentLocation.speed !== null
                    ? `${Math.round(currentLocation.speed)} km/h`
                    : 'Unavailable'}
                </span>
                <span className="cell-sub">
                  {currentLocation?.speed && currentLocation.speed > 3 ? 'In motion' : 'Stationary'}
                </span>
              </div>
            </div>

            <div className="data-cell">
              <span className="cell-label">Battery Level</span>
              <div className="cell-value-group">
                <span className="cell-value">
                  {batteryPct !== undefined && batteryPct !== null ? `${batteryPct}%` : 'Unavailable'}
                </span>
                <span className="cell-sub">
                  {batteryPct !== undefined && batteryPct !== null && batteryPct <= 20
                    ? 'Low battery'
                    : 'Normal level'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Destination */}
          <div className="destination-section">
            <div className="dest-header">
              <span className="cell-label">Trip Destination</span>
              {distanceKm !== null && (
                <span className="dest-dist-tag">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`}
                </span>
              )}
            </div>
            <div className="dest-title">
              {session?.destination?.name ? session.destination.name : 'No destination specified'}
            </div>
            <div className="dest-address">
              {session?.destination?.address
                ? session.destination.address
                : session?.destination?.name
                ? 'Address details loaded'
                : 'Trip navigation active without a fixed end point'}
            </div>
          </div>

          {/* 6. Relevant Tracking Actions */}
          <div className="actions-section">
            <button
              type="button"
              onClick={handleGoogleMapsDirections}
              className="action-button secondary-button"
              title="Open coordinates in Google Maps"
            >
              <ExternalLink size={14} />
              <span>Open in Maps</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="action-button secondary-button"
              title="Copy or share tracking link"
            >
              <Share2 size={14} />
              <span>{copied ? 'Link Copied' : 'Share Link'}</span>
            </button>

            <a
              href="tel:112"
              className="action-button emergency-button"
              title="Direct call to Emergency Helpline (112)"
            >
              <PhoneCall size={14} />
              <span>Emergency (112)</span>
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
