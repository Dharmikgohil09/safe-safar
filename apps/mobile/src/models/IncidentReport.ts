import { IncidentReport, IncidentType, LatLng } from '../types';

export function parseIncidentType(raw?: string): IncidentType {
  const norm = raw?.toLowerCase().replace('-', '_');
  switch (norm) {
    case 'dark_street':
    case 'darkstreet':
      return 'dark_street';
    case 'harassment':
      return 'harassment';
    case 'isolated_path':
    case 'isolatedpath':
      return 'isolated_path';
    case 'suspicious':
    default:
      return 'suspicious';
  }
}

export function getIncidentColor(type: IncidentType): string {
  switch (type) {
    case 'dark_street':
      return '#6A1B9A'; // Deep Purple
    case 'harassment':
      return '#D50000'; // Danger Red
    case 'isolated_path':
      return '#E65100'; // Dark Orange
    case 'suspicious':
      return '#C2185B'; // Pink
  }
}

export function getIncidentLabel(type: IncidentType): string {
  switch (type) {
    case 'dark_street':
      return 'Poor Lighting / Dark Street';
    case 'harassment':
      return 'Reported Harassment';
    case 'isolated_path':
      return 'Isolated / Desolate Path';
    case 'suspicious':
      return 'Suspicious Activity';
  }
}

export function getIncidentIconName(type: IncidentType): string {
  switch (type) {
    case 'dark_street':
      return 'lightbulb-outline';
    case 'harassment':
      return 'warning-amber';
    case 'isolated_path':
      return 'remove-road';
    case 'suspicious':
      return 'visibility';
  }
}

export function parseIncidentReport(json: any): IncidentReport {
  const rawCoords = Array.isArray(json.coordinates) ? json.coordinates : [72.8, 21.1];
  const lng = Number(rawCoords[0]) || 72.8;
  const lat = Number(rawCoords[1]) || 21.1;

  return {
    id: json.id || `rep_${Date.now()}`,
    type: parseIncidentType(json.type),
    coordinates: { latitude: lat, longitude: lng },
    description: json.description || 'Incident reported by community member',
    severity: typeof json.severity === 'number' ? json.severity : 3,
    confirmations: typeof json.confirmations === 'number' ? json.confirmations : 1,
    verified: Boolean(json.verified),
    createdAt: json.createdAt || new Date().toISOString(),
  };
}
