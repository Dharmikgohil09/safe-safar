import { Coordinates, LocationPayload } from '../types/tracker';

/**
 * Validates coordinate numbers and boundaries
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return false;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90) {
    return false;
  }
  if (lng < -180 || lng > 180) {
    return false;
  }
  return true;
}

/**
 * Safely parses and normalizes location payloads from socket or REST.
 * Note: Never fabricates a live timestamp if one is not provided in the payload.
 */
export function validateAndParseLocation(payload: unknown): LocationPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;

  // Handle flat { latitude, longitude } or nested { coords: { latitude, longitude } }
  let rawLat: unknown = data.latitude ?? data.lat;
  let rawLng: unknown = data.longitude ?? data.lng ?? data.lon;

  if (data.coords && typeof data.coords === 'object') {
    const coords = data.coords as Record<string, unknown>;
    rawLat = rawLat ?? coords.latitude ?? coords.lat;
    rawLng = rawLng ?? coords.longitude ?? coords.lng;
  }

  const lat = typeof rawLat === 'string' ? parseFloat(rawLat) : rawLat;
  const lng = typeof rawLng === 'string' ? parseFloat(rawLng) : rawLng;

  if (!isValidCoordinate(lat, lng)) {
    console.warn('[SafeSafar] Invalid coordinates received:', { lat, lng });
    return null;
  }

  const accuracy = typeof data.accuracy === 'number' && Number.isFinite(data.accuracy) ? data.accuracy : undefined;
  const speed = typeof data.speed === 'number' && Number.isFinite(data.speed) ? data.speed : null;
  const heading = typeof data.heading === 'number' && Number.isFinite(data.heading) ? data.heading : null;
  const batteryLevel = typeof data.batteryLevel === 'number' && Number.isFinite(data.batteryLevel) ? data.batteryLevel : undefined;

  // Safe timestamp parsing: DO NOT fabricate Date.now() if missing from payload
  let timestamp: string | number | null = null;
  if (data.timestamp !== undefined && data.timestamp !== null) {
    if (typeof data.timestamp === 'number' && Number.isFinite(data.timestamp)) {
      timestamp = data.timestamp;
    } else if (typeof data.timestamp === 'string') {
      const parsed = Date.parse(data.timestamp);
      timestamp = Number.isNaN(parsed) ? null : data.timestamp;
    }
  }

  return {
    latitude: lat as number,
    longitude: lng as number,
    accuracy,
    speed,
    heading,
    timestamp,
    batteryLevel,
  };
}

/**
 * Validates a tracking session token format
 */
export function isValidTokenFormat(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const clean = token.trim();
  // Valid token is non-empty alphanumeric, uuid, or safe slug (3 to 128 chars)
  return /^[a-zA-Z0-9_-]{3,128}$/.test(clean);
}
