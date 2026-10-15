/**
 * SafeSafar - Map & Safe Navigation Feature Module
 * Owner: Dhruv Raval (@dhruv)
 *
 * Public interface for SafeSafar Maps, Safe Routing, and Landmark Havens.
 * Provides types, endpoints, and bridges to the Flutter Map subsystem.
 */

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
  coordinates: [number, number][]; // [lng, lat]
}

export interface Landmark {
  id: string;
  name: string;
  type: 'police' | 'hospital' | 'school' | 'pharmacy' | 'shelter';
  coordinates: [number, number];
  address: string;
  phone: string;
  isOpen24Hours: boolean;
  zone: string;
}

export interface DeadZone {
  id: string;
  name: string;
  center: [number, number];
  radiusMeters: number;
  warningLevel: 'moderate' | 'high';
  description: string;
  carrierNotes: string;
}

// Module path reference to the Flutter implementation
export const FLUTTER_MAP_MODULE_PATH = 'apps/mobile_flutter';

// Default Demo Anchor: SVNIT Surat
export const SVNIT_SURAT_COORDINATES: LatLng = {
  latitude: 21.1648,
  longitude: 72.7848,
};

// Default Demo Destination: Adajan Gam Circle
export const ADAJAN_GAM_COORDINATES: LatLng = {
  latitude: 21.1963,
  longitude: 72.7952,
};
