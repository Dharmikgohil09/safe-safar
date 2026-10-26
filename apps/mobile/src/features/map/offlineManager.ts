import { DeadZone, DeadZoneAlert, LatLng, RouteOption } from '../../types';
import { calculateDistanceMeters, formatDistance } from '../../utils/geo';
import { getTileUrl } from '../../config/mapConfig';
import suratDeadZonesJson from '../../../assets/data/surat_dead_zones.json';
import { parseDeadZone } from '../../models/DeadZone';

/**
 * 4 Key Surat Demo Anchors for Offline Tile Pre-caching
 */
export const SURAT_DEMO_AREAS = [
  { name: 'SVNIT Campus', latitude: 21.1648, longitude: 72.7848 },
  { name: 'Adajan Gam', latitude: 21.1963, longitude: 72.7952 },
  { name: 'Vesu Corridor', latitude: 21.1412, longitude: 72.7681 },
  { name: 'Surat Railway Station', latitude: 21.2044, longitude: 72.8407 },
];

/**
 * Hardcoded high-confidence Surat cellular dead zones
 */
export const SURAT_KNOWN_DEAD_ZONES: DeadZone[] = (suratDeadZonesJson as any[]).map(parseDeadZone);

// Tile math (Web Mercator EPSG:3857)
function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}
function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * Math.pow(2, zoom));
}

export interface CachedTileMeta {
  zoom: number;
  x: number;
  y: number;
  url: string;
  areaName: string;
}

export interface RouteDeadZoneWarning {
  hasWarning: boolean;
  deadZone?: DeadZone;
  closestDistanceMeters?: number;
  formattedDistance?: string;
  warningMessage: string;
}

export class OfflineMapManager {
  private static cachedRouteStore: RouteOption | null = null;
  private static cachedDestinationName: string = '';
  private static precachedTileUrls: Set<string> = new Set();

  /**
   * Generates and registers tile coordinates for all 4 Surat demo areas
   * across zoom levels 13 to 16.
   */
  static precacheDemoAreaTiles(style: 'street' | 'dark' | 'satellite' = 'street'): CachedTileMeta[] {
    const tiles: CachedTileMeta[] = [];
    const zoomLevels = [13, 14, 15, 16];

    for (const area of SURAT_DEMO_AREAS) {
      for (const z of zoomLevels) {
        const cx = lon2tile(area.longitude, z);
        const cy = lat2tile(area.latitude, z);

        // Precache 3x3 tile block centered at the anchor
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const x = cx + dx;
            const y = cy + dy;
            const url = getTileUrl(style, z, x, y);
            this.precachedTileUrls.add(url);

            tiles.push({
              zoom: z,
              x,
              y,
              url,
              areaName: area.name,
            });
          }
        }
      }
    }

    return tiles;
  }

  /**
   * Cache the last requested route and safety scores locally for offline access
   */
  static saveOfflineRoute(route: RouteOption, destinationName: string): void {
    this.cachedRouteStore = route;
    this.cachedDestinationName = destinationName;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('safesafar_offline_last_route', JSON.stringify(route));
        localStorage.setItem('safesafar_offline_last_destination', destinationName);
      } catch (_) {}
    }
  }

  /**
   * Load the cached route when offline
   */
  static loadOfflineRoute(): { route: RouteOption | null; destinationName: string } {
    if (this.cachedRouteStore) {
      return { route: this.cachedRouteStore, destinationName: this.cachedDestinationName };
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('safesafar_offline_last_route');
        const dest = localStorage.getItem('safesafar_offline_last_destination') || '';
        if (raw) {
          return { route: JSON.parse(raw), destinationName: dest };
        }
      } catch (_) {}
    }
    return { route: null, destinationName: '' };
  }

  /**
   * Checks whether a route polyline passes near any known cellular dead zone.
   * Warns the user when a route passes near low-coverage points.
   *
   * @param route The candidate RouteOption with coordinates
   * @param thresholdMeters Proximity buffer (defaults to 300 meters)
   */
  static checkRouteForDeadZones(
    route: RouteOption,
    thresholdMeters: number = 300,
    deadZones: DeadZone[] = SURAT_KNOWN_DEAD_ZONES
  ): RouteDeadZoneWarning {
    if (!route || !route.coordinates || route.coordinates.length === 0) {
      return {
        hasWarning: false,
        warningMessage: 'Route has normal network coverage.',
      };
    }

    let closestZone: DeadZone | null = null;
    let minDistance = Infinity;

    for (const waypoint of route.coordinates) {
      for (const zone of deadZones) {
        const dist = calculateDistanceMeters(waypoint, zone.center);
        const distToEdge = dist - zone.radiusMeters;

        if (distToEdge < minDistance) {
          minDistance = distToEdge;
          closestZone = zone;
        }
      }
    }

    // Inside dead zone
    if (minDistance <= 0 && closestZone) {
      return {
        hasWarning: true,
        deadZone: closestZone,
        closestDistanceMeters: 0,
        formattedDistance: '0 m (Inside)',
        warningMessage: `CRITICAL ROUTE WARNING: This path traverses inside ${closestZone.name}. No cellular voice/data for ~${closestZone.radiusMeters * 2}m. SMS standby enabled.`,
      };
    }

    // Approaching / near dead zone
    if (minDistance <= thresholdMeters && closestZone) {
      const distRounded = Math.max(10, Math.round(minDistance));
      return {
        hasWarning: true,
        deadZone: closestZone,
        closestDistanceMeters: distRounded,
        formattedDistance: formatDistance(distRounded),
        warningMessage: `ROUTE CAUTION: This path passes within ${formatDistance(distRounded)} of ${closestZone.name} (Cellular Dead Zone).`,
      };
    }

    return {
      hasWarning: false,
      warningMessage: 'All alternative route waypoints maintain full cellular coverage.',
    };
  }
}
