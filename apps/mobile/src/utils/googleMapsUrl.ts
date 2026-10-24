import type { LatLng, RouteOption } from '../types/index';

export const GOOGLE_MAPS_DIRECTIONS_BASE_URL = 'https://www.google.com/maps/dir/?api=1';
export const DEFAULT_MAX_WAYPOINTS = 9;
export const MAX_SAFE_URL_LENGTH = 2000;

export interface GoogleMapsDirectionsParams {
  origin?: LatLng | { lat: number; lng: number } | [number, number] | null;
  destination?: LatLng | { lat: number; lng: number } | [number, number] | null;
  route?: RouteOption | null;
  travelMode?: 'walking' | 'driving' | 'bicycling' | 'transit';
  maxWaypoints?: number;
  maxUrlLength?: number;
}

export interface WaypointSelectionOptions {
  maxWaypoints?: number;
  minSeparationMeters?: number;
}

/**
 * Normalizes any supported coordinate representation to `{ latitude, longitude }`.
 * Supports:
 * - `{ latitude: number, longitude: number }`
 * - `{ lat: number, lng: number }`
 * - `[longitude, latitude]` (GeoJSON array format)
 * Returns `null` if the coordinate is missing, NaN, non-finite, or out of earthly bounds.
 */
export function normalizeCoordinate(coord: unknown): LatLng | null {
  if (!coord) return null;

  let lat: number | undefined;
  let lng: number | undefined;

  if (Array.isArray(coord) && coord.length >= 2) {
    // GeoJSON coordinate order: [longitude, latitude]
    const first = Number(coord[0]);
    const second = Number(coord[1]);
    lng = first;
    lat = second;
  } else if (typeof coord === 'object') {
    const obj = coord as Record<string, unknown>;
    if ('latitude' in obj && 'longitude' in obj) {
      lat = Number(obj.latitude);
      lng = Number(obj.longitude);
    } else if ('lat' in obj && 'lng' in obj) {
      lat = Number(obj.lat);
      lng = Number(obj.lng);
    }
  }

  if (
    lat === undefined ||
    lng === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    return null;
  }

  // Geographical bounds validation
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { latitude: lat, longitude: lng };
}

/**
 * Calculates perpendicular distance in meters from a point to a line segment
 * using equirectangular projection suitable for urban street lengths.
 */
function perpendicularDistanceMeters(
  point: LatLng,
  lineStart: LatLng,
  lineEnd: LatLng
): number {
  const avgLat = ((lineStart.latitude + lineEnd.latitude) / 2) * (Math.PI / 180);
  const cosLat = Math.cos(avgLat);

  // Meter displacements relative to lineStart
  const xB = (lineEnd.longitude - lineStart.longitude) * cosLat * 111320;
  const yB = (lineEnd.latitude - lineStart.latitude) * 110540;

  const xP = (point.longitude - lineStart.longitude) * cosLat * 111320;
  const yP = (point.latitude - lineStart.latitude) * 110540;

  const lineLenSq = xB * xB + yB * yB;
  if (lineLenSq === 0) {
    return Math.hypot(xP, yP);
  }

  return Math.abs(xP * yB - yP * xB) / Math.sqrt(lineLenSq);
}

/**
 * Filters consecutive points that are closer than `minMeters` to avoid
 * redundant waypoints bunched together on the same street segment.
 */
function filterConsecutiveClose(points: LatLng[], minMeters: number): LatLng[] {
  if (points.length <= 1) return points;
  const filtered: LatLng[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = points[i];
    const avgLat = ((prev.latitude + curr.latitude) / 2) * (Math.PI / 180);
    const dx = (curr.longitude - prev.longitude) * Math.cos(avgLat) * 111320;
    const dy = (curr.latitude - prev.latitude) * 110540;
    if (Math.hypot(dx, dy) >= minMeters) {
      filtered.push(curr);
    }
  }
  return filtered;
}

/**
 * Intelligently selects a representative set of intermediate waypoints from the route's
 * actual geometry, preserving the sequential order along the route.
 *
 * Uses Ramer-Douglas-Peucker (RDP) deviation analysis to identify significant bends and
 * turns, ensuring the route guides Google Maps along the SafeSafar corridor while respecting
 * waypoint limits (max 9) and avoiding polyline coordinate bloat.
 */
export function selectIntermediateWaypoints(
  coordinates: unknown[],
  options?: WaypointSelectionOptions
): LatLng[] {
  const maxWaypoints = Math.max(0, options?.maxWaypoints ?? DEFAULT_MAX_WAYPOINTS);
  const minSeparation = options?.minSeparationMeters ?? 25;

  if (!Array.isArray(coordinates) || coordinates.length <= 2 || maxWaypoints === 0) {
    return [];
  }

  // 1. Sanitize and normalize valid coordinates
  const valid: LatLng[] = [];
  for (const c of coordinates) {
    const norm = normalizeCoordinate(c);
    if (norm) {
      valid.push(norm);
    }
  }

  if (valid.length <= 2) {
    return [];
  }

  const n = valid.length;

  // 2. If intermediate points count is already within limit, return with separation filtering
  if (n - 2 <= maxWaypoints) {
    return filterConsecutiveClose(valid.slice(1, -1), minSeparation);
  }

  // 3. Ramer-Douglas-Peucker prioritization: detect meaningful turns and bends
  interface ScoredPoint {
    index: number;
    coord: LatLng;
    deviation: number;
  }

  const candidates: ScoredPoint[] = [];

  function evaluateSegment(sIdx: number, eIdx: number) {
    if (eIdx - sIdx <= 1) return;

    let maxDist = 0;
    let maxIdx = -1;

    for (let i = sIdx + 1; i < eIdx; i++) {
      const dist = perpendicularDistanceMeters(valid[i], valid[sIdx], valid[eIdx]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    // Minimum 8m perpendicular deviation to be considered a meaningful corner or bend
    if (maxIdx !== -1 && maxDist >= 8) {
      candidates.push({
        index: maxIdx,
        coord: valid[maxIdx],
        deviation: maxDist,
      });
      evaluateSegment(sIdx, maxIdx);
      evaluateSegment(maxIdx, eIdx);
    }
  }

  evaluateSegment(0, n - 1);

  let selected: ScoredPoint[] = [];

  if (candidates.length > 0) {
    // Prioritize bends with greatest geometric deflection
    candidates.sort((a, b) => b.deviation - a.deviation);
    selected = candidates.slice(0, maxWaypoints);
  } else {
    // If the path is essentially straight, sample evenly spaced guide points along the path
    const step = (n - 1) / (maxWaypoints + 1);
    for (let k = 1; k <= maxWaypoints; k++) {
      const idx = Math.round(k * step);
      if (idx > 0 && idx < n - 1) {
        selected.push({
          index: idx,
          coord: valid[idx],
          deviation: 0,
        });
      }
    }
  }

  // 4. CRITICAL: Preserve strictly sequential progression along the route
  selected.sort((a, b) => a.index - b.index);

  const waypoints = selected.map((s) => s.coord);
  return filterConsecutiveClose(waypoints, minSeparation);
}

/**
 * Builds a Google Maps Directions URL conforming to Google's official Maps URL specification:
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * Uses actual route origin, destination, walking mode, and representative intermediate waypoints.
 * Safely encodes all parameters with encodeURIComponent.
 */
export function buildGoogleMapsDirectionsUrl(params: GoogleMapsDirectionsParams): string {
  // 1. Resolve Origin
  let origin = normalizeCoordinate(params.origin);
  if (!origin && params.route && Array.isArray(params.route.coordinates) && params.route.coordinates.length > 0) {
    origin = normalizeCoordinate(params.route.coordinates[0]);
  }

  // 2. Resolve Destination
  let destination = normalizeCoordinate(params.destination);
  if (!destination && params.route && Array.isArray(params.route.coordinates) && params.route.coordinates.length > 1) {
    const coords = params.route.coordinates;
    destination = normalizeCoordinate(coords[coords.length - 1]);
  }

  // If endpoints cannot be resolved, return empty string safely
  if (!origin || !destination) {
    return '';
  }

  const travelMode = params.travelMode || 'walking';
  const maxWaypoints = params.maxWaypoints ?? DEFAULT_MAX_WAYPOINTS;
  const maxUrlLength = params.maxUrlLength ?? MAX_SAFE_URL_LENGTH;

  // 3. Extract intermediate waypoints if geometry exists
  let waypoints: LatLng[] = [];
  if (params.route && Array.isArray(params.route.coordinates) && params.route.coordinates.length > 2) {
    waypoints = selectIntermediateWaypoints(params.route.coordinates, { maxWaypoints });
  }

  // 4. Helper to assemble URL with properly encoded query parameters
  const assembleUrl = (pts: LatLng[]): string => {
    const originParam = `${origin!.latitude},${origin!.longitude}`;
    const destParam = `${destination!.latitude},${destination!.longitude}`;

    const queryParts: string[] = [
      `origin=${encodeURIComponent(originParam)}`,
      `destination=${encodeURIComponent(destParam)}`,
      `travelmode=${encodeURIComponent(travelMode)}`,
    ];

    if (pts.length > 0) {
      const waypointsParam = pts.map((p) => `${p.latitude},${p.longitude}`).join('|');
      queryParts.push(`waypoints=${encodeURIComponent(waypointsParam)}`);
    }

    return `${GOOGLE_MAPS_DIRECTIONS_BASE_URL}&${queryParts.join('&')}`;
  };

  let finalUrl = assembleUrl(waypoints);

  // 5. Enforce URL length limit by pruning waypoints from the end if necessary
  while (finalUrl.length > maxUrlLength && waypoints.length > 0) {
    waypoints.pop();
    finalUrl = assembleUrl(waypoints);
  }

  return finalUrl;
}
