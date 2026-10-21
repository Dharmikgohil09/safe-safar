import { Landmark, LandmarkType, LatLng, NearestLandmarkResult } from '../types';
import { parseLandmark } from '../models/Landmark';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import landmarksData from '../../assets/data/surat_landmarks.json';

export class LandmarksService {
  private landmarks: Landmark[] = [];
  private isLoaded = false;

  get allLandmarks(): Landmark[] {
    return [...this.landmarks];
  }

  async loadLandmarks(): Promise<Landmark[]> {
    if (this.isLoaded && this.landmarks.length > 0) {
      return this.landmarks;
    }

    try {
      this.landmarks = (landmarksData as any[]).map(parseLandmark);
      this.isLoaded = true;
    } catch (_) {
      this.landmarks = [];
    }
    return this.landmarks;
  }

  setLandmarks(landmarks: Landmark[]): void {
    this.landmarks = [...landmarks];
    this.isLoaded = true;
  }

  filterByType(type: LandmarkType): Landmark[] {
    return this.landmarks.filter((l) => l.type === type);
  }

  findNearestSafePlace(
    userLocation: LatLng,
    options?: {
      filterType?: LandmarkType;
      require24Hours?: boolean;
    }
  ): NearestLandmarkResult | null {
    if (this.landmarks.length === 0) return null;

    const candidates = this.landmarks.filter((l) => {
      if (options?.filterType && l.type !== options.filterType) return false;
      if (options?.require24Hours && !l.isOpen24Hours) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    let nearest: NearestLandmarkResult | null = null;
    let minDistance = Infinity;

    for (const l of candidates) {
      const d = calculateDistanceMeters(userLocation, l.coordinates);
      if (d < minDistance) {
        minDistance = d;
        nearest = {
          landmark: l,
          distanceMeters: d,
          formattedDistance: formatDistance(d),
        };
      }
    }

    return nearest;
  }

  getNearestLandmarks(
    userLocation: LatLng,
    options?: {
      limit?: number;
      filterType?: LandmarkType;
    }
  ): NearestLandmarkResult[] {
    if (this.landmarks.length === 0) return [];

    const limit = options?.limit ?? 5;
    const results: NearestLandmarkResult[] = [];

    for (const l of this.landmarks) {
      if (options?.filterType && l.type !== options.filterType) continue;
      const d = calculateDistanceMeters(userLocation, l.coordinates);
      results.push({
        landmark: l,
        distanceMeters: d,
        formattedDistance: formatDistance(d),
      });
    }

    results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return results.slice(0, limit);
  }
}
