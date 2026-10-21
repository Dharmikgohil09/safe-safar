/**
 * SafeSafar Map & Location Configuration
 *
 * Configurable via environment variables (in .env or eas.json).
 * Works 100% out-of-the-box using reliable OpenStreetMap / CartoDB tiles without requiring a paid API key.
 * If you provide a Google Maps API Key or Mapbox Access Token, it will automatically upgrade to those services.
 */

export interface MapConfig {
  /**
   * Google Maps API Key (optional)
   * Applied in Expo app.json under expo.android.config.googleMaps.apiKey / expo.ios.config.googleMaps.apiKey
   * or via EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
   */
  googleMapsApiKey?: string;

  /**
   * Mapbox Access Token (optional)
   * Provide if using Mapbox vector/raster tile services via EXPO_PUBLIC_MAPBOX_TOKEN
   */
  mapboxToken?: string;

  /**
   * Custom tile server URL template (e.g. 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
   */
  customTileUrl?: string;

  /**
   * SafeSafar backend API URL
   */
  apiUrl: string;

  /**
   * OpenRouteService or OSRM routing endpoint
   */
  routingApiUrl: string;

  /**
   * Whether demo mode is forced
   */
  isDemoMode: boolean;

  /**
   * Default fallback coordinates if GPS is unavailable / denied (SVNIT Surat)
   */
  defaultFallbackLocation: {
    latitude: number;
    longitude: number;
    name: string;
  };
}

export const MAP_CONFIG: MapConfig = {
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '',
  customTileUrl: process.env.EXPO_PUBLIC_MAP_TILE_URL || '',
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://safesafar-backend.onrender.com',
  routingApiUrl: process.env.EXPO_PUBLIC_ROUTING_API_URL || 'https://router.project-osrm.org',
  isDemoMode: process.env.EXPO_PUBLIC_DEMO_MODE === 'true',
  defaultFallbackLocation: {
    latitude: 21.1648,
    longitude: 72.7848,
    name: 'SVNIT Surat (Demo Anchor)',
  },
};

/**
 * Get the tile URL for a given style and tile coordinates (z, x, y)
 */
export function getTileUrl(style: 'street' | 'dark' | 'satellite', z: number, x: number, y: number): string {
  // 1. If custom tile URL is configured in .env (skip blocked OSM volunteer server)
  if (MAP_CONFIG.customTileUrl && !MAP_CONFIG.customTileUrl.includes('tile.openstreetmap.org')) {
    return MAP_CONFIG.customTileUrl
      .replace('{z}', String(z))
      .replace('{x}', String(x))
      .replace('{y}', String(y))
      .replace('{s}', ['a', 'b', 'c'][(x + y) % 3]);
  }

  // 2. If Mapbox access token is configured
  if (MAP_CONFIG.mapboxToken) {
    const mapboxStyles = {
      street: 'streets-v12',
      dark: 'dark-v11',
      satellite: 'satellite-v9',
    };
    return `https://api.mapbox.com/styles/v1/mapbox/${mapboxStyles[style]}/tiles/256/${z}/${x}/${y}@2x?access_token=${MAP_CONFIG.mapboxToken}`;
  }

  // 3. Default high-uptime, free, no-API-key-required slippy tile servers:
  switch (style) {
    case 'dark':
      return `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
    case 'satellite':
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}.jpg`;
    case 'street':
    default:
      return `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
  }
}
