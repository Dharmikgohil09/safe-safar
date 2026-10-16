import { DeadZoneService } from '../src/services/deadZoneService';
import { DeadZone, LatLng } from '../src/types';

describe('DeadZoneService Tests', () => {
  let service: DeadZoneService;

  const mockDeadZones: DeadZone[] = [
    {
      id: 'dz_test_1',
      name: 'Dumas Blind Spot',
      center: { latitude: 21.0921, longitude: 72.7154 },
      radiusMeters: 300,
      warningLevel: 'high',
      description: 'Mangrove cellular blind spot',
      carrierNotes: 'No coverage',
    },
  ];

  beforeEach(() => {
    service = new DeadZoneService();
    service.setDeadZones(mockDeadZones);
  });

  test('User inside dead zone triggers DeadZoneState inside', () => {
    // Coordinate right at the center of the dead zone
    const insideLocation: LatLng = { latitude: 21.0921, longitude: 72.7154 };
    const alert = service.checkUserPosition(insideLocation);

    expect(alert.state).toBe('inside');
    expect(alert.hasWarning).toBe(true);
    expect(alert.deadZone?.name).toBe('Dumas Blind Spot');
    expect(alert.bannerTitle).toContain('CRITICAL');
  });

  test('User approaching dead zone triggers DeadZoneState approaching', () => {
    // Coordinate ~155m away from center (inside is 300m, so let's test a coordinate slightly outside radius)
    // Distance from (21.0921, 72.7154) to (21.0955, 72.7154) is ~378m, so > 300 and < 600
    const approachingLocation: LatLng = { latitude: 21.0955, longitude: 72.7154 };
    const alert = service.checkUserPosition(approachingLocation, 300);

    expect(alert.state).toBe('approaching');
    expect(alert.hasWarning).toBe(true);
    expect(alert.bannerTitle).toContain('WARNING');
  });

  test('User far away triggers DeadZoneState safe', () => {
    // SVNIT coordinate is ~10km away
    const svnitLocation: LatLng = { latitude: 21.1648, longitude: 72.7848 };
    const alert = service.checkUserPosition(svnitLocation);

    expect(alert.state).toBe('safe');
    expect(alert.hasWarning).toBe(false);
    expect(alert.bannerTitle).toBe('Cellular Network Operational');
  });
});
