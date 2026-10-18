'use client';

import React, { useState } from 'react';
import { Play, Pause, AlertOctagon, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SosState } from '../types/tracker';

interface MockModeBadgeProps {
  isMockActive: boolean;
  isPaused: boolean;
  sosState?: SosState;
  isSos?: boolean;
  onTogglePause: () => void;
  onSetSosState?: (state: SosState) => void;
  onToggleSos?: () => void;
}

export default function MockModeBadge({
  isMockActive,
  isPaused,
  sosState = 'normal',
  isSos = false,
  onTogglePause,
  onSetSosState,
  onToggleSos,
}: MockModeBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (!isMockActive) return null;

  const currentSosState: SosState = sosState || (isSos ? 'active' : 'normal');

  const handleStateSelect = (state: SosState) => {
    if (onSetSosState) {
      onSetSosState(state);
    } else if (onToggleSos) {
      onToggleSos();
    }
  };

  return (
    <aside className="mock-floating-panel" aria-label="Mock Telemetry Controls">
      <div className="mock-pill-button" onClick={() => setExpanded(!expanded)}>
        <span className="mock-live-indicator"></span>
        <span className="mock-title">MOCK TELEMETRY ACTIVE</span>
        <span className="mock-chevron">{expanded ? '✕' : 'Demo Controls ⚙️'}</span>
      </div>

      {expanded && (
        <div className="mock-details-box">
          <div className="mock-header">
            <Sparkles size={16} className="text-teal" />
            <strong>IEEE Day 3–4 Demo Simulator</strong>
          </div>
          <p className="mock-desc">
            Simulating live telemetry with switchable SOS states (Normal, SOS Active, and Resolved).
          </p>

          {/* SOS 3-State Simulator Controls */}
          <div className="mock-sos-selector">
            <span className="mock-selector-title">Test SOS Banner State:</span>
            <div className="mock-sos-btn-group">
              <button
                type="button"
                onClick={() => handleStateSelect('normal')}
                className={`mock-sos-btn ${currentSosState === 'normal' ? 'btn-active-normal' : ''}`}
                title="Normal Trip (No SOS)"
              >
                <ShieldCheck size={13} />
                <span>Normal</span>
              </button>

              <button
                type="button"
                onClick={() => handleStateSelect('active')}
                className={`mock-sos-btn ${currentSosState === 'active' ? 'btn-active-sos' : ''}`}
                title="Trigger Emergency SOS"
              >
                <AlertOctagon size={13} />
                <span>SOS Active</span>
              </button>

              <button
                type="button"
                onClick={() => handleStateSelect('resolved')}
                className={`mock-sos-btn ${currentSosState === 'resolved' ? 'btn-active-resolved' : ''}`}
                title="Resolve SOS (All Clear)"
              >
                <CheckCircle2 size={13} />
                <span>Resolved</span>
              </button>
            </div>
          </div>

          <div className="mock-stream-control">
            <button
              onClick={onTogglePause}
              className={`mock-ctrl-action ${isPaused ? 'paused' : ''}`}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              <span>{isPaused ? 'Resume Telemetry' : 'Pause Telemetry'}</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
