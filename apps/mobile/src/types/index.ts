export interface LatLng {
  latitude: number;
  longitude: number;
}

export type SafetyTier = 'safe' | 'moderate' | 'risky';

export interface SafetyFactors {
  lightingScore: number;
  policeProximityScore: number;
  incidentDecayScore: number;
}

export type DeadZoneSeverity = 'moderate' | 'high';

export interface DeadZone {
  id: string;
  name: string;
  center: LatLng;
  radiusMeters: number;
  warningLevel: DeadZoneSeverity;
  description: string;
  carrierNotes: string;
}

export type LandmarkType = 'police' | 'hospital' | 'school' | 'pharmacy' | 'shelter';

export interface Landmark {
  id: string;
  name: string;
  type: LandmarkType;
  coordinates: LatLng;
  address: string;
  phone: string;
  isOpen24Hours: boolean;
  zone: string;
}

export type IncidentType = 'dark_street' | 'harassment' | 'isolated_path' | 'suspicious';

export interface IncidentReport {
  id: string;
  type: IncidentType;
  coordinates: LatLng;
  description: string;
  severity: number; // 1 to 5
  confirmations: number;
  verified: boolean;
  createdAt: string;
}

export interface RouteOption {
  routeId: string;
  name: string;
  safetyScore: number;
  color: 'green' | 'yellow' | 'red';
  distanceMeters: number;
  durationSeconds: number;
  isSafest: boolean;
  isFastest: boolean;
  safetyFactors: SafetyFactors;
  explanation: string;
  dangerAlerts: string[];
  coordinates: LatLng[];
}

export type DeadZoneState = 'safe' | 'approaching' | 'inside';

export interface DeadZoneAlert {
  state: DeadZoneState;
  deadZone?: DeadZone;
  distanceMeters?: number;
  hasWarning: boolean;
  bannerTitle: string;
  bannerMessage: string;
}

export interface NearestLandmarkResult {
  landmark: Landmark;
  distanceMeters: number;
  formattedDistance: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  originName: string;
  origin: LatLng;
  destinationName: string;
  destination: LatLng;
  routes: RouteOption[];
}
