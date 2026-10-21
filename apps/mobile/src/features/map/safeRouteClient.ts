import { LatLng, RouteOption } from '../../types';
import { MAP_CONFIG } from '../../config/mapConfig';
import { getMockSafeRoutes } from './mockRoutes';
import { parseRouteOption } from '../../models/RouteOption';

export interface SafeRouteRequest {
  // Days 2-3 standard format:
  from?: LatLng;
  to?: LatLng;
  time?: string;

  // docs/api.md format compatibility:
  origin?: LatLng;
  destination?: LatLng;
  preferences?: {
    prioritizeLighting?: boolean;
    avoidReportHotspots?: boolean;
  };
  token?: string;
}

// Runtime flag for mocking Satej's POST /routes/safe endpoint
let _useMockRoutes =
  process.env.EXPO_PUBLIC_USE_MOCK_ROUTES !== 'false' &&
  (process.env.EXPO_PUBLIC_USE_MOCK_ROUTES === 'true' || true); // Defaults to true until Satej deploys

/**
 * Switch between real POST /routes/safe and local mock engine at runtime
 */
export function setUseMockRoutes(useMock: boolean): void {
  _useMockRoutes = useMock;
}

/**
 * Returns whether mock routes are currently being used
 */
export function isUsingMockRoutes(): boolean {
  return _useMockRoutes;
}

/**
 * Calls POST /routes/safe to retrieve safe route alternatives (Green, Yellow, Red)
 * Conforms strictly to docs/api.md (Satej's safety scoring contract).
 * Falls back to high-fidelity mock if Satej's service is unavailable or if USE_MOCK_ROUTES is active.
 */
export async function fetchSafeRoutes(options: SafeRouteRequest): Promise<RouteOption[]> {
  const origin = options.from || options.origin;
  const destination = options.to || options.destination;

  if (!origin || !destination) {
    throw new Error('fetchSafeRoutes requires both origin and destination coordinates');
  }

  // 1. If mock switch is active, return mock alternatives directly
  if (_useMockRoutes) {
    return getMockSafeRoutes(origin, destination, options.time);
  }

  // 2. Call Satej's backend POST /routes/safe
  try {
    const url = `${MAP_CONFIG.apiUrl}/routes/safe`;
    const payload = {
      origin: { coordinates: [origin.longitude, origin.latitude] },
      destination: { coordinates: [destination.longitude, destination.latitude] },
      preferences: {
        prioritizeLighting: options.preferences?.prioritizeLighting ?? true,
        avoidReportHotspots: options.preferences?.avoidReportHotspots ?? true,
      },
      time: options.time || new Date().toISOString(),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data?.data?.routes && Array.isArray(data.data.routes) && data.data.routes.length > 0) {
        return data.data.routes.map(parseRouteOption);
      }
    }
  } catch (err) {
    console.warn('[SafeSafar SafeRouteClient] Backend /routes/safe unreachable, falling back to mock:', err);
  }

  // 3. Graceful fallback to mock matching docs/api.md
  return getMockSafeRoutes(origin, destination, options.time);
}
