import { LatLng, Landmark } from '../types';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import landmarksData from '../../assets/data/surat_landmarks.json';

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  coordinates: LatLng;
  category: 'landmark' | 'police' | 'hospital' | 'pharmacy' | 'transit' | 'address';
  distanceMeters?: number;
  formattedDistance?: string;
}

// Curated prominent Surat locations for instant matching and offline search
const SURAT_PRESET_LOCATIONS: PlaceSearchResult[] = [
  {
    id: 'surat_svnit',
    name: 'SVNIT Campus (Sardar Vallabhbhai National Institute)',
    address: 'Ichchhanath Circle, Dumas Road, Surat, Gujarat 395007',
    coordinates: { latitude: 21.1648, longitude: 72.7848 },
    category: 'landmark',
  },
  {
    id: 'surat_adajan_gam',
    name: 'Adajan Gam Circle',
    address: 'Adajan Gam, Near Tapi River Bank, Surat, Gujarat 395009',
    coordinates: { latitude: 21.1963, longitude: 72.7952 },
    category: 'landmark',
  },
  {
    id: 'surat_vr_mall',
    name: 'VR Surat Shopping Mall',
    address: 'Dumas Road, Magdalla, Surat, Gujarat 395007',
    coordinates: { latitude: 21.1442, longitude: 72.7565 },
    category: 'landmark',
  },
  {
    id: 'surat_railway_station',
    name: 'Surat Railway Station (Main Terminal)',
    address: 'Station Road, Varachha, Surat, Gujarat 395003',
    coordinates: { latitude: 21.2044, longitude: 72.8407 },
    category: 'transit',
  },
  {
    id: 'surat_dumas_beach',
    name: 'Dumas Beach & Promenade',
    address: 'Dumas Road, South Surat, Gujarat 395007',
    coordinates: { latitude: 21.0921, longitude: 72.7154 },
    category: 'landmark',
  },
  {
    id: 'surat_vesu_hub',
    name: 'Vesu VIP Road Business Hub',
    address: 'VIP Road, Vesu, Surat, Gujarat 395007',
    coordinates: { latitude: 21.1422, longitude: 72.7761 },
    category: 'landmark',
  },
  {
    id: 'surat_athwa_gate',
    name: 'Athwa Gate Junction',
    address: 'Athwa Lines, Surat, Gujarat 395001',
    coordinates: { latitude: 21.1824, longitude: 72.8101 },
    category: 'landmark',
  },
  {
    id: 'surat_piplod_lake',
    name: 'Piplod Lake & Food Park',
    address: 'Gaurav Path, Piplod, Surat, Gujarat 395007',
    coordinates: { latitude: 21.1567, longitude: 72.7712 },
    category: 'landmark',
  },
  {
    id: 'surat_hazira_port',
    name: 'Hazira Industrial Belt',
    address: 'Hazira Road, Surat, Gujarat 394270',
    coordinates: { latitude: 21.1098, longitude: 72.6321 },
    category: 'transit',
  },
  {
    id: 'surat_textile_market',
    name: 'Ring Road Textile Market',
    address: 'Ring Road, Rustampura, Surat, Gujarat 395002',
    coordinates: { latitude: 21.1912, longitude: 72.8345 },
    category: 'landmark',
  },
];

export class GeocodingService {
  private localLandmarks: PlaceSearchResult[] = [];

  constructor() {
    this.indexLocalLandmarks();
  }

  private indexLocalLandmarks(): void {
    const list: PlaceSearchResult[] = [...SURAT_PRESET_LOCATIONS];

    try {
      if (Array.isArray(landmarksData)) {
        for (const item of (landmarksData as any[])) {
          const coords = item.coordinates;
          const lat = Array.isArray(coords) ? coords[1] : coords?.latitude;
          const lng = Array.isArray(coords) ? coords[0] : coords?.longitude;

          if (lat && lng) {
            list.push({
              id: item.id || `lm_${Math.random().toString(36).substring(7)}`,
              name: item.name,
              address: item.address || item.zone || 'Surat, Gujarat',
              coordinates: { latitude: Number(lat), longitude: Number(lng) },
              category: (item.type as any) || 'landmark',
            });
          }
        }
      }
    } catch (_) {}

    this.localLandmarks = list;
  }

  /**
   * Search for places by text query.
   * Checks local curated Surat locations and landmarks, and if online queries OpenStreetMap Nominatim.
   */
  async searchPlaces(query: string, userLocation?: LatLng): Promise<PlaceSearchResult[]> {
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) {
      return this.getPopularSpots(userLocation);
    }

    // 1. Search local indexed landmarks & presets
    const localMatches = this.localLandmarks.filter((place) => {
      const matchName = place.name.toLowerCase().includes(cleaned);
      const matchAddr = place.address.toLowerCase().includes(cleaned);
      const matchCat = place.category.toLowerCase().includes(cleaned);
      return matchName || matchAddr || matchCat;
    });

    // 2. Query Nominatim OpenStreetMap Geocoding API if query >= 2 chars
    let remoteMatches: PlaceSearchResult[] = [];
    if (cleaned.length >= 2) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        // Query directly with user's input without hardcoding any specific city
        const searchQuery = cleaned;
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&addressdetails=1&limit=5`;
        if (userLocation) {
          // Bias search towards user's real GPS bounding area (+- 0.5 degrees ~ 55km)
          const left = userLocation.longitude - 0.5;
          const right = userLocation.longitude + 0.5;
          const top = userLocation.latitude + 0.5;
          const bottom = userLocation.latitude - 0.5;
          url += `&viewbox=${left},${top},${right},${bottom}`;
        }

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'SafeSafar-Mobile/1.0',
            Accept: 'application/json',
          },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            remoteMatches = data.map((item: any) => {
              const lat = parseFloat(item.lat);
              const lon = parseFloat(item.lon);
              const name = item.name || item.display_name.split(',')[0];
              const addr = item.display_name;

              let cat: PlaceSearchResult['category'] = 'address';
              if (item.type === 'hospital' || item.class === 'healthcare') cat = 'hospital';
              else if (item.type === 'police' || item.class === 'police') cat = 'police';
              else if (item.type === 'pharmacy') cat = 'pharmacy';
              else if (item.type === 'station' || item.class === 'railway') cat = 'transit';
              else if (item.type === 'university' || item.type === 'school') cat = 'landmark';

              return {
                id: `osm_${item.place_id || Math.random().toString(36).substring(7)}`,
                name,
                address: addr,
                coordinates: { latitude: lat, longitude: lon },
                category: cat,
              };
            });
          }
        }
      } catch (_) {
        // Fall back gracefully to local matches
      }
    }

    // Merge and deduplicate by coordinates proximity (< 100 meters)
    const combined: PlaceSearchResult[] = [...localMatches];
    for (const remote of remoteMatches) {
      const exists = combined.some(
        (existing) =>
          calculateDistanceMeters(existing.coordinates, remote.coordinates) < 100 ||
          existing.name.toLowerCase() === remote.name.toLowerCase()
      );
      if (!exists) {
        combined.push(remote);
      }
    }

    // Add distance metrics if userLocation is available
    if (userLocation) {
      for (const item of combined) {
        const d = calculateDistanceMeters(userLocation, item.coordinates);
        item.distanceMeters = d;
        item.formattedDistance = formatDistance(d);
      }
      combined.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }

    return combined.slice(0, 8);
  }

  /**
   * Reverse geocode a latitude/longitude coordinate to a human-readable place name.
   */
  async reverseGeocode(coords: LatLng): Promise<{ name: string; address: string }> {
    // 1. Check nearest local landmark (< 300m)
    let closestLandmark: PlaceSearchResult | null = null;
    let minDistance = 300;

    for (const item of this.localLandmarks) {
      const d = calculateDistanceMeters(coords, item.coordinates);
      if (d < minDistance) {
        minDistance = d;
        closestLandmark = item;
      }
    }

    if (closestLandmark) {
      return {
        name: closestLandmark.name,
        address: `Near ${closestLandmark.name}, ${closestLandmark.address}`,
      };
    }

    // 2. Query Nominatim reverse geocoding API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=16&addressdetails=1`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SafeSafar-Mobile/1.0',
          Accept: 'application/json',
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood;
        const name = road ? `${road}, Surat` : data.display_name.split(',')[0];
        return {
          name: name || 'Selected Map Location',
          address: data.display_name || `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`,
        };
      }
    } catch (_) {}

    return {
      name: `Dropped Pin (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
      address: `Coordinate: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
    };
  }

  /**
   * Returns curated quick spots for default empty search display.
   */
  getPopularSpots(userLocation?: LatLng): PlaceSearchResult[] {
    const list = SURAT_PRESET_LOCATIONS.map((spot) => {
      const copy = { ...spot };
      if (userLocation) {
        const d = calculateDistanceMeters(userLocation, copy.coordinates);
        copy.distanceMeters = d;
        copy.formattedDistance = formatDistance(d);
      }
      return copy;
    });

    if (userLocation) {
      list.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }

    return list;
  }
}
