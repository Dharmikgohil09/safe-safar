import { LatLng } from '../types';

/**
 * Calculates distance between two LatLng points using the Haversine formula (Earth radius = 6371000m).
 * Exactly matches Flutter latlong2 `Distance().as(LengthUnit.Meter, p1, p2)`.
 */
export function calculateDistanceMeters(p1: LatLng, p2: LatLng): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = degreesToRadians(p2.latitude - p1.latitude);
  const dLon = degreesToRadians(p2.longitude - p1.longitude);

  const lat1 = degreesToRadians(p1.latitude);
  const lat2 = degreesToRadians(p2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function formatDuration(durationSeconds: number): string {
  const mins = Math.round(durationSeconds / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}
