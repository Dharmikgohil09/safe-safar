import { io, Socket } from 'socket.io-client';
import { LocationPayload, TrackingSession, ConnectionStatus, SosState } from '../types/tracker';
import { validateAndParseLocation } from './validation';

/**
 * SafeSafar Socket.IO Contract Specification (Days 1–4 Adapter)
 * =============================================================
 * Client-to-Server Events:
 *   - "join-session": { token: string }
 *     Emitted upon connection to join the tracking room for the given token.
 *   - "leave-session": { token: string }
 *     Emitted when unmounting or changing tracking token.
 *
 * Server-to-Client Events:
 *   - "session:data": TrackingSession
 *     Sends session metadata including user name, destination, and initial state.
 *   - "location" (or "location:update"): LocationPayload
 *     Real-time GPS coordinate telemetry emitted periodically by the mobile app.
 *   - "sos:active" (or "sos:triggered"):
 *     Emergency SOS triggered by user on mobile app.
 *   - "sos:resolved":
 *     Emergency SOS resolved / all-clear sent by user on mobile app.
 *   - "session:ended": { status: 'completed' | 'expired' }
 *     Notifies that the journey completed or expired.
 *   - "session:error": { message: string, code: string }
 *     Notifies token validation failure or unauthorized session access.
 */

export interface TrackerConnectionCallbacks {
  onSessionInit: (session: TrackingSession) => void;
  onLocationUpdate: (location: LocationPayload) => void;
  onStatusChange: (status: ConnectionStatus, message?: string) => void;
  onSosStateChange?: (state: SosState) => void;
  onStaleStateChange?: (isStale: boolean) => void;
}

export interface TrackerConnectionHandle {
  disconnect: () => void;
  reconnect: () => void;
}

const STALE_TIMEOUT_MS = 90000; // 90 seconds without GPS update triggers stale indicator

export function createTrackerSocketConnection(
  token: string,
  serverUrl: string,
  callbacks: TrackerConnectionCallbacks
): TrackerConnectionHandle {
  let socket: Socket | null = null;
  let staleTimer: NodeJS.Timeout | null = null;
  let lastReceivedTime = Date.now();

  const resetStaleTimer = () => {
    lastReceivedTime = Date.now();
    callbacks.onStaleStateChange?.(false);

    if (staleTimer) clearTimeout(staleTimer);
    staleTimer = setTimeout(() => {
      callbacks.onStaleStateChange?.(true);
    }, STALE_TIMEOUT_MS);
  };

  const connect = () => {
    if (socket) {
      socket.disconnect();
    }

    callbacks.onStatusChange('connecting');

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: {
        token, // Pass token in connection auth handshake
      },
    });

    socket.on('connect', () => {
      callbacks.onStatusChange('connected');
      // Subscribe to room
      socket?.emit('join-session', { token });
      resetStaleTimer();
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        socket?.connect();
      }
      callbacks.onStatusChange('disconnected', `Connection lost: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.warn('[SafeSafar Socket] Connection error:', error.message);
      callbacks.onStatusChange('reconnecting', 'Attempting to reconnect to live safety stream...');
    });

    socket.on('reconnect_failed', () => {
      callbacks.onStatusChange('error', 'Unable to reach tracking server. Please check internet connection.');
    });

    // Listen for initial session info
    socket.on('session:data', (data: unknown) => {
      if (data && typeof data === 'object') {
        const session = data as TrackingSession;
        callbacks.onSessionInit(session);

        // Determine SOS state from initial session data
        if (session.sosState) {
          callbacks.onSosStateChange?.(session.sosState);
        } else if (session.status === 'sos') {
          callbacks.onSosStateChange?.('active');
        } else if (session.status === 'resolved') {
          callbacks.onSosStateChange?.('resolved');
        } else {
          callbacks.onSosStateChange?.('normal');
        }

        if (session.currentLocation) {
          const valid = validateAndParseLocation(session.currentLocation);
          if (valid) {
            callbacks.onLocationUpdate(valid);
            resetStaleTimer();
          }
        }
      }
    });

    // Listen for real-time location event
    socket.on('location', (payload: unknown) => {
      const valid = validateAndParseLocation(payload);
      if (valid) {
        resetStaleTimer();
        callbacks.onLocationUpdate(valid);
      } else {
        console.warn('[SafeSafar Socket] Discarded invalid location payload:', payload);
      }
    });

    // Support 'location:update' alias for backend compatibility
    socket.on('location:update', (payload: unknown) => {
      const valid = validateAndParseLocation(payload);
      if (valid) {
        resetStaleTimer();
        callbacks.onLocationUpdate(valid);
      }
    });

    // Real-time SOS triggers from Kristal's emergency backend
    socket.on('sos:active', () => {
      callbacks.onSosStateChange?.('active');
    });

    socket.on('sos:triggered', () => {
      callbacks.onSosStateChange?.('active');
    });

    socket.on('sos:resolved', () => {
      callbacks.onSosStateChange?.('resolved');
    });

    // Listen for session end or error
    socket.on('session:ended', (info?: { status?: string }) => {
      callbacks.onStatusChange('ended', info?.status ? `Session ${info.status}` : 'Tracking session has ended.');
    });

    socket.on('session:error', (err?: { message?: string }) => {
      callbacks.onStatusChange('invalid-token', err?.message || 'Invalid or expired tracking link.');
    });
  };

  connect();

  return {
    disconnect: () => {
      if (staleTimer) {
        clearTimeout(staleTimer);
        staleTimer = null;
      }
      if (socket) {
        try {
          socket.emit('leave-session', { token });
          socket.removeAllListeners();
          socket.disconnect();
        } catch {
          // Ignore cleanup errors
        }
        socket = null;
      }
    },
    reconnect: () => {
      connect();
    },
  };
}
