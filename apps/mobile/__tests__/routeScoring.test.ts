import { RouteOption } from '../src/types';
import { getSafetyTier, getRouteColor, getTierLabel } from '../src/models/RouteOption';
import { formatDistance, formatDuration } from '../src/utils/geo';

describe('RouteOption & Safety Tier Tests', () => {
  test('Route with score >= 80 classifies as SafetyTier safe', () => {
    const safeRoute: RouteOption = {
      routeId: 'safe_1',
      name: 'Athwa Boulevard',
      safetyScore: 92,
      color: 'green',
      distanceMeters: 5200,
      durationSeconds: 720,
      isSafest: true,
      isFastest: false,
      safetyFactors: {
        lightingScore: 95,
        policeProximityScore: 90,
        incidentDecayScore: 94,
      },
      explanation: 'Well lit main road',
      dangerAlerts: [],
      coordinates: [
        { latitude: 21.1648, longitude: 72.7848 },
        { latitude: 21.1963, longitude: 72.7952 },
      ],
    };

    const tier = getSafetyTier(safeRoute.safetyScore);
    expect(tier).toBe('safe');
    expect(getRouteColor(tier)).toBe('#00C853');
    expect(getTierLabel(tier)).toBe('Safest Route');
    expect(formatDistance(safeRoute.distanceMeters)).toBe('5.2 km');
    expect(formatDuration(safeRoute.durationSeconds)).toBe('12 min');
  });

  test('Route with score between 60 and 79 classifies as SafetyTier moderate', () => {
    const modRoute: RouteOption = {
      routeId: 'mod_1',
      name: 'City Light Rd',
      safetyScore: 71,
      color: 'yellow',
      distanceMeters: 4800,
      durationSeconds: 660,
      isSafest: false,
      isFastest: false,
      safetyFactors: {
        lightingScore: 72,
        policeProximityScore: 68,
        incidentDecayScore: 75,
      },
      explanation: 'Moderate residential road',
      dangerAlerts: [],
      coordinates: [
        { latitude: 21.1648, longitude: 72.7848 },
        { latitude: 21.1963, longitude: 72.7952 },
      ],
    };

    const tier = getSafetyTier(modRoute.safetyScore);
    expect(tier).toBe('moderate');
    expect(getRouteColor(tier)).toBe('#FFAB00');
    expect(getTierLabel(tier)).toBe('Moderate Risk');
  });

  test('Route with score < 60 classifies as SafetyTier risky', () => {
    const riskyRoute: RouteOption = {
      routeId: 'risk_1',
      name: 'Canal Backroad',
      safetyScore: 41,
      color: 'red',
      distanceMeters: 4100,
      durationSeconds: 540,
      isSafest: false,
      isFastest: true,
      safetyFactors: {
        lightingScore: 30,
        policeProximityScore: 35,
        incidentDecayScore: 42,
      },
      explanation: '2 reports and low lighting near Adajan Gam',
      dangerAlerts: ['Pitch dark stretch', 'No police presence'],
      coordinates: [
        { latitude: 21.1648, longitude: 72.7848 },
        { latitude: 21.1963, longitude: 72.7952 },
      ],
    };

    const tier = getSafetyTier(riskyRoute.safetyScore);
    expect(tier).toBe('risky');
    expect(getRouteColor(tier)).toBe('#FF1744');
    expect(getTierLabel(tier)).toBe('High Risk Caution');
    expect(riskyRoute.isFastest).toBe(true);
    expect(riskyRoute.dangerAlerts.length).toBe(2);
  });
});
