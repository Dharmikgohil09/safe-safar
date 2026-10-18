import { DeadZone, DeadZoneSeverity, LatLng } from '../types';
import { calculateDistanceMeters } from '../utils/geo';

export function getDeadZoneCircleColor(warningLevel: DeadZoneSeverity): string {
  if (warningLevel === 'high') {
    return 'rgba(211, 47, 47, 0.28)';
  }
  return 'rgba(255, 152, 0, 0.25)';
}

export function getDeadZoneBorderColor(warningLevel: DeadZoneSeverity): string {
  if (warningLevel === 'high') {
    return '#D32F2F';
  }
  return '#FF9800';
}

export function isDeadZoneInside(deadZone: DeadZone, point: LatLng): boolean {
  return calculateDistanceMeters(deadZone.center, point) <= deadZone.radiusMeters;
}

export function isDeadZoneApproaching(
  deadZone: DeadZone,
  point: LatLng,
  proximityThresholdMeters: number = 300.0
): boolean {
  const d = calculateDistanceMeters(deadZone.center, point);
  return d > deadZone.radiusMeters && d <= deadZone.radiusMeters + proximityThresholdMeters;
}

export function parseDeadZone(json: any): DeadZone {
  const rawCenter = Array.isArray(json.center) ? json.center : [72.8, 21.1];
  const lng = Number(rawCenter[0]) || 72.8;
  const lat = Number(rawCenter[1]) || 21.1;

  return {
    id: json.id || `dz_${Date.now()}`,
    name: json.name || 'Cellular Dead Zone',
    center: { latitude: lat, longitude: lng },
    radiusMeters: typeof json.radiusMeters === 'number' ? json.radiusMeters : 250.0,
    warningLevel: json.warningLevel === 'high' ? 'high' : 'moderate',
    description: json.description || 'Low coverage area.',
    carrierNotes: json.carrierNotes || '',
  };
}
