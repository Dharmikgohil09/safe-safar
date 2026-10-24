import { io, Socket } from 'socket.io-client';
import * as Location from 'expo-location';

export interface ActiveTripSession {
  tripId: string;
  trackingToken: string;
  authToken: string; // Authenticated user JWT
}

export interface PublishStatus {
  isPublishing: boolean;
  tripId: string | null;
  trackingToken: string | null;
  lastPublishedAt: number | null;
  lastAckedAt: number | null;
  lastCoords: { latitude: number; longitude: number } | null;
}

class TripLocationPublisher {
  private socket: Socket | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private currentSession: ActiveTripSession | null = null;
  private lastPublishedAt: number | null = null;
  private lastAckedAt: number | null = null;
  private lastCoords: { latitude: number; longitude: number } | null = null;

  /**
   * Start publishing live GPS location updates to backend for an active trip
   */
  public async startPublishing(
    session: ActiveTripSession,
    onLocation?: (coords: { latitude: number; longitude: number }) => void
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Verify user permission
    const { status } = await Location.getForegroundPermissionsAsync();
    let granted = status === 'granted';

    if (!granted) {
      const requestRes = await Location.requestForegroundPermissionsAsync();
      granted = requestRes.status === 'granted';
    }

    if (!granted) {
      return {
        success: false,
        error: 'Location permission was denied. Cannot broadcast live GPS journey.',
      };
    }

    // Stop any existing publisher
    await this.stopPublishing();

    this.currentSession = session;

    const socketUrl =
      process.env.EXPO_PUBLIC_SOCKET_URL ||
      process.env.EXPO_PUBLIC_API_URL ||
      'http://localhost:5000';

    // 2. Connect authenticated mobile client to backend Socket.IO
    this.socket = io(socketUrl, {
      auth: {
        token: session.authToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[SafeSafar Publisher] Mobile connected to backend socket');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SafeSafar Publisher] Socket connection error:', err.message);
    });

    this.socket.on('trip:location_ack', (ack) => {
      this.lastAckedAt = Date.now();
      console.log('[SafeSafar Publisher] Backend confirmed location receipt:', ack);
    });

    this.socket.on('trip:error', (err) => {
      console.warn('[SafeSafar Publisher] Backend trip error:', err.message);
    });

    // 3. Start watching location with expo-location
    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          this.emitUpdate(loc);
          if (onLocation) {
            onLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      );

      // Send initial fix immediately
      const initialPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (initialPos) {
        this.emitUpdate(initialPos);
        if (onLocation) {
          onLocation({
            latitude: initialPos.coords.latitude,
            longitude: initialPos.coords.longitude,
          });
        }
      }

      return { success: true };
    } catch (err: any) {
      await this.stopPublishing();
      return {
        success: false,
        error: err.message || 'Failed to start GPS telemetry stream.',
      };
    }
  }

  /**
   * Internal helper to format, validate, and emit trip:location_update
   */
  private emitUpdate(loc: Location.LocationObject): void {
    if (!this.socket || !this.currentSession) return;

    const lat = loc.coords.latitude;
    const lng = loc.coords.longitude;

    // Validate coordinates to prevent emitting corrupted or NaN GPS data
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      console.warn('[SafeSafar Publisher] Discarded invalid GPS coordinates:', loc.coords);
      return;
    }

    const payload = {
      tripId: this.currentSession.tripId,
      latitude: lat,
      longitude: lng,
      speed: Math.max(0, loc.coords.speed ?? 0),
      heading: Math.max(0, loc.coords.heading ?? 0),
      accuracy: Math.max(0, loc.coords.accuracy ?? 0),
    };

    this.socket.emit('trip:location_update', payload);
    this.lastPublishedAt = Date.now();
    this.lastCoords = {
      latitude: lat,
      longitude: lng,
    };
  }

  /**
   * Stop watching GPS and disconnect socket
   */
  public async stopPublishing(): Promise<void> {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    if (this.socket) {
      if (this.currentSession) {
        this.socket.emit('trip:leave', { tripId: this.currentSession.tripId });
      }
      (this.socket as any).removeAllListeners?.();
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentSession = null;
    this.lastPublishedAt = null;
    this.lastAckedAt = null;
    this.lastCoords = null;
  }

  /**
   * Send single location update manually (useful for testing or one-time fixes)
   */
  public sendManualUpdate(coords: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
  }): void {
    if (!this.socket || !this.currentSession) return;

    if (
      typeof coords.latitude !== 'number' ||
      typeof coords.longitude !== 'number' ||
      isNaN(coords.latitude) ||
      isNaN(coords.longitude) ||
      coords.latitude < -90 ||
      coords.latitude > 90 ||
      coords.longitude < -180 ||
      coords.longitude > 180
    ) {
      return;
    }

    this.socket.emit('trip:location_update', {
      tripId: this.currentSession.tripId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      speed: Math.max(0, coords.speed ?? 0),
      heading: Math.max(0, coords.heading ?? 0),
      accuracy: Math.max(0, coords.accuracy ?? 0),
    });
    this.lastPublishedAt = Date.now();
    this.lastCoords = {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }

  public getStatus(): PublishStatus {
    return {
      isPublishing: Boolean(this.currentSession && this.socket?.connected),
      tripId: this.currentSession?.tripId ?? null,
      trackingToken: this.currentSession?.trackingToken ?? null,
      lastPublishedAt: this.lastPublishedAt,
      lastAckedAt: this.lastAckedAt,
      lastCoords: this.lastCoords,
    };
  }
}

export const tripLocationPublisher = new TripLocationPublisher();
