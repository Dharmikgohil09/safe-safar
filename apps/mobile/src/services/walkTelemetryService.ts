import { Alert, Linking, Platform, Share } from 'react-native';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import SmsAndroid from 'react-native-get-sms-android';
import { MAP_CONFIG } from '../config/mapConfig';
import { getTripContacts } from '../features/trip/storage/contactsStorage';
import { LatLng } from '../types';

export interface WalkSessionInfo {
  token: string;
  destinationName: string;
  routeName: string;
  trackerUrl: string;
  startTime: number;
  contactCount: number;
}

export type WalkTelemetryListener = (active: boolean, info: WalkSessionInfo | null, count: number) => void;

class WalkTelemetryService {
  private activeSession: WalkSessionInfo | null = null;
  private socket: Socket | null = null;
  private locationSub: Location.LocationSubscription | null = null;
  private telemetryCount: number = 0;
  private listeners: Set<WalkTelemetryListener> = new Set();

  /**
   * Register a state listener
   */
  subscribe(listener: WalkTelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.isSessionActive(), this.activeSession, this.telemetryCount);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.isSessionActive(), this.activeSession, this.telemetryCount));
  }

  isSessionActive(): boolean {
    return this.activeSession !== null;
  }

  getActiveSession(): WalkSessionInfo | null {
    return this.activeSession;
  }

  getTelemetryCount(): number {
    return this.telemetryCount;
  }

  /**
   * Start Walk With Me Home:
   * 1. Creates tracking token & tracker URL
   * 2. Dispatches initial SMS alerts with live tracking link to trusted contacts
   * 3. Connects to backend Socket.IO telemetry stream
   * 4. Starts live GPS location streaming
   */
  async startWalkSession(params: {
    destinationName?: string;
    routeName?: string;
    initialCoords?: LatLng;
  }): Promise<WalkSessionInfo> {
    const { destinationName = 'Destination', routeName = 'Safest Route', initialCoords } = params;

    // Generate unique tracking token
    const token = 'walk-' + Math.random().toString(36).substring(2, 9);
    const trackerUrl = `https://safesafar-tracker.vercel.app/track/${token}`;

    // 1. Retrieve trusted contacts
    const contacts = await getTripContacts();
    if (!contacts || contacts.length === 0) {
      throw new Error('Add a trusted contact first');
    }

    const sessionInfo: WalkSessionInfo = {
      token,
      destinationName,
      routeName,
      trackerUrl,
      startTime: Date.now(),
      contactCount: contacts.length,
    };

    this.activeSession = sessionInfo;
    this.telemetryCount = 0;
    this.notify();

    // 2. Format SMS Message
    const gmapsLink = initialCoords
      ? `https://maps.google.com/?q=${initialCoords.latitude.toFixed(5)},${initialCoords.longitude.toFixed(5)}`
      : 'GPS active';

    const smsBody = `SafeSafar Walk With Me:\nI started walking to ${destinationName} via ${routeName}.\nTrack live GPS:\n${trackerUrl}\nMaps: ${gmapsLink}`;

    // 3. Dispatch SMS to contacts
    await this.dispatchSmsToContacts(contacts, smsBody);

    // 4. Initialize Socket.IO connection to live backend
    try {
      this.connectSocket(token);
    } catch (err) {
      console.warn('[WalkTelemetry] Socket connection failed:', err);
    }

    // 5. Start Real-time Location Watcher
    try {
      await this.startLocationStream(token, initialCoords);
    } catch (err) {
      console.warn('[WalkTelemetry] Location watcher failed:', err);
    }

    return sessionInfo;
  }

  /**
   * Send SMS via native Android SMS or fallback composer/share sheet
   */
  private async dispatchSmsToContacts(contacts: Array<{ name: string; phone: string }>, messageText: string) {
    if (!contacts || contacts.length === 0) return;

    for (const contact of contacts) {
      try {
        if (Platform.OS === 'android' && SmsAndroid && typeof (SmsAndroid as any).autoSend === 'function') {
          // Native background SMS on Android device
          SmsAndroid.autoSend(
            contact.phone,
            messageText,
            (err: any) => {
              console.warn(`[WalkTelemetry] SMS autoSend error to ${contact.phone}:`, err);
              // Fallback to composer
              Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(messageText)}`).catch(() => {});
            },
            () => {
              console.log(`[WalkTelemetry] SMS delivered to ${contact.name} (${contact.phone})`);
            }
          );
        } else {
          // iOS / Expo Go / Web fallback: open SMS composer
          Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(messageText)}`).catch(() => {});
        }
      } catch (e) {
        console.warn(`[WalkTelemetry] Failed to dispatch SMS to ${contact.phone}:`, e);
      }
    }
  }

  /**
   * Allow user to share the live telemetry tracking link via WhatsApp / Share sheet
   */
  async shareTrackingLink() {
    if (!this.activeSession) return;
    const { destinationName, trackerUrl } = this.activeSession;
    const message = `SafeSafar Walk With Me:\nFollow my live journey to ${destinationName} here:\n${trackerUrl}`;
    try {
      await Share.share({
        message,
        title: 'SafeSafar Walk With Me Live Tracking',
        url: trackerUrl,
      });
    } catch (err) {
      console.warn('[WalkTelemetry] Share failed:', err);
    }
  }

  /**
   * Connect to Socket.IO backend for real-time telemetry streaming
   */
  private connectSocket(token: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    const serverUrl = MAP_CONFIG.apiUrl;
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[WalkTelemetry] Connected to backend live telemetry socket');
      this.socket?.emit('join-session', { token });
      this.socket?.emit('trip:join', { trackingToken: token });
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('[WalkTelemetry] Socket disconnected:', reason);
    });
  }

  /**
   * Watch GPS location and stream telemetry updates
   */
  private async startLocationStream(token: string, initialCoords?: LatLng) {
    if (this.locationSub) {
      this.locationSub.remove();
      this.locationSub = null;
    }

    // Send initial coordinate
    if (initialCoords && this.socket && this.socket.connected) {
      this.emitTelemetry(token, {
        latitude: initialCoords.latitude,
        longitude: initialCoords.longitude,
        speed: 1.2,
        heading: 0,
        accuracy: 5,
        timestamp: new Date().toISOString(),
      });
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    this.locationSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, // every 3 seconds
        distanceInterval: 4, // or every 4 meters
      },
      (location) => {
        const telemetry = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed || 0,
          heading: location.coords.heading || 0,
          accuracy: location.coords.accuracy || 5,
          timestamp: new Date(location.timestamp).toISOString(),
        };

        this.emitTelemetry(token, telemetry);
      }
    );
  }

  private emitTelemetry(token: string, payload: any) {
    this.telemetryCount++;
    this.notify();

    if (this.socket && this.socket.connected) {
      const fullPayload = {
        token,
        tripId: token,
        ...payload,
      };

      // Emit on both standard and custom channels
      this.socket.emit('location:update', fullPayload);
      this.socket.emit('trip:location_update', fullPayload);
    }
  }

  /**
   * End Walk With Me Home:
   * 1. Stops GPS location streaming
   * 2. Sends Arrival SMS to trusted contacts
   * 3. Disconnects live socket
   */
  async endWalkSession(hasArrived: boolean = true) {
    if (!this.activeSession) return;

    const session = this.activeSession;

    // 1. Stop location watcher
    if (this.locationSub) {
      this.locationSub.remove();
      this.locationSub = null;
    }

    // 2. Disconnect socket
    if (this.socket) {
      this.socket.emit('session:ended', { token: session.token, status: hasArrived ? 'completed' : 'stopped' });
      this.socket.disconnect();
      this.socket = null;
    }

    // 3. Dispatch Arrival SMS to trusted contacts
    const contacts = await getTripContacts();
    if (contacts && contacts.length > 0) {
      const arrivalMsg = hasArrived
        ? `SafeSafar: I have arrived safely at ${session.destinationName}. Walk With Me Home session completed.`
        : `SafeSafar: Walk With Me Home session to ${session.destinationName} has ended.`;

      await this.dispatchSmsToContacts(contacts, arrivalMsg);
    }

    this.activeSession = null;
    this.telemetryCount = 0;
    this.notify();
  }
}

export const walkTelemetryService = new WalkTelemetryService();
