'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import SafetyMap from '../../../components/Map/SafetyMap';
import TrackerHeader from '../../../components/TrackerHeader';
import TrackerStatusCard from '../../../components/TrackerStatusCard';
import LoadingState from '../../../components/LoadingState';
import ErrorState from '../../../components/ErrorState';
import MockModeBadge from '../../../components/MockModeBadge';
import {
  Coordinates,
  TrackingSession,
  ConnectionStatus,
  LocationPayload,
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
  const [isSos, setIsSos] = useState<boolean>(false);

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
      // Avoid duplicate points
      if (Math.abs(last[0] - newPt[0]) < 0.00001 && Math.abs(last[1] - newPt[1]) < 0.00001) {
        return prev;
      }
      return [...prev, newPt];
    });

    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        lastUpdated: valid.timestamp,
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
        if (mockSess.currentLocation) {
          handleLocationUpdate({
            latitude: mockSess.currentLocation.latitude,
            longitude: mockSess.currentLocation.longitude,
            accuracy: mockSess.currentLocation.accuracy,
            speed: mockSess.currentLocation.speed,
            heading: mockSess.currentLocation.heading,
            timestamp: mockSess.lastUpdated || Date.now(),
            batteryLevel: mockSess.batteryLevel || undefined,
          });
        }

        const emitter = createMockEmitter();
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
        if (sess.status === 'sos') setIsSos(true);
      },
      onLocationUpdate: (loc) => {
        handleLocationUpdate(loc);
      },
      onStatusChange: (status, message) => {
        setConnectionStatus(status);
        if (message) setErrorMessage(message);
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

  const handleToggleSos = () => {
    setIsSos((prev) => !prev);
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
        isSos={isSos}
        onRefresh={handleManualRefresh}
      />

      {/* Main Map View Area */}
      <div className="map-viewport-section">
        {connectionStatus === 'connecting' && !currentLocation ? (
          <LoadingState message="Connecting to SafeSafar Live Telemetry..." />
        ) : (
          <SafetyMap
            currentLocation={currentLocation}
            destination={session?.destination}
            breadcrumbs={breadcrumbs}
            isSosActive={isSos}
            isStale={isStale}
            tileUrl={config.mapTileUrl}
            attribution={config.mapAttribution}
          />
        )}
      </div>

      {/* Demo Floating Badge with live simulator controls */}
      <MockModeBadge
        isMockActive={config.isMockMode}
        isPaused={isPaused}
        isSos={isSos}
        onTogglePause={handleTogglePause}
        onToggleSos={handleToggleSos}
      />

      {/* Bottom Floating Telemetry & Safety Actions Panel */}
      <TrackerStatusCard
        session={session}
        currentLocation={currentLocation}
        isStale={isStale}
        isSos={isSos}
      />
    </main>
  );
}
