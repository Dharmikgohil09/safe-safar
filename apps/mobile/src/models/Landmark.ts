import { Landmark, LandmarkType, LatLng } from '../types';

export function parseLandmarkType(raw?: string): LandmarkType {
  switch (raw?.toLowerCase()) {
    case 'police':
      return 'police';
    case 'hospital':
    case 'clinic':
      return 'hospital';
    case 'school':
    case 'college':
    case 'university':
      return 'school';
    case 'pharmacy':
      return 'pharmacy';
    case 'shelter':
    default:
      return 'shelter';
  }
}

export function getLandmarkColor(type: LandmarkType): string {
  switch (type) {
    case 'police':
      return '#1E88E5'; // Blue
    case 'hospital':
      return '#E53935'; // Red
    case 'school':
      return '#8E24AA'; // Purple
    case 'pharmacy':
      return '#00897B'; // Teal
    case 'shelter':
      return '#43A047'; // Green
  }
}

export function getLandmarkLabel(type: LandmarkType): string {
  switch (type) {
    case 'police':
      return 'Police Station / Chowki';
    case 'hospital':
      return 'Hospital & Trauma Center';
    case 'school':
      return 'Educational / Guarded Campus';
    case 'pharmacy':
      return '24/7 Pharmacy';
    case 'shelter':
      return 'Verified Safe Shelter';
  }
}

export function getLandmarkIconName(type: LandmarkType): string {
  switch (type) {
    case 'police':
      return 'local-police';
    case 'hospital':
      return 'local-hospital';
    case 'school':
      return 'school';
    case 'pharmacy':
      return 'medication';
    case 'shelter':
      return 'security';
  }
}

export function parseLandmark(json: any): Landmark {
  const rawCoords = Array.isArray(json.coordinates) ? json.coordinates : [72.8, 21.1];
  const lng = Number(rawCoords[0]) || 72.8;
  const lat = Number(rawCoords[1]) || 21.1;

  return {
    id: json.id || `lm_${Date.now()}`,
    name: json.name || 'Safe Landmark',
    type: parseLandmarkType(json.type),
    coordinates: { latitude: lat, longitude: lng },
    address: json.address || 'Surat, Gujarat',
    phone: json.phone || '',
    isOpen24Hours: Boolean(json.isOpen24Hours),
    zone: json.zone || 'Surat',
  };
}
