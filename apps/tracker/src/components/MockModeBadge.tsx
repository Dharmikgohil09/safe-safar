'use client';

import React, { useState } from 'react';
import { Info, Play, Pause, AlertOctagon, Sparkles } from 'lucide-react';

interface MockModeBadgeProps {
  isMockActive: boolean;
  isPaused: boolean;
  isSos: boolean;
  onTogglePause: () => void;
  onToggleSos: () => void;
}

export default function MockModeBadge({
  isMockActive,
  isPaused,
  isSos,
  onTogglePause,
  onToggleSos,
}: MockModeBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (!isMockActive) return null;

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
            <strong>IEEE Day 1-2 Demo Simulator</strong>
          </div>
          <p className="mock-desc">
            Simulating live GPS telemetry (28-35 km/h along Connaught Place to Lodhi Colony corridor).
            Distinguished from real production GPS data.
          </p>

          <div className="mock-controls-grid">
            <button
              onClick={onTogglePause}
              className={`mock-ctrl-action ${isPaused ? 'paused' : ''}`}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
            </button>

            <button
              onClick={onToggleSos}
              className={`mock-ctrl-action ${isSos ? 'active-sos' : ''}`}
            >
              <AlertOctagon size={14} />
              <span>{isSos ? 'Clear SOS' : 'Simulate SOS'}</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
