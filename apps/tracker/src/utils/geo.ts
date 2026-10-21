/**
 * Calculates distance in kilometers between two coordinates using the Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Safely parses any timestamp (number or string/ISO) to numeric epoch milliseconds.
 * Returns null if missing, empty, or unparseable.
 */
export function getNumericTimestamp(timestamp: string | number | null | undefined): number | null {
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return null;
  }
  if (typeof timestamp === 'number') {
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Formats relative time since timestamp (e.g., "Just now", "42s ago", "2m ago")
 * Handles missing or invalid timestamps safely without fabricating timestamps.
 */
export function formatRelativeTime(timestamp: string | number | null | undefined): string {
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return 'No update timestamp available';
  }

  const time = getNumericTimestamp(timestamp);
  if (time === null) {
    return 'Timestamp unavailable';
  }

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - time) / 1000));

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Formats absolute time string (e.g., "11:05:32 AM")
 * Safely handles missing timestamps.
 */
export function formatTime(timestamp: string | number | null | undefined): string {
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return 'Time unavailable';
  }
  const time = getNumericTimestamp(timestamp);
  if (time === null) return 'Time unavailable';
  const date = new Date(time);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
