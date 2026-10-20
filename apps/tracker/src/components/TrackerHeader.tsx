'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Radio, AlertTriangle, CheckCircle2, RefreshCw, MapPin, LayoutDashboard } from 'lucide-react';
import { ConnectionStatus, SosState } from '../types/tracker';

interface TrackerHeaderProps {
  status: ConnectionStatus;
  isMock: boolean;
  isSos?: boolean;
  sosState?: SosState;
  onRefresh?: () => void;
}

export default function TrackerHeader({
  status,
  isMock,
  isSos = false,
  sosState = 'normal',
  onRefresh,
}: TrackerHeaderProps) {
  const isEmergency = isSos || sosState === 'active';
  const isResolved = sosState === 'resolved';

  const getStatusBadge = () => {
    if (isEmergency) {
      return (
        <span className="header-status-pill status-emergency">
          <span className="dot dot-emergency"></span>
          SOS Emergency
        </span>
      );
    }

    if (isResolved) {
      return (
        <span className="header-status-pill status-resolved">
          <span className="dot dot-resolved"></span>
          Resolved
        </span>
      );
    }

    switch (status) {
      case 'connected':
        return (
          <span className="header-status-pill status-connected">
            <span className="dot dot-connected"></span>
            Live
          </span>
        );
      case 'connecting':
        return (
          <span className="header-status-pill status-connecting">
            <RefreshCw size={11} className="animate-spin" />
            Connecting
          </span>
        );
      case 'reconnecting':
        return (
          <span className="header-status-pill status-reconnecting">
            <RefreshCw size={11} className="animate-spin" />
            Reconnecting
          </span>
        );
      case 'disconnected':
        return (
          <span className="header-status-pill status-offline">
            <span className="dot dot-offline"></span>
            Offline
          </span>
        );
      case 'error':
      case 'invalid-token':
        return (
          <span className="header-status-pill status-error">
            <AlertTriangle size={11} />
            Error
          </span>
        );
      case 'ended':
        return (
          <span className="header-status-pill status-ended">
            <CheckCircle2 size={11} />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="tracker-top-header" role="banner">
      <div className="header-brand-group">
        <Link href="/" className="header-brand-link" title="SafeSafar Home">
          <div className="header-logo-icon">
            <Shield size={18} strokeWidth={2.2} />
          </div>
          <div className="header-brand-titles">
            <span className="brand-title">SafeSafar</span>
            <span className="brand-subtitle">Live Tracker</span>
          </div>
        </Link>
      </div>

      <nav className="header-nav-group" aria-label="Site Navigation">
        <Link href="/heatmap" className="header-nav-item" title="Community Safety Heatmap">
          <MapPin size={12} />
          <span>Heatmap</span>
        </Link>
        <Link href="/admin" className="header-nav-item" title="Admin Overview Demo">
          <LayoutDashboard size={12} />
          <span>Admin</span>
        </Link>
      </nav>

      <div className="header-meta-group">
        {isMock && (
          <span className="header-demo-tag" title="Simulated GPS Telemetry Active">
            Demo Data
          </span>
        )}

        {getStatusBadge()}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="header-refresh-btn"
            title="Refresh connection"
            aria-label="Refresh connection"
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>
    </header>
  );
}
