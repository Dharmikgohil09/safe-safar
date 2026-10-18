'use client';

import React, { useState } from 'react';
import { Play, Pause, AlertOctagon, CheckCircle2, ShieldCheck, SlidersHorizontal } from 'lucide-react';
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
    <div className="demo-controller-widget" aria-label="Demo Simulator Controls">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="demo-toggle-trigger"
        title="Toggle simulated telemetry controls"
      >
        <SlidersHorizontal size={13} />
        <span>Demo Controls</span>
      </button>

      {expanded && (
        <div className="demo-popover-card">
          <div className="demo-card-header">
            <span className="demo-header-title">Demo Controls</span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="demo-close-btn"
              aria-label="Close demo controls"
            >
              ✕
            </button>
          </div>
          <p className="demo-card-subtitle">
            Simulating live movement. Select an SOS state to test the banner:
          </p>

          <div className="demo-state-selector">
            <button
              type="button"
              onClick={() => handleStateSelect('normal')}
              className={`demo-select-btn ${currentSosState === 'normal' ? 'selected' : ''}`}
            >
              <ShieldCheck size={13} />
              <span>Normal</span>
            </button>

            <button
              type="button"
              onClick={() => handleStateSelect('active')}
              className={`demo-select-btn demo-btn-sos ${currentSosState === 'active' ? 'selected' : ''}`}
            >
              <AlertOctagon size={13} />
              <span>SOS Active</span>
            </button>

            <button
              type="button"
              onClick={() => handleStateSelect('resolved')}
              className={`demo-select-btn demo-btn-resolved ${currentSosState === 'resolved' ? 'selected' : ''}`}
            >
              <CheckCircle2 size={13} />
              <span>Resolved</span>
            </button>
          </div>

          <div className="demo-footer-action">
            <button
              type="button"
              onClick={onTogglePause}
              className={`demo-playback-btn ${isPaused ? 'is-paused' : ''}`}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              <span>{isPaused ? 'Resume Movement' : 'Pause Movement'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
