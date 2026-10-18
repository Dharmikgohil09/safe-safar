'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import SafetyMap from '../../../components/Map/SafetyMap';
import TrackerHeader from '../../../components/TrackerHeader';
import TrackerStatusCard from '../../../components/TrackerStatusCard';
import SosStateBanner from '../../../components/SosStateBanner';
import LoadingState from '../../../components/LoadingState';
import ErrorState from '../../../components/ErrorState';
import MockModeBadge from '../../../components/MockModeBadge';
import {
  Coordinates,
  TrackingSession,
  ConnectionStatus,
  LocationPayload,
  SosState,
} from '../../../types/tracker';
import { config } from '../../../config/env';
import { createTrackerSocketConnection, TrackerConnectionHandle } from '../../../services/socketAdapter';
import { createMockEmitter, getMockSession, MockLocationEmitter } from '../../../services/mockDataService';
import { isValidTokenFormat, validateAndParseLocation } from '../../../services/validation';

export default function TrackPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';

  // Core Tracker State
  const [session, setSession] = useState<TrackingSession | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<[number, number][]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  // Day 3–4: 3-State SOS Tracking ('normal' | 'active' | 'resolved')
  const [sosState, setSosState] = useState<SosState>('normal');

  // Mock State Controls
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const mockEmitterRef = useRef<MockLocationEmitter | null>(null);
  const socketHandleRef = useRef<TrackerConnectionHandle | null>(null);

  // Location update processor
  const handleLocationUpdate = useCallback((payload: LocationPayload) => {
    const valid = validateAndParseLocation(payload);
    if (!valid) return;

    setCurrentLocation({
      latitude: valid.latitude,
      longitude: valid.longitude,
      accuracy: valid.accuracy,
      speed: valid.speed,
      heading: valid.heading,
    });

    setBreadcrumbs((prev) => {
      const newPt: [number, number] = [valid.latitude, valid.longitude];
      if (prev.length === 0) return [newPt];
      const last = prev[prev.length - 1];
      // Avoid duplicate coordinates
      if (Math.abs(last[0] - newPt[0]) < 0.00001 && Math.abs(last[1] - newPt[1]) < 0.00001) {
        return prev;
      }
      return [...prev, newPt];
    });

    // Only update timestamp if incoming payload contains a genuine timestamp
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        lastUpdated: valid.timestamp !== null && valid.timestamp !== undefined ? valid.timestamp : prev.lastUpdated,
        batteryLevel: valid.batteryLevel !== undefined ? valid.batteryLevel : prev.batteryLevel,
      };
    });

    setIsStale(false);
  }, []);

  // Main lifecycle: Initialize Socket or Mock depending on config
  useEffect(() => {
    if (!token) return;

    // 1. Validate token format
    if (!isValidTokenFormat(token)) {
      setConnectionStatus('invalid-token');
      setErrorMessage('The tracking link format is invalid or has been corrupted.');
      return;
    }

    setConnectionStatus('connecting');
    setErrorMessage(null);

    // MODE A: Mock Telemetry
    if (config.isMockMode) {
      try {
        const mockSess = getMockSession(token);
        setSession(mockSess);

        // Determine SOS state from mock session
        if (mockSess.sosState) {
          setSosState(mockSess.sosState);
        } else if (mockSess.status === 'sos') {
          setSosState('active');
        } else if (mockSess.status === 'resolved') {
          setSosState('resolved');
        } else {
          setSosState('normal');
        }

        const isNoTimestamp = token === 'no-timestamp';

        if (mockSess.currentLocation) {
          handleLocationUpdate({
            latitude: mockSess.currentLocation.latitude,
            longitude: mockSess.currentLocation.longitude,
            accuracy: mockSess.currentLocation.accuracy,
            speed: mockSess.currentLocation.speed,
            heading: mockSess.currentLocation.heading,
            timestamp: isNoTimestamp ? null : (mockSess.lastUpdated !== undefined ? mockSess.lastUpdated : Date.now()),
            batteryLevel: mockSess.batteryLevel || undefined,
          });
        }

        const emitter = createMockEmitter(3500, { omitTimestamp: isNoTimestamp });
        mockEmitterRef.current = emitter;
        emitter.start((locationPayload) => {
          handleLocationUpdate(locationPayload);
        });

        setConnectionStatus('connected');
      } catch (err: any) {
        if (err?.message === 'SESSION_INVALID') {
          setConnectionStatus('invalid-token');
        } else {
          setConnectionStatus('error');
          setErrorMessage('Unable to initialize mock session data.');
        }
      }

      return () => {
        if (mockEmitterRef.current) {
          mockEmitterRef.current.stop();
          mockEmitterRef.current = null;
        }
      };
    }

    // MODE B: Real Socket.IO Backend Integration
    const handle = createTrackerSocketConnection(token, config.socketUrl, {
      onSessionInit: (sess) => {
        setSession(sess);
        if (sess.sosState) {
          setSosState(sess.sosState);
        } else if (sess.status === 'sos') {
          setSosState('active');
        } else if (sess.status === 'resolved') {
          setSosState('resolved');
        } else {
          setSosState('normal');
        }
      },
      onLocationUpdate: (loc) => {
        handleLocationUpdate(loc);
      },
      onStatusChange: (status, message) => {
        setConnectionStatus(status);
        if (message) setErrorMessage(message);
      },
      onSosStateChange: (state) => {
        setSosState(state);
      },
      onStaleStateChange: (stale) => {
        setIsStale(stale);
      },
    });

    socketHandleRef.current = handle;

    return () => {
      handle.disconnect();
      socketHandleRef.current = null;
    };
  }, [token, handleLocationUpdate]);

  // Mock Control Toggles
  const handleTogglePause = () => {
    if (!config.isMockMode || !mockEmitterRef.current) return;
    if (isPaused) {
      mockEmitterRef.current.start((payload) => handleLocationUpdate(payload));
      setIsPaused(false);
    } else {
      mockEmitterRef.current.stop();
      setIsPaused(true);
    }
  };

  const handleSetSosState = (state: SosState) => {
    setSosState(state);
  };

  const handleManualRefresh = () => {
    if (socketHandleRef.current) {
      socketHandleRef.current.reconnect();
    } else if (config.isMockMode && mockEmitterRef.current) {
      mockEmitterRef.current.stop();
      mockEmitterRef.current.start((p) => handleLocationUpdate(p));
      setIsPaused(false);
    }
  };

  // State condition screens
  if (connectionStatus === 'invalid-token') {
    return (
      <main className="tracker-page-layout">
        <TrackerHeader status={connectionStatus} isMock={config.isMockMode} />
        <ErrorState
          type="invalid-token"
          token={token}
          errorMessage={errorMessage || 'Invalid session credentials'}
        />
      </main>
    );
  }

  if (connectionStatus === 'ended' || session?.status === 'completed' || session?.status === 'expired') {
    return (
      <main className="tracker-page-layout">
        <TrackerHeader status={connectionStatus} isMock={config.isMockMode} />
        <ErrorState
          type="ended"
          token={token}
          errorMessage="The tracked person reached their destination safely."
        />
      </main>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <main className="tracker-page-layout">
        <TrackerHeader status={connectionStatus} isMock={config.isMockMode} />
        <ErrorState
          type="network-error"
          token={token}
          errorMessage={errorMessage || 'Failed to connect to tracking server.'}
          onRetry={handleManualRefresh}
        />
      </main>
    );
  }

  return (
    <main className="tracker-page-layout">
      {/* Top Header */}
      <TrackerHeader
        status={connectionStatus}
        isMock={config.isMockMode}
        isSos={sosState === 'active'}
        sosState={sosState}
        onRefresh={handleManualRefresh}
      />

      {/* Day 3–4: SOS State Banner (Normal / SOS Active / Resolved) */}
      <div className="sos-banner-container">
        <SosStateBanner sosState={sosState} userName={session?.userName} />
      </div>

      {/* Main Map View Area */}
      <div className="map-viewport-section">
        {connectionStatus === 'connecting' && !currentLocation ? (
          <LoadingState message="Connecting to SafeSafar Live Telemetry..." />
        ) : (
          <SafetyMap
            currentLocation={currentLocation}
            destination={session?.destination}
            breadcrumbs={breadcrumbs}
            isSosActive={sosState === 'active'}
            isStale={isStale}
            tileUrl={config.mapTileUrl}
            attribution={config.mapAttribution}
          />
        )}
      </div>

      {/* Demo Floating Badge with 3-state SOS simulator controls */}
      <MockModeBadge
        isMockActive={config.isMockMode}
        isPaused={isPaused}
        sosState={sosState}
        isSos={sosState === 'active'}
        onTogglePause={handleTogglePause}
        onSetSosState={handleSetSosState}
      />

      {/* Bottom Floating Telemetry & Destination Panel */}
      <TrackerStatusCard
        session={session}
        currentLocation={currentLocation}
        isStale={isStale}
        isSos={sosState === 'active'}
        sosState={sosState}
      />
    </main>
  );
}
