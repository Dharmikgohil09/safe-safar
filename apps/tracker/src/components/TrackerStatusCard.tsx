'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Clock,
  Battery,
  BatteryCharging,
  Gauge,
  Navigation,
  MapPin,
  ShieldAlert,
  AlertCircle,
  Share2,
  PhoneCall,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Coordinates, Destination, TrackingSession } from '../types/tracker';
import { calculateDistanceKm, formatRelativeTime, formatTime } from '../utils/geo';

interface TrackerStatusCardProps {
  session: TrackingSession | null;
  currentLocation: Coordinates | null;
  isStale: boolean;
  isSos?: boolean;
}

export default function TrackerStatusCard({
  session,
  currentLocation,
  isStale,
  isSos = false,
}: TrackerStatusCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  // Re-render relative time every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const distanceKm =
    currentLocation && session?.destination
      ? calculateDistanceKm(
          currentLocation.latitude,
          currentLocation.longitude,
          session.destination.latitude,
          session.destination.longitude
        )
      : null;

  const handleShare = async () => {
    try {
      if (typeof window !== 'undefined') {
        const url = window.location.href;
        if (navigator.share) {
          await navigator.share({
            title: `SafeSafar Live Tracking - ${session?.userName || 'Personal Safety'}`,
            text: `Follow my live safety journey on SafeSafar:`,
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

  const getBatteryIcon = (pct?: number | null) => {
    if (pct === undefined || pct === null) return null;
    let colorClass = 'battery-high';
    if (pct <= 20) colorClass = 'battery-critical';
    else if (pct <= 45) colorClass = 'battery-med';

    return (
      <div className={`metric-badge ${colorClass}`} title={`Device Battery: ${pct}%`}>
        <Battery size={14} />
        <span>{pct}%</span>
      </div>
    );
  };

  return (
    <div className={`tracker-bottom-panel ${collapsed ? 'collapsed' : ''} ${isSos ? 'panel-sos' : ''}`}>
      {/* Drag / Toggle bar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="collapse-toggle-btn"
        aria-label={collapsed ? 'Expand details' : 'Collapse details'}
      >
        <span className="toggle-pill"></span>
        <span className="toggle-icon">
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Stale Warning Banner */}
      {isStale && (
        <div className="stale-warning-strip">
          <AlertCircle size={16} className="stale-icon" />
          <span>
            Telemetry Delayed: No location updates received in over 90s. Device might be in low network coverage.
          </span>
        </div>
      )}

      {/* Main Person & Status Row */}
      <div className="person-info-row">
        <div className="person-avatar-block">
          <div className={`avatar-circle ${isSos ? 'avatar-sos' : ''}`}>
            <User size={22} />
          </div>
          <div className="person-meta">
            <h2 className="person-name">{session?.userName || 'Tracked Individual'}</h2>
            <div className="person-submeta">
              <span className="phone-mask">{session?.userPhoneMasked || 'Protected Contact'}</span>
              <span className="meta-separator">•</span>
              <span className={`journey-status-tag ${session?.status || 'active'}`}>
                {isSos ? '🚨 SOS Emergency' : (session?.status ? session.status.toUpperCase() : 'IN TRANSIT')}
              </span>
            </div>
          </div>
        </div>

        <div className="quick-battery-time">
          {getBatteryIcon(session?.batteryLevel ?? (currentLocation as any)?.batteryLevel)}
        </div>
      </div>

      {/* Expandable Section */}
      {!collapsed && (
        <>
          {/* Telemetry Metrics Grid */}
          <div className="telemetry-grid">
            <div className="telemetry-card">
              <div className="telemetry-icon-box">
                <Clock size={16} />
              </div>
              <div className="telemetry-text">
                <span className="telemetry-label">Last Updated</span>
                <span className="telemetry-value">
                  {formatRelativeTime(session?.lastUpdated || (currentLocation as any)?.timestamp)}
                </span>
                <span className="telemetry-sub">
                  {formatTime(session?.lastUpdated || (currentLocation as any)?.timestamp)}
                </span>
              </div>
            </div>

            <div className="telemetry-card">
              <div className="telemetry-icon-box">
                <Gauge size={16} />
              </div>
              <div className="telemetry-text">
                <span className="telemetry-label">Speed</span>
                <span className="telemetry-value">
                  {currentLocation?.speed !== undefined && currentLocation.speed !== null
                    ? `${Math.round(currentLocation.speed)} km/h`
                    : '--'}
                </span>
                <span className="telemetry-sub">
                  {currentLocation?.speed && currentLocation.speed > 3 ? 'Moving' : 'Stationary'}
                </span>
              </div>
            </div>

            <div className="telemetry-card">
              <div className="telemetry-icon-box">
                <Navigation size={16} />
              </div>
              <div className="telemetry-text">
                <span className="telemetry-label">GPS Precision</span>
                <span className="telemetry-value">
                  {currentLocation?.accuracy ? `±${Math.round(currentLocation.accuracy)}m` : 'Accurate'}
                </span>
                <span className="telemetry-sub">High Confidence</span>
              </div>
            </div>
          </div>

          {/* Destination & Route Info */}
          {session?.destination && (
            <div className="destination-banner">
              <div className="dest-icon-circle">
                <MapPin size={18} />
              </div>
              <div className="dest-details">
                <div className="dest-header-line">
                  <span className="dest-title">Destination</span>
                  {distanceKm !== null && (
                    <span className="dest-distance">
                      {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`}
                    </span>
                  )}
                </div>
                <div className="dest-name">{session.destination.name}</div>
                {session.destination.address && (
                  <div className="dest-addr">{session.destination.address}</div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="action-buttons-group">
            <button
              onClick={handleGoogleMapsDirections}
              className="action-btn secondary-btn"
              title="Open coordinates in external map"
            >
              <ExternalLink size={16} />
              <span>Open in Maps</span>
            </button>

            <button
              onClick={handleShare}
              className="action-btn secondary-btn"
              title="Share tracking link"
            >
              <Share2 size={16} />
              <span>{copied ? 'Link Copied!' : 'Share Link'}</span>
            </button>

            <a
              href="tel:112"
              className="action-btn emergency-btn"
              title="Emergency SOS Hotline (112)"
            >
              <PhoneCall size={16} />
              <span>Emergency (112)</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
