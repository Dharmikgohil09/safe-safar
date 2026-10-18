'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, MapPin, Smartphone, PhoneCall } from 'lucide-react';

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
      <main className="home-hero-card">
        <div className="home-logo-badge">
          <Shield size={28} className="shield-brand-icon" />
        </div>

        <h1 className="home-title">SafeSafar Guardian Tracker</h1>
        <p className="home-subtitle">
          Help your loved ones stay informed during your journey. Share your
          tracking link with trusted contacts so they can follow your trip and
          know when you need help.
        </p>

        {/* Primary Demo Launch Button */}
        <div className="home-primary-cta">
          <button
            type="button"
            onClick={() => router.push('/track/safesafar-live-session-2026')}
            className="btn-launch-demo"
          >
            <span>Explore Tracking Demo</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Custom Token Form */}
        <form onSubmit={handleSubmit} className="token-input-form">
          <label htmlFor="token-input" className="input-label">
            Or enter a tracking token:
          </label>
          <div className="input-group">
            <input
              id="token-input"
              type="text"
              placeholder="e.g. safesafar-live-session-2026"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="token-input"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn-token-submit" disabled={!tokenInput.trim()}>
              Track
            </button>
          </div>
        </form>

        {/* Verified Feature Highlights */}
        <div className="home-features-grid">
          <div className="feature-item">
            <MapPin size={16} className="text-teal" />
            <span>Location Updates</span>
          </div>
          <div className="feature-item">
            <Smartphone size={16} className="text-teal" />
            <span>Works on Any Device</span>
          </div>
          <div className="feature-item">
            <PhoneCall size={16} className="text-teal" />
            <span>Emergency Assistance</span>
          </div>
        </div>

        {/* Subtle, Professional Footer */}
        <footer className="home-footer">
          <p>SafeSafar — Helping you travel with greater peace of mind.</p>
        </footer>
      </main>
    </div>
  );
}
