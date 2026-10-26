import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Helper math and formatters
function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDistanceMeters(p1, p2) {
  const R = 6371000;
  const dLat = degreesToRadians(p2.latitude - p1.latitude);
  const dLon = degreesToRadians(p2.longitude - p1.longitude);
  const lat1 = degreesToRadians(p1.latitude);
  const lat2 = degreesToRadians(p2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distanceMeters) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatDuration(durationSeconds) {
  const mins = Math.round(durationSeconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function getSafetyTier(safetyScore) {
  if (safetyScore >= 80) return 'safe';
  if (safetyScore >= 60) return 'moderate';
  return 'risky';
}

function getRouteColor(tier) {
  switch (tier) {
    case 'safe':
      return '#00C853';
    case 'moderate':
      return '#FFAB00';
    case 'risky':
      return '#FF1744';
  }
}

function getTierLabel(tier) {
  switch (tier) {
    case 'safe':
      return 'Safest Route';
    case 'moderate':
      return 'Moderate Risk';
    case 'risky':
      return 'High Risk Caution';
  }
}

// DeadZoneService
class DeadZoneService {
  constructor() {
    this.deadZones = [];
  }

  setDeadZones(zones) {
    this.deadZones = [...zones];
  }

  checkUserPosition(userLocation, warningThresholdMeters = 300) {
    if (this.deadZones.length === 0) {
      return { state: 'safe', hasWarning: false, bannerTitle: 'Cellular Network Operational' };
    }

    for (const zone of this.deadZones) {
      const d = calculateDistanceMeters(zone.center, userLocation);
      if (d <= zone.radiusMeters) {
        return {
          state: 'inside',
          deadZone: zone,
          distanceMeters: 0,
          hasWarning: true,
          bannerTitle: 'CRITICAL: Cellular Dead Zone Active',
          bannerMessage: `${zone.name}: Mobile internet & voice unavailable. Offline routing cached, SMS standby.`,
        };
      }
    }

    for (const zone of this.deadZones) {
      const d = calculateDistanceMeters(zone.center, userLocation);
      if (d > zone.radiusMeters && d <= zone.radiusMeters + warningThresholdMeters) {
        const dist = d - zone.radiusMeters;
        return {
          state: 'approaching',
          deadZone: zone,
          distanceMeters: dist,
          hasWarning: true,
          bannerTitle: 'WARNING: Approaching Low Network Zone',
          bannerMessage: `Entering ${zone.name} in ~${Math.round(dist)} m. Offline map tiles cached automatically.`,
        };
      }
    }

    return { state: 'safe', hasWarning: false, bannerTitle: 'Cellular Network Operational' };
  }
}

// LandmarksService
class LandmarksService {
  constructor() {
    this.landmarks = [];
  }

  setLandmarks(landmarks) {
    this.landmarks = [...landmarks];
  }

  filterByType(type) {
    return this.landmarks.filter((l) => l.type === type);
  }

  findNearestSafePlace(userLocation, options) {
    if (this.landmarks.length === 0) return null;

    const candidates = this.landmarks.filter((l) => {
      if (options?.filterType && l.type !== options.filterType) return false;
      if (options?.require24Hours && !l.isOpen24Hours) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    let nearest = null;
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
}

describe('SafeSafar React Native - DeadZoneService Tests', () => {
  let service;
  const mockDeadZones = [
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

  it('User inside dead zone triggers DeadZoneState.inside', () => {
    const insideLocation = { latitude: 21.0921, longitude: 72.7154 };
    const alert = service.checkUserPosition(insideLocation);

    assert.equal(alert.state, 'inside');
    assert.equal(alert.hasWarning, true);
    assert.equal(alert.deadZone?.name, 'Dumas Blind Spot');
    assert.ok(alert.bannerTitle.includes('CRITICAL'));
  });

  it('User approaching dead zone triggers DeadZoneState.approaching', () => {
    // Distance from (21.0921, 72.7154) to (21.0955, 72.7154) is ~378m, so > 300 and < 600
    const approachingLocation = { latitude: 21.0955, longitude: 72.7154 };
    const alert = service.checkUserPosition(approachingLocation, 300);

    assert.equal(alert.state, 'approaching');
    assert.equal(alert.hasWarning, true);
    assert.ok(alert.bannerTitle.includes('WARNING'));
  });

  it('User far away triggers DeadZoneState.safe', () => {
    const svnitLocation = { latitude: 21.1648, longitude: 72.7848 };
    const alert = service.checkUserPosition(svnitLocation);

    assert.equal(alert.state, 'safe');
    assert.equal(alert.hasWarning, false);
    assert.equal(alert.bannerTitle, 'Cellular Network Operational');
  });
});

describe('SafeSafar React Native - LandmarksService Tests', () => {
  let service;
  const mockLandmarks = [
    {
      id: 'pol_1',
      name: 'Umra Police Station',
      type: 'police',
      coordinates: { latitude: 21.1685, longitude: 72.7935 },
      address: 'Athwa Lines, Umra',
      phone: '+91 261 222 3444',
      isOpen24Hours: true,
      zone: 'Umra',
    },
    {
      id: 'hosp_1',
      name: 'New Civil Hospital',
      type: 'hospital',
      coordinates: { latitude: 21.1712, longitude: 72.8189 },
      address: 'Majura Gate',
      phone: '+91 261 224 4456',
      isOpen24Hours: true,
      zone: 'Majura',
    },
    {
      id: 'sch_1',
      name: 'SVNIT Surat',
      type: 'school',
      coordinates: { latitude: 21.1648, longitude: 72.7848 },
      address: 'Ichchhanath',
      phone: '+91 261 225 9571',
      isOpen24Hours: true,
      zone: 'SVNIT',
    },
  ];

  beforeEach(() => {
    service = new LandmarksService();
    service.setLandmarks(mockLandmarks);
  });

  it('Filter by type returns only matching landmarks', () => {
    const police = service.filterByType('police');
    assert.equal(police.length, 1);
    assert.equal(police[0].name, 'Umra Police Station');
  });

  it('findNearestSafePlace returns closest landmark accurately', () => {
    const userLoc = { latitude: 21.165, longitude: 72.785 };
    const nearest = service.findNearestSafePlace(userLoc);

    assert.ok(nearest !== null);
    assert.equal(nearest.landmark.name, 'SVNIT Surat');
    assert.ok(nearest.distanceMeters < 100);
  });

  it('findNearestSafePlace with filterType returns closest matching type', () => {
    const userLoc = { latitude: 21.165, longitude: 72.785 };
    const nearestPolice = service.findNearestSafePlace(userLoc, { filterType: 'police' });

    assert.ok(nearestPolice !== null);
    assert.equal(nearestPolice.landmark.type, 'police');
    assert.equal(nearestPolice.landmark.name, 'Umra Police Station');
  });
});

describe('SafeSafar React Native - RouteOption & Safety Tier Tests', () => {
  it('Route with score >= 80 classifies as SafetyTier safe', () => {
    const safeRoute = {
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
    assert.equal(tier, 'safe');
    assert.equal(getRouteColor(tier), '#00C853');
    assert.equal(getTierLabel(tier), 'Safest Route');
    assert.equal(formatDistance(safeRoute.distanceMeters), '5.2 km');
    assert.equal(formatDuration(safeRoute.durationSeconds), '12 min');
  });

  it('Route with score between 60 and 79 classifies as SafetyTier moderate', () => {
    const modRoute = {
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
    assert.equal(tier, 'moderate');
    assert.equal(getRouteColor(tier), '#FFAB00');
    assert.equal(getTierLabel(tier), 'Moderate Risk');
  });

  it('Route with score < 60 classifies as SafetyTier risky', () => {
    const riskyRoute = {
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
    assert.equal(tier, 'risky');
    assert.equal(getRouteColor(tier), '#FF1744');
    assert.equal(getTierLabel(tier), 'High Risk Caution');
    assert.equal(riskyRoute.isFastest, true);
    assert.equal(riskyRoute.dangerAlerts.length, 2);
  });
});

describe('SafeSafar React Native - GeocodingService & Search Tests', () => {
  it('Can search local Surat landmarks with query string', () => {
    const landmarks = JSON.parse(
      fs.readFileSync(new URL('../assets/data/surat_landmarks.json', import.meta.url), 'utf-8')
    );
    const query = 'adajan';
    const matches = landmarks.filter((l) => l.name.toLowerCase().includes(query));
    assert.ok(matches.length > 0, 'Should find Adajan landmarks');
  });

  it('Calculates accurate distance for search results relative to user origin', () => {
    const svnit = { latitude: 21.1648, longitude: 72.7848 };
    const adajan = { latitude: 21.1963, longitude: 72.7952 };
    const dist = calculateDistanceMeters(svnit, adajan);
    assert.ok(dist > 3000 && dist < 5000, `Expected ~3.6km, got ${dist}`);
    assert.equal(formatDistance(dist), `${(dist / 1000).toFixed(1)} km`);
  });
});

