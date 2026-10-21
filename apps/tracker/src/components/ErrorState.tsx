'use client';

import React from 'react';
import { AlertTriangle, WifiOff, ShieldOff, CheckCircle2, RotateCcw, PhoneCall } from 'lucide-react';
import { ConnectionStatus } from '../types/tracker';

interface ErrorStateProps {
  type: 'invalid-token' | 'network-error' | 'location-unavailable' | 'ended' | 'generic';
  errorMessage?: string;
  onRetry?: () => void;
  token?: string;
}

export default function ErrorState({
  type,
  errorMessage,
  onRetry,
  token,
}: ErrorStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'invalid-token':
        return <ShieldOff size={44} className="error-icon text-red" />;
      case 'network-error':
        return <WifiOff size={44} className="error-icon text-amber" />;
      case 'ended':
        return <CheckCircle2 size={44} className="error-icon text-green" />;
      default:
        return <AlertTriangle size={44} className="error-icon text-amber" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'invalid-token':
        return 'Invalid or Expired Tracking Link';
      case 'network-error':
        return 'Network Connection Interrupted';
      case 'location-unavailable':
        return 'Location Telemetry Unavailable';
      case 'ended':
        return 'Journey Completed';
      default:
        return 'Tracking Unavailable';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'invalid-token':
        return 'This tracking session link could not be verified or has expired. If an emergency is suspected, contact the person directly or call authorities immediately.';
      case 'network-error':
        return errorMessage || 'Unable to connect to the SafeSafar live telemetry stream. Please check your data connection or wifi.';
      case 'location-unavailable':
        return 'The user has enabled tracking, but GPS coordinates have not yet been transmitted by their device. Retrying...';
      case 'ended':
        return 'Your trip has reached its destination. Real-time tracking has concluded.';
      default:
        return errorMessage || 'An unexpected error occurred while loading this tracking session.';
    }
  };

  return (
    <div className="state-screen-container">
      <div className="state-card error-card">
        <div className="state-icon-wrapper">{getIcon()}</div>

        <h2 className="state-title">{getTitle()}</h2>
        <p className="state-description">{getDescription()}</p>

        {token && (
          <div className="token-ref-pill">
            <span>Session ID:</span> <code>{token.slice(0, 8)}...{token.slice(-4)}</code>
          </div>
        )}

        <div className="state-actions-row">
          {onRetry && type !== 'ended' && type !== 'invalid-token' && (
            <button onClick={onRetry} className="btn-primary-action">
              <RotateCcw size={16} />
              <span>Retry Connection</span>
            </button>
          )}

          <a href="tel:112" className="btn-emergency-action">
            <PhoneCall size={16} />
            <span>Call Emergency (112)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
