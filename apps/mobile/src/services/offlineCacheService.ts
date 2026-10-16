import { Landmark, RouteOption } from '../types';

export class OfflineCacheService {
  private static readonly KEY_CACHED_ROUTES = 'safesafar_cached_routes';
  private static readonly KEY_LAST_DESTINATION = 'safesafar_last_destination';
  private static readonly KEY_OFFLINE_OVERRIDE = 'safesafar_offline_override';
  private static readonly KEY_CACHED_LANDMARKS = 'safesafar_cached_landmarks';

  // In-memory memory storage fallback for cross-platform/test execution
  private memoryStore: Map<string, string> = new Map();

  private async setItem(key: string, value: string): Promise<void> {
    this.memoryStore.set(key, value);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (_) {}
    }
  }

  private async getItem(key: string): Promise<string | null> {
    if (this.memoryStore.has(key)) {
      return this.memoryStore.get(key) || null;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      } catch (_) {}
    }
    return null;
  }

  async cacheRoutes(routes: RouteOption[], destinationName: string): Promise<void> {
    await this.setItem(OfflineCacheService.KEY_CACHED_ROUTES, JSON.stringify(routes));
    await this.setItem(OfflineCacheService.KEY_LAST_DESTINATION, destinationName);
  }

  async getCachedRoutes(): Promise<RouteOption[]> {
    const raw = await this.getItem(OfflineCacheService.KEY_CACHED_ROUTES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }

  async getLastDestination(): Promise<string | null> {
    return this.getItem(OfflineCacheService.KEY_LAST_DESTINATION);
  }

  async isOfflineModeForced(): Promise<boolean> {
    const raw = await this.getItem(OfflineCacheService.KEY_OFFLINE_OVERRIDE);
    return raw === 'true';
  }

  async setOfflineModeForced(enabled: boolean): Promise<void> {
    await this.setItem(OfflineCacheService.KEY_OFFLINE_OVERRIDE, enabled ? 'true' : 'false');
  }

  async cacheLandmarks(landmarks: Landmark[]): Promise<void> {
    await this.setItem(OfflineCacheService.KEY_CACHED_LANDMARKS, JSON.stringify(landmarks));
  }

  async getCachedLandmarks(): Promise<Landmark[]> {
    const raw = await this.getItem(OfflineCacheService.KEY_CACHED_LANDMARKS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }
}
