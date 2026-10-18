'use client';

import React from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
}

export default function LoadingState({
  message = 'Connecting to SafeSafar Secure Tracking Network...',
  submessage = 'Validating tracking token and acquiring GPS telemetry stream',
}: LoadingStateProps) {
  return (
    <div className="state-screen-container">
      <div className="state-card">
        <div className="state-icon-pulse">
          <Shield size={38} className="state-shield" />
          <div className="pulse-aura"></div>
        </div>

        <h2 className="state-title">{message}</h2>
        <p className="state-description">{submessage}</p>

        <div className="loading-indicator-row">
          <Loader2 className="animate-spin text-teal" size={20} />
          <span>Establishing encrypted WebSocket connection</span>
        </div>
      </div>
    </div>
  );
}
