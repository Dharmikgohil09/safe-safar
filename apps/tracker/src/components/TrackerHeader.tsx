'use client';

import React from 'react';
import { Shield, Radio, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { ConnectionStatus } from '../types/tracker';

interface TrackerHeaderProps {
  status: ConnectionStatus;
  isMock: boolean;
  isSos?: boolean;
  onRefresh?: () => void;
}

export default function TrackerHeader({
  status,
  isMock,
  isSos = false,
  onRefresh,
}: TrackerHeaderProps) {
  const getStatusBadge = () => {
    if (isSos) {
      return (
        <span className="status-pill status-sos">
          <span className="pill-dot blink-fast"></span>
          SOS EMERGENCY
        </span>
      );
    }

    switch (status) {
      case 'connected':
        return (
          <span className="status-pill status-live">
            <span className="pill-dot pulse"></span>
            LIVE TRACKING
          </span>
        );
      case 'connecting':
        return (
          <span className="status-pill status-connecting">
            <RefreshCw size={12} className="animate-spin" />
            CONNECTING...
          </span>
        );
      case 'reconnecting':
        return (
          <span className="status-pill status-warning">
            <RefreshCw size={12} className="animate-spin" />
            RECONNECTING...
          </span>
        );
      case 'disconnected':
        return (
          <span className="status-pill status-offline">
            <span className="pill-dot"></span>
            DISCONNECTED
          </span>
        );
      case 'error':
      case 'invalid-token':
        return (
          <span className="status-pill status-error">
            <AlertTriangle size={12} />
            ERROR
          </span>
        );
      case 'ended':
        return (
          <span className="status-pill status-ended">
            <CheckCircle2 size={12} />
            JOURNEY ENDED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="tracker-header">
      <div className="header-left">
        <div className="brand-logo">
          <div className="logo-shield">
            <Shield size={22} className="shield-icon" />
            <Radio size={12} className="radio-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-name">SafeSafar</span>
            <span className="brand-tag">Guardian Live</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        {isMock && (
          <div className="mock-badge-header" title="This view is using simulated telemetry (Day 1-2 Demo Mode)">
            <span className="mock-dot"></span>
            <span className="mock-text">DEMO / MOCK DATA</span>
          </div>
        )}

        <div className="status-badge-container">{getStatusBadge()}</div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="icon-refresh-btn"
            title="Refresh connection"
            aria-label="Refresh connection"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
