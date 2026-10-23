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
import { getNumericTimestamp } from '../../../utils/geo';

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
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const mockEmitterRef = useRef<MockLocationEmitter | null>(null);
  const socketHandleRef = useRef<TrackerConnectionHandle | null>(null);

  // Out-of-order tracking watermark and location timestamp buffer
  const latestProcessedTimestampRef = useRef<number | null>(null);
  const latestLocationTimestampRef = useRef<string | number | null>(null);

  // Location update processor with out-of-order protection
  const handleLocationUpdate = useCallback((payload: LocationPayload) => {
    const valid = validateAndParseLocation(payload);
    if (!valid) return;

    // Out-of-order packet protection:
    // If incoming payload has a parseable timestamp and we have already processed
    // a newer timestamp, discard this older location to prevent position regression
    // and spurious breadcrumb trail segments.
    const incomingNumericTime = getNumericTimestamp(valid.timestamp);
    const lastTime = latestProcessedTimestampRef.current;

    if (incomingNumericTime !== null && lastTime !== null && incomingNumericTime < lastTime) {
      console.warn('[SafeSafar] Discarded out-of-order location update:', {
        incoming: valid.timestamp,
        incomingNumeric: incomingNumericTime,
        lastProcessed: lastTime,
      });
      return;
    }

    if (incomingNumericTime !== null) {
      latestProcessedTimestampRef.current = incomingNumericTime;
    }

    if (valid.timestamp !== null && valid.timestamp !== undefined) {
      latestLocationTimestampRef.current = valid.timestamp;
    }

    setCurrentLocation({
      latitude: valid.latitude,
      longitude: valid.longitude,
      accuracy: valid.accuracy,
      speed: valid.speed,
      heading: valid.heading,
      timestamp: valid.timestamp,
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

        // Reset watermark refs for the mock session
        latestProcessedTimestampRef.current = getNumericTimestamp(mockSess.lastUpdated);
        latestLocationTimestampRef.current = mockSess.lastUpdated ?? null;

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
        emitter.start(
          (locationPayload) => {
            handleLocationUpdate(locationPayload);
          },
          (status) => {
            if (status === 'completed') {
              setSession((prev) => (prev ? { ...prev, status: 'completed' } : null));
              setIsCompleted(true);
            }
          }
        );

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
        setIsCompleted(false);
        latestProcessedTimestampRef.current = null;
        latestLocationTimestampRef.current = null;
      };
    }

    // MODE B: Real Socket.IO & REST Backend Integration
    let isCancelled = false;

    // Fetch initial trip metadata from backend REST endpoint
    const fetchSessionData = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/trips/track/${encodeURIComponent(token)}`);
        if (isCancelled) return;

        if (response.status === 404) {
          setConnectionStatus('invalid-token');
          setErrorMessage('This tracking link could not be found or has expired.');
          return;
        }

        if (!response.ok) {
          setConnectionStatus('error');
          setErrorMessage('Unable to load tracking session details from server.');
          return;
        }

        const json = await response.json();
        const trip = json.data;

        if (!trip) {
          setConnectionStatus('invalid-token');
          setErrorMessage('Empty session data received from server.');
          return;
        }

        const sessionData: TrackingSession = {
          token: trip.trackingToken || token,
          userName: trip.userName || 'SafeSafar User',
          status: trip.status === 'arrived' ? 'completed' : trip.status,
          destination:
            trip.destination?.coordinates && trip.destination.coordinates.length === 2
              ? {
                  name: trip.destination.address || 'Destination',
                  address: trip.destination.address,
                  latitude: trip.destination.coordinates[1],
                  longitude: trip.destination.coordinates[0],
                }
              : null,
          currentLocation:
            trip.lastKnownLocation?.coordinates && trip.lastKnownLocation.coordinates.length === 2
              ? {
                  latitude: trip.lastKnownLocation.coordinates[1],
                  longitude: trip.lastKnownLocation.coordinates[0],
                  speed: trip.lastKnownLocation.speed ?? null,
                  heading: trip.lastKnownLocation.heading ?? null,
                  accuracy: trip.lastKnownLocation.accuracy,
                  timestamp: trip.lastKnownLocation.timestamp,
                }
              : null,
          lastUpdated: trip.lastKnownLocation?.timestamp || trip.lastCheckinAt || trip.deadlineAt,
          startedAt: trip.createdAt || Date.now(),
          isMock: false,
        };

        setSession(sessionData);

        if (sessionData.currentLocation) {
          handleLocationUpdate(sessionData.currentLocation);
        }

        if (sessionData.status === 'completed' || sessionData.status === 'expired') {
          setIsCompleted(true);
          setConnectionStatus('ended');
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('[SafeSafar] Failed to fetch session metadata via REST:', err.message);
          // If offline/fetch fails, keep status as connecting/error
          setConnectionStatus('error');
          setErrorMessage('Unable to connect to the tracking server. Please check your network connection.');
        }
      }
    };

    fetchSessionData();

    const handle = createTrackerSocketConnection(token, config.socketUrl, {
      onSessionInit: (sess) => {
        // Reconcile timestamps: If an early location update arrived before session:data,
        // preserve the newer location timestamp rather than overwriting with an older session time.
        const earlyLocTs = latestLocationTimestampRef.current;
        const earlyLocNum = getNumericTimestamp(earlyLocTs);
        const sessNum = getNumericTimestamp(sess.lastUpdated);

        let resolvedLastUpdated = sess.lastUpdated;
        if (earlyLocTs !== null && earlyLocTs !== undefined) {
          if (sessNum === null || (earlyLocNum !== null && earlyLocNum >= sessNum)) {
            resolvedLastUpdated = earlyLocTs;
          }
        }

        const reconciledSession = {
          ...sess,
          lastUpdated: resolvedLastUpdated,
        };

        const currentWatermark = getNumericTimestamp(resolvedLastUpdated);
        if (currentWatermark !== null) {
          latestProcessedTimestampRef.current = Math.max(
            latestProcessedTimestampRef.current ?? 0,
            currentWatermark
          );
        }

        setSession(reconciledSession);
        if (reconciledSession.sosState) {
          setSosState(reconciledSession.sosState);
        } else if (reconciledSession.status === 'sos') {
          setSosState('active');
        } else if (reconciledSession.status === 'resolved') {
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
      isCancelled = true;
      handle.disconnect();
      socketHandleRef.current = null;
      latestProcessedTimestampRef.current = null;
      latestLocationTimestampRef.current = null;
    };
  }, [token, handleLocationUpdate]);

  // Mock Control Toggles
  const handleTogglePause = () => {
    if (!config.isMockMode || !mockEmitterRef.current) return;
    if (isCompleted || mockEmitterRef.current.isCompleted?.()) return;
    if (isPaused) {
      if (mockEmitterRef.current.resume) {
        mockEmitterRef.current.resume((payload) => handleLocationUpdate(payload));
      } else {
        mockEmitterRef.current.start((payload) => handleLocationUpdate(payload));
      }
      setIsPaused(false);
    } else {
      if (mockEmitterRef.current.pause) {
        mockEmitterRef.current.pause();
      } else {
        mockEmitterRef.current.stop();
      }
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
      if (mockEmitterRef.current.isCompleted?.()) return;
      if (mockEmitterRef.current.resume) {
        mockEmitterRef.current.resume((p) => handleLocationUpdate(p));
      } else {
        mockEmitterRef.current.stop();
        mockEmitterRef.current.start((p) => handleLocationUpdate(p));
      }
      setIsPaused(false);
    }
  };

  const isMockSession = Boolean(session ? session.isMock : config.isMockMode);

  // State condition screens
  if (connectionStatus === 'invalid-token') {
    return (
      <main className="tracker-page-layout">
        <TrackerHeader status={connectionStatus} isMock={isMockSession} />
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
        <TrackerHeader status={connectionStatus} isMock={isMockSession} />
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
        <TrackerHeader status={connectionStatus} isMock={isMockSession} />
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
        isMock={isMockSession}
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
        isMockActive={isMockSession}
        isPaused={isPaused}
        isCompleted={isCompleted}
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
