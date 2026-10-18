import { DeadZone, DeadZoneAlert, DeadZoneState, LatLng } from '../types';
import { isDeadZoneApproaching, isDeadZoneInside, parseDeadZone } from '../models/DeadZone';
import { calculateDistanceMeters } from '../utils/geo';
import deadZonesData from '../../assets/data/surat_dead_zones.json';

export class DeadZoneService {
  private deadZones: DeadZone[] = [];
  private isLoaded = false;

  get allDeadZones(): DeadZone[] {
    return [...this.deadZones];
  }

  async loadDeadZones(): Promise<DeadZone[]> {
    if (this.isLoaded && this.deadZones.length > 0) {
      return this.deadZones;
    }

    try {
      this.deadZones = (deadZonesData as any[]).map(parseDeadZone);
      this.isLoaded = true;
    } catch (_) {
      this.deadZones = [];
    }
    return this.deadZones;
  }

  setDeadZones(zones: DeadZone[]): void {
    this.deadZones = [...zones];
    this.isLoaded = true;
  }

  checkUserPosition(userLocation: LatLng, warningThresholdMeters: number = 300.0): DeadZoneAlert {
    if (this.deadZones.length === 0) {
      return this.buildAlert('safe');
    }

    // 1. Check if inside any dead zone
    for (const zone of this.deadZones) {
      if (isDeadZoneInside(zone, userLocation)) {
        return this.buildAlert('inside', zone, 0);
      }
    }

    // 2. Check if approaching any dead zone
    for (const zone of this.deadZones) {
      if (isDeadZoneApproaching(zone, userLocation, warningThresholdMeters)) {
        const d = calculateDistanceMeters(zone.center, userLocation) - zone.radiusMeters;
        return this.buildAlert('approaching', zone, d);
      }
    }

    return this.buildAlert('safe');
  }

  private buildAlert(state: DeadZoneState, deadZone?: DeadZone, distanceMeters?: number): DeadZoneAlert {
    let bannerTitle = 'Cellular Network Operational';
    let bannerMessage = 'Mobile signal normal.';

    if (state === 'inside') {
      bannerTitle = 'CRITICAL: Cellular Dead Zone Active';
      bannerMessage = deadZone
        ? `${deadZone.name}: Mobile internet & voice unavailable. Offline routing cached, SMS standby.`
        : 'Mobile internet & voice unavailable. Offline routing cached, SMS standby.';
    } else if (state === 'approaching') {
      bannerTitle = 'WARNING: Approaching Low Network Zone';
      const dist = distanceMeters !== undefined ? Math.round(distanceMeters) : 200;
      bannerMessage = deadZone
        ? `Entering ${deadZone.name} in ~${dist} m. Offline map tiles cached automatically.`
        : `Entering low coverage zone in ~${dist} m. Offline map tiles cached automatically.`;
    }

    return {
      state,
      deadZone,
      distanceMeters,
      hasWarning: state !== 'safe',
      bannerTitle,
      bannerMessage,
    };
  }
}
