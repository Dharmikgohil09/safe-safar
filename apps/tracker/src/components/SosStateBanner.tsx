'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, PhoneCall } from 'lucide-react';
import { SosState } from '../types/tracker';

interface SosStateBannerProps {
  sosState: SosState;
  userName?: string;
}

export default function SosStateBanner({ sosState, userName }: SosStateBannerProps) {
  const displayName = userName || 'Tracked user';

  if (sosState === 'active') {
    return (
      <div className="sos-alert-banner state-active" role="alert" aria-live="assertive">
        <div className="alert-content-group">
          <div className="alert-icon-wrap">
            <AlertTriangle size={18} />
          </div>
          <div className="alert-text-wrap">
            <div className="alert-heading">
              <span className="alert-tag">Emergency SOS Active</span>
              <span className="alert-timestamp">Assistance may be needed</span>
            </div>
            <p className="alert-message">
              {displayName} has triggered an emergency alert. Please verify their safety or contact authorities.
            </p>
          </div>
        </div>

        <div className="alert-action-wrap">
          <a href="tel:112" className="alert-call-btn" title="Call Emergency Services (112)">
            <PhoneCall size={13} />
            <span>Call 112</span>
          </a>
        </div>
      </div>
    );
  }

  if (sosState === 'resolved') {
    return (
      <div className="sos-alert-banner state-resolved" role="status">
        <div className="alert-content-group">
          <div className="alert-icon-wrap">
            <CheckCircle2 size={18} />
          </div>
          <div className="alert-text-wrap">
            <div className="alert-heading">
              <span className="alert-tag">SOS Resolved</span>
            </div>
            <p className="alert-message">
              The emergency alert for {displayName} was marked resolved. Regular tracking continues.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default: Normal Trip (State A)
  return (
    <div className="sos-alert-banner state-normal" role="status">
      <div className="alert-content-group">
        <div className="alert-icon-wrap">
          <ShieldCheck size={18} />
        </div>
        <div className="alert-text-wrap">
          <div className="alert-heading">
            <span className="alert-tag">Normal Trip</span>
            <span className="alert-subtext">No SOS active</span>
          </div>
          <p className="alert-message">
            Live safety monitoring is active for {displayName}.
          </p>
        </div>
      </div>
    </div>
  );
}
