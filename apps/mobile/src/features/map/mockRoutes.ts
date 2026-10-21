import { LatLng, RouteOption, SafetyFactors } from '../../types';

export const SVNIT_SURAT_COORDINATES: LatLng = {
  latitude: 21.1648,
  longitude: 72.7848,
};

export const ADAJAN_GAM_COORDINATES: LatLng = {
  latitude: 21.1963,
  longitude: 72.7952,
};

/**
 * High-fidelity mock safe route alternative matching docs/api.md POST /routes/safe
 * Used when Satej's safety scoring engine is in development or when offline / demoing.
 */
export interface SafeRouteApiPayload {
  routeId: string;
  name: string;
  safetyScore: number;
  color: 'green' | 'yellow' | 'red';
  distanceMeters: number;
  durationSeconds: number;
  isSafest: boolean;
  isFastest: boolean;
  explanation: string;
  dangerAlerts?: string[];
  safetyFactors: {
    lightingScore: number;
    policeProximityScore: number;
    incidentDecayScore: number;
  };
  coordinates: [number, number][]; // [lng, lat] GeoJSON format
}

export interface SafeRouteApiResponse {
  success: boolean;
  data: {
    routes: SafeRouteApiPayload[];
  };
}

/**
 * Generates intermediate points between two coordinates with curve jitter
 */
function interpolateWaypoints(
  start: LatLng,
  end: LatLng,
  numPoints: number,
  curvature: number
): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Base linear interpolation
    let lat = start.latitude + (end.latitude - start.latitude) * t;
    let lng = start.longitude + (end.longitude - start.longitude) * t;

    // Apply arc perpendicular offset
    if (i > 0 && i < numPoints) {
      const arc = Math.sin(t * Math.PI) * curvature;
      lat += arc * 0.4;
      lng += arc;
    }

    points.push({ latitude: lat, longitude: lng });
  }
  return points;
}

/**
 * Returns mock safe route alternatives (Green, Yellow, Red) matching docs/api.md
 * @param from Origin coordinates { latitude, longitude }
 * @param to Destination coordinates { latitude, longitude }
 * @param time Optional departure time (e.g. ISO string or "22:00")
 */
export function getMockSafeRoutes(
  from: LatLng = SVNIT_SURAT_COORDINATES,
  to: LatLng = ADAJAN_GAM_COORDINATES,
  time?: string
): RouteOption[] {
  // Check if near Surat SVNIT -> Adajan Gam demo corridor
  const isSuratDemo =
    Math.abs(from.latitude - 21.1648) < 0.05 && Math.abs(to.latitude - 21.1963) < 0.05;

  const greenCoords: LatLng[] = isSuratDemo
    ? [
        { latitude: 21.1648, longitude: 72.7848 },
        { latitude: 21.1665, longitude: 72.7892 },
        { latitude: 21.1685, longitude: 72.7935 },
        { latitude: 21.1730, longitude: 72.7995 },
        { latitude: 21.1762, longitude: 72.8021 },
        { latitude: 21.1812, longitude: 72.8078 },
        { latitude: 21.1870, longitude: 72.8045 },
        { latitude: 21.1915, longitude: 72.8010 },
        { latitude: 21.1963, longitude: 72.7952 },
      ]
    : interpolateWaypoints(from, to, 8, 0.003);

  const yellowCoords: LatLng[] = isSuratDemo
    ? [
        { latitude: 21.1648, longitude: 72.7848 },
        { latitude: 21.1710, longitude: 72.7910 },
        { latitude: 21.1770, longitude: 72.7960 },
        { latitude: 21.1820, longitude: 72.7990 },
        { latitude: 21.1880, longitude: 72.8005 },
        { latitude: 21.1920, longitude: 72.7975 },
        { latitude: 21.1963, longitude: 72.7952 },
      ]
    : interpolateWaypoints(from, to, 7, -0.002);

  const redCoords: LatLng[] = isSuratDemo
    ? [
        { latitude: 21.1648, longitude: 72.7848 },
        { latitude: 21.1720, longitude: 72.7880 },
        { latitude: 21.1790, longitude: 72.7890 },
        { latitude: 21.1860, longitude: 72.7910 },
        { latitude: 21.1910, longitude: 72.7925 },
        { latitude: 21.1963, longitude: 72.7952 },
      ]
    : interpolateWaypoints(from, to, 6, -0.006);

  const timeIndicator = time ? ` (Time: ${time})` : '';

  return [
    // 1. GREEN (Safest Route)
    {
      routeId: 'route_green_safest',
      name: isSuratDemo ? 'Via Athwa Gate & Vivekananda Bridge' : 'Main Boulevard Safe Route',
      safetyScore: 93,
      color: 'green',
      distanceMeters: 5200,
      durationSeconds: 720,
      isSafest: true,
      isFastest: false,
      safetyFactors: {
        lightingScore: 96,
        policeProximityScore: 92,
        incidentDecayScore: 95,
      },
      explanation:
        'Safest Route: Continuous high-mast LED lighting, 2 active police chowkis (Umra & Athwa Lines), CCTV surveillance corridor, and heavy pedestrian footfall along Dumas Road.' +
        timeIndicator,
      dangerAlerts: [],
      coordinates: greenCoords,
    },
    // 2. YELLOW (Moderate Risk Alternative)
    {
      routeId: 'route_yellow_moderate',
      name: isSuratDemo ? 'Via City Light Road & Sardar Bridge' : 'Secondary Avenue Route',
      safetyScore: 72,
      color: 'yellow',
      distanceMeters: 4800,
      durationSeconds: 660,
      isSafest: false,
      isFastest: false,
      safetyFactors: {
        lightingScore: 75,
        policeProximityScore: 68,
        incidentDecayScore: 76,
      },
      explanation:
        'Moderate Route: Residential area with moderate illumination. 1 police patrol point, fewer open shops past 10 PM. Decent alternative during evening hours.' +
        timeIndicator,
      dangerAlerts: ['Moderate lighting drop after Bhatar crossroad'],
      coordinates: yellowCoords,
    },
    // 3. RED (Fastest but Dangerous Route)
    {
      routeId: 'route_red_risky',
      name: isSuratDemo ? 'Via Adajan Canal Backroad (Fastest)' : 'Shortest Canal Backroad',
      safetyScore: 41,
      color: 'red',
      distanceMeters: 4100,
      durationSeconds: 540,
      isSafest: false,
      isFastest: true,
      safetyFactors: {
        lightingScore: 38,
        policeProximityScore: 32,
        incidentDecayScore: 45,
      },
      explanation:
        'Fastest Route (Caution): 2 recent community harassment reports near canal bend, 0 police posts, broken street lights across a 1.2km stretch. Not recommended after dark.' +
        timeIndicator,
      dangerAlerts: [
        '2 community hazard reports in past 48h',
        'Severe lighting blind spot near canal bend',
        'Adjacent to cellular dead zone buffer',
      ],
      coordinates: redCoords,
    },
  ];
}
