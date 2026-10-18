'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, PhoneCall } from 'lucide-react';
import { SosState } from '../types/tracker';

interface SosStateBannerProps {
  sosState: SosState;
  userName?: string;
}

export default function SosStateBanner({ sosState, userName }: SosStateBannerProps) {
  const displayName = userName || 'Tracked user';

  if (sosState === 'active') {
    return (
      <section className="sos-state-banner banner-state-active" aria-label="Emergency SOS Active">
        <div className="banner-icon-box">
          <ShieldAlert size={22} className="icon-pulse-alert" />
        </div>
        <div className="banner-content">
          <div className="banner-headline">
            <span className="banner-badge badge-active">SOS ACTIVE</span>
            <h2 className="banner-title">EMERGENCY TRIGGERED — ASSISTANCE MAY BE NEEDED</h2>
          </div>
          <p className="banner-description">
            {displayName} triggered an emergency SOS. Please verify their safety or contact emergency services immediately.
          </p>
        </div>
        <div className="banner-actions">
          <a href="tel:112" className="banner-emergency-call" title="Call Emergency Services (112)">
            <PhoneCall size={15} />
            <span>Call 112</span>
          </a>
        </div>
      </section>
    );
  }

  if (sosState === 'resolved') {
    return (
      <section className="sos-state-banner banner-state-resolved" aria-label="SOS Alert Resolved">
        <div className="banner-icon-box">
          <CheckCircle2 size={20} className="icon-resolved" />
        </div>
        <div className="banner-content">
          <div className="banner-headline">
            <span className="banner-badge badge-resolved">ALL CLEAR</span>
            <h2 className="banner-title">SOS RESOLVED — NORMAL MONITORING RESUMED</h2>
          </div>
          <p className="banner-description">
            The emergency alert for {displayName} has been marked as resolved. Live location updates continue.
          </p>
        </div>
      </section>
    );
  }

  // Default: State A (Normal Trip)
  return (
    <section className="sos-state-banner banner-state-normal" aria-label="Normal Trip In Progress">
      <div className="banner-icon-box">
        <ShieldCheck size={20} className="icon-normal" />
      </div>
      <div className="banner-content">
        <div className="banner-headline">
          <span className="banner-badge badge-normal">TRIP IN PROGRESS</span>
          <h2 className="banner-title">NORMAL TRIP — NO SOS ACTIVE</h2>
        </div>
        <p className="banner-description">
          Trip is actively monitored. SOS is currently inactive and {displayName} is navigating their planned route.
        </p>
      </div>
    </section>
  );
}
