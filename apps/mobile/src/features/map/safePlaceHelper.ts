import { Landmark, LandmarkType, LatLng, NearestLandmarkResult } from '../../types';
import { calculateDistanceMeters, formatDistance } from '../../utils/geo';
import { parseLandmark } from '../../models/Landmark';
import suratLandmarksData from '../../../assets/data/surat_landmarks.json';

const defaultLandmarks: Landmark[] = (suratLandmarksData as any[]).map(parseLandmark);

export interface NearestSafePlaceOptions {
  filterType?: LandmarkType;
  require24Hours?: boolean;
}

/**
 * Helper for teammates (SOS dispatch, Walk Me Home, quick haven routing)
 * to locate the closest safe haven (Police, Hospital, 24/7 Pharmacy, Shelter).
 */
export function getNearestSafeHaven(
  userLocation: LatLng,
  landmarks: Landmark[] = defaultLandmarks,
  options?: NearestSafePlaceOptions
): NearestLandmarkResult | null {
  if (!userLocation || !landmarks || landmarks.length === 0) return null;

  const candidates = landmarks.filter((l) => {
    if (options?.filterType && l.type !== options.filterType) return false;
    if (options?.require24Hours && !l.isOpen24Hours) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  let nearest: NearestLandmarkResult | null = null;
  let minDistance = Infinity;

  for (const item of candidates) {
    const dist = calculateDistanceMeters(userLocation, item.coordinates);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = {
        landmark: item,
        distanceMeters: dist,
        formattedDistance: formatDistance(dist),
      };
    }
  }

  return nearest;
}

/**
 * Convenient shortcut to find the nearest police station or chowki
 */
export function getNearestPoliceStation(
  userLocation: LatLng,
  landmarks?: Landmark[]
): NearestLandmarkResult | null {
  return getNearestSafeHaven(userLocation, landmarks, { filterType: 'police' });
}

/**
 * Convenient shortcut to find the nearest 24/7 emergency hospital
 */
export function getNearestHospital(
  userLocation: LatLng,
  landmarks?: Landmark[]
): NearestLandmarkResult | null {
  return getNearestSafeHaven(userLocation, landmarks, { filterType: 'hospital', require24Hours: true });
}
