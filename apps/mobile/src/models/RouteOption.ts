import { LatLng, RouteOption, SafetyTier } from '../types';
import { parseSafetyFactors } from './SafetyFactors';
import { formatDistance, formatDuration } from '../utils/geo';

export function getSafetyTier(safetyScore: number): SafetyTier {
  if (safetyScore >= 80) return 'safe';
  if (safetyScore >= 60) return 'moderate';
  return 'risky';
}

export function getRouteColor(tier: SafetyTier): string {
  switch (tier) {
    case 'safe':
      return '#00C853'; // Vibrant Safety Green
    case 'moderate':
      return '#FFAB00'; // Amber Warning
    case 'risky':
      return '#FF1744'; // Crimson Danger Red
  }
}

export function getTierLabel(tier: SafetyTier): string {
  switch (tier) {
    case 'safe':
      return 'Safest Route';
    case 'moderate':
      return 'Moderate Risk';
    case 'risky':
      return 'High Risk Caution';
  }
}

export function parseRouteOption(json: any): RouteOption {
  const rawCoords = Array.isArray(json.coordinates) ? json.coordinates : [];
  const coords: LatLng[] = rawCoords.map((item: any) => {
    if (Array.isArray(item) && item.length >= 2) {
      const lng = Number(item[0]) || 0;
      const lat = Number(item[1]) || 0;
      return { latitude: lat, longitude: lng };
    }
    if (item && typeof item.latitude === 'number' && typeof item.longitude === 'number') {
      return { latitude: item.latitude, longitude: item.longitude };
    }
    return { latitude: 0, longitude: 0 };
  });

  return {
    routeId: json.routeId || 'route_custom',
    name: json.name || 'Standard Route',
    safetyScore: typeof json.safetyScore === 'number' ? json.safetyScore : 75,
    color: json.color || 'green',
    distanceMeters: typeof json.distanceMeters === 'number' ? json.distanceMeters : 3000,
    durationSeconds: typeof json.durationSeconds === 'number' ? json.durationSeconds : 600,
    isSafest: Boolean(json.isSafest),
    isFastest: Boolean(json.isFastest),
    safetyFactors: parseSafetyFactors(json.safetyFactors),
    explanation: json.explanation || 'Evaluated route based on real-time factors.',
    dangerAlerts: Array.isArray(json.dangerAlerts) ? json.dangerAlerts.map(String) : [],
    coordinates: coords,
  };
}

export { formatDistance, formatDuration };
