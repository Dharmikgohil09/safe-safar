export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // in meters
  altitude?: number | null;
  speed?: number | null; // in km/h or m/s
  heading?: number | null; // in degrees
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
  timestamp: string | number;
  batteryLevel?: number; // 0 - 100 percentage
}

export interface Destination {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error'
  | 'invalid-token'
  | 'ended';

export interface TrackingSession {
  token: string;
  userName: string;
  userPhoneMasked?: string;
  status: 'active' | 'completed' | 'sos' | 'expired';
  destination?: Destination | null;
  currentLocation?: Coordinates | null;
  lastUpdated: string | number | null;
  batteryLevel?: number | null;
  startedAt: string | number;
  emergencyContactName?: string;
  isMock?: boolean;
}

export interface TrackerState {
  session: TrackingSession | null;
  currentLocation: Coordinates | null;
  breadcrumbs: [number, number][]; // history of coordinates for path
  status: ConnectionStatus;
  errorMessage: string | null;
  isStale: boolean;
  isMock: boolean;
  lastHeartbeat: number | null;
}
