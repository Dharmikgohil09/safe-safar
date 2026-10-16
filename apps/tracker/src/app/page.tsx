'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Radio, ArrowRight, MapPin, Smartphone, Sparkles, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      router.push(`/track/${encodeURIComponent(tokenInput.trim())}`);
    }
  };

  return (
    <div className="home-container">
      <div className="home-hero-card">
        <div className="home-logo-badge">
          <Shield size={32} className="shield-brand-icon" />
          <Radio size={18} className="pulse-brand-radio" />
        </div>

        <h1 className="home-title">SafeSafar Guardian Tracker</h1>
        <p className="home-subtitle">
          Real-time personal safety tracking for trusted contacts. Accessible directly from SMS or Telegram emergency links without login.
        </p>

        {/* Quick Launch Button */}
        <div className="home-primary-cta">
          <button
            onClick={() => router.push('/track/safesafar-live-session-2026')}
            className="btn-launch-demo"
          >
            <Sparkles size={18} />
            <span>Launch Live Tracking Demo</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Custom Token Form */}
        <form onSubmit={handleSubmit} className="token-input-form">
          <label htmlFor="token-input" className="input-label">
            Or enter a SafeSafar Tracking Token:
          </label>
          <div className="input-group">
            <input
              id="token-input"
              type="text"
              placeholder="e.g. safe-session-xyz"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="token-input"
            />
            <button type="submit" className="btn-token-submit" disabled={!tokenInput.trim()}>
              Track
            </button>
          </div>
        </form>

        {/* Test Scenarios for IEEE Evaluation */}
        <div className="demo-scenarios-section">
          <span className="scenarios-title">IEEE QA & Demo Quick Links:</span>
          <div className="scenario-chips">
            <button
              onClick={() => router.push('/track/safesafar-live-session-2026')}
              className="chip-btn chip-live"
            >
              🟢 Active Journey (Simulated Live)
            </button>
            <button
              onClick={() => router.push('/track/invalid-token')}
              className="chip-btn chip-error"
            >
              🔴 Invalid Token Error State
            </button>
            <button
              onClick={() => router.push('/track/expired-token')}
              className="chip-btn chip-ended"
            >
              ⚪ Journey Completed State
            </button>
          </div>
        </div>

        <div className="home-features-grid">
          <div className="feature-item">
            <MapPin size={18} className="text-teal" />
            <span>Smooth OpenStreetMap Telemetry</span>
          </div>
          <div className="feature-item">
            <Smartphone size={18} className="text-teal" />
            <span>100% Mobile & SMS Friendly</span>
          </div>
          <div className="feature-item">
            <Radio size={18} className="text-teal" />
            <span>Socket.IO Ready with Mock Fallback</span>
          </div>
        </div>
      </div>
    </div>
  );
}
