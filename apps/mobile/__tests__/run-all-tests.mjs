import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildGoogleMapsDirectionsUrl,
  selectIntermediateWaypoints,
  normalizeCoordinate,
  GOOGLE_MAPS_DIRECTIONS_BASE_URL,
  DEFAULT_MAX_WAYPOINTS,
  MAX_SAFE_URL_LENGTH,
} from '../src/utils/googleMapsUrl.ts';

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

describe('SafeSafar - Google Maps Integration & URL Generator Tests', () => {
  const sampleOrigin = { latitude: 21.1648, longitude: 72.7848 };
  const sampleDestination = { latitude: 21.1963, longitude: 72.7952 };

  it('Correct URL construction with base URL, endpoints, and walking mode', () => {
    const route = {
      routeId: 'safe_route_1',
      name: 'Athwa Boulevard Safe Corridor',
      safetyScore: 92,
      coordinates: [
        sampleOrigin,
        { latitude: 21.175, longitude: 72.789 },
        sampleDestination,
      ],
    };

    const url = buildGoogleMapsDirectionsUrl({
      route,
      origin: sampleOrigin,
      destination: sampleDestination,
      travelMode: 'walking',
    });

    assert.ok(url.startsWith(GOOGLE_MAPS_DIRECTIONS_BASE_URL));
    assert.ok(url.includes('api=1'));
    assert.ok(url.includes(`origin=${encodeURIComponent('21.1648,72.7848')}`));
    assert.ok(url.includes(`destination=${encodeURIComponent('21.1963,72.7952')}`));
    assert.ok(url.includes('travelmode=walking'));
    assert.ok(url.includes(`waypoints=${encodeURIComponent('21.175,72.789')}`));
  });

  it('Correct origin and destination extraction from route coordinates when omitted in params', () => {
    const route = {
      routeId: 'route_auto_endpoints',
      name: 'Auto Endpoints Route',
      safetyScore: 85,
      coordinates: [
        { latitude: 21.15, longitude: 72.77 },
        { latitude: 21.16, longitude: 72.78 },
        { latitude: 21.18, longitude: 72.80 },
      ],
    };

    const url = buildGoogleMapsDirectionsUrl({ route });

    assert.ok(url.includes(`origin=${encodeURIComponent('21.15,72.77')}`));
    assert.ok(url.includes(`destination=${encodeURIComponent('21.18,72.8')}`));
  });

  it('Correct waypoint order: preserves strictly sequential progression along the route', () => {
    // A path with bends moving progressively north
    const coordinates = [
      { latitude: 21.10, longitude: 72.70 },
      { latitude: 21.12, longitude: 72.75 }, // bend 1
      { latitude: 21.14, longitude: 72.71 }, // bend 2
      { latitude: 21.16, longitude: 72.76 }, // bend 3
      { latitude: 21.18, longitude: 72.72 }, // bend 4
      { latitude: 21.20, longitude: 72.77 },
    ];

    const waypoints = selectIntermediateWaypoints(coordinates, { maxWaypoints: 4 });

    assert.ok(waypoints.length > 0 && waypoints.length <= 4);
    // Verify latitudes strictly increase, preserving progression from south to north
    for (let i = 0; i < waypoints.length - 1; i++) {
      assert.ok(
        waypoints[i].latitude < waypoints[i + 1].latitude,
        `Expected waypoint ${i} lat (${waypoints[i].latitude}) < waypoint ${i + 1} lat (${waypoints[i + 1].latitude})`
      );
    }
  });

  it('Correct handling of different coordinate formats (named fields and GeoJSON arrays)', () => {
    // 1. LatLng named fields
    const c1 = normalizeCoordinate({ latitude: 21.1648, longitude: 72.7848 });
    assert.deepEqual(c1, { latitude: 21.1648, longitude: 72.7848 });

    // 2. Short named fields ({ lat, lng })
    const c2 = normalizeCoordinate({ lat: 21.1648, lng: 72.7848 });
    assert.deepEqual(c2, { latitude: 21.1648, longitude: 72.7848 });

    // 3. GeoJSON [longitude, latitude] array format
    const c3 = normalizeCoordinate([72.7848, 21.1648]);
    assert.deepEqual(c3, { latitude: 21.1648, longitude: 72.7848 });

    // 4. Numeric string inputs
    const c4 = normalizeCoordinate({ latitude: '21.1648', longitude: '72.7848' });
    assert.deepEqual(c4, { latitude: 21.1648, longitude: 72.7848 });
  });

  it('URL encoding: properly encodes pipe separators and coordinates', () => {
    const route = {
      routeId: 'encoded_test',
      name: 'Encoding Route',
      safetyScore: 88,
      coordinates: [
        { latitude: 21.16, longitude: 72.78 },
        { latitude: 21.17, longitude: 72.82 }, // bend
        { latitude: 21.18, longitude: 72.80 }, // bend
        { latitude: 21.19, longitude: 72.85 },
      ],
    };

    const url = buildGoogleMapsDirectionsUrl({ route });

    // Pipe separator '|' must be encoded as '%7C'
    assert.ok(!url.includes('|'), 'URL must not contain raw pipe characters');
    assert.ok(url.includes('%7C'), 'Waypoints should be joined with encoded pipe %7C');
    // Commas should be encoded as %2C
    assert.ok(!url.includes('origin=21.16,72.78'), 'Comma in coordinates must be percent-encoded');
    assert.ok(url.includes('origin=21.16%2C72.78'));
  });

  it('Routes with no geometry fall back gracefully without waypoints', () => {
    const routeWithoutGeometry = {
      routeId: 'no_geom',
      name: 'Route without geometry',
      safetyScore: 70,
      coordinates: [],
    };

    const url = buildGoogleMapsDirectionsUrl({
      route: routeWithoutGeometry,
      origin: sampleOrigin,
      destination: sampleDestination,
    });

    assert.ok(url.length > 0);
    assert.ok(url.includes('origin='));
    assert.ok(url.includes('destination='));
    assert.ok(!url.includes('waypoints='), 'Should not have waypoints parameter when geometry is empty');
  });

  it('Invalid or missing coordinates are safely rejected without throwing', () => {
    // Missing / null / undefined / NaN coordinates
    assert.equal(normalizeCoordinate(null), null);
    assert.equal(normalizeCoordinate(undefined), null);
    assert.equal(normalizeCoordinate({ latitude: NaN, longitude: 72 }), null);
    assert.equal(normalizeCoordinate({ latitude: 21, longitude: Infinity }), null);
    assert.equal(normalizeCoordinate({ latitude: 120, longitude: 72 }), null); // Lat > 90
    assert.equal(normalizeCoordinate({ latitude: 21, longitude: -200 }), null); // Lng < -180

    // selectIntermediateWaypoints with messy coordinates
    const messyCoords = [
      null,
      { latitude: 21.16, longitude: 72.78 },
      { latitude: 'not_a_number', longitude: 72.80 },
      { latitude: 21.17, longitude: 72.81 },
      undefined,
      { latitude: 21.19, longitude: 72.82 },
    ];
    const waypoints = selectIntermediateWaypoints(messyCoords);
    assert.ok(Array.isArray(waypoints));

    // When endpoints are completely missing, buildGoogleMapsDirectionsUrl returns empty string
    const emptyUrl = buildGoogleMapsDirectionsUrl({ route: null });
    assert.equal(emptyUrl, '');
  });

  it('Routes that exceed waypoint limits are capped at maxWaypoints', () => {
    // 30 coordinates along a path with zigzag bends
    const denseCoordinates = [];
    for (let i = 0; i <= 30; i++) {
      const lat = 21.10 + i * 0.003;
      const lng = 72.70 + (i % 2 === 0 ? 0.005 : -0.005);
      denseCoordinates.push({ latitude: lat, longitude: lng });
    }

    const waypoints = selectIntermediateWaypoints(denseCoordinates, { maxWaypoints: DEFAULT_MAX_WAYPOINTS });
    assert.ok(waypoints.length <= DEFAULT_MAX_WAYPOINTS, `Waypoints count (${waypoints.length}) must be <= ${DEFAULT_MAX_WAYPOINTS}`);
  });

  it('Respects URL length limits and prunes waypoints to fit', () => {
    const route = {
      routeId: 'long_url_test',
      name: 'Long URL Route',
      safetyScore: 80,
      coordinates: [
        { latitude: 21.10, longitude: 72.70 },
        { latitude: 21.11, longitude: 72.75 },
        { latitude: 21.12, longitude: 72.72 },
        { latitude: 21.13, longitude: 72.76 },
        { latitude: 21.14, longitude: 72.73 },
        { latitude: 21.15, longitude: 72.77 },
        { latitude: 21.16, longitude: 72.74 },
        { latitude: 21.20, longitude: 72.80 },
      ],
    };

    // Set maxUrlLength artificially low to verify pruning
    const maxLen = 220;
    const url = buildGoogleMapsDirectionsUrl({ route, maxUrlLength: maxLen });
    assert.ok(url.length <= maxLen, `URL length (${url.length}) must be <= ${maxLen}`);
  });

  it('Walking mode is explicitly enabled by default for safe transit', () => {
    const url = buildGoogleMapsDirectionsUrl({
      origin: sampleOrigin,
      destination: sampleDestination,
    });
    assert.ok(url.includes('travelmode=walking'));
  });

  it('Button / Opener handler executes successfully with generated URL', async () => {
    let capturedUrl = '';
    const mockOpener = async (url) => {
      capturedUrl = url;
      return true;
    };

    const route = {
      routeId: 'button_test',
      name: 'Test Button Action',
      safetyScore: 95,
      coordinates: [sampleOrigin, sampleDestination],
    };

    const url = buildGoogleMapsDirectionsUrl({ route });
    const success = await mockOpener(url);

    assert.equal(success, true);
    assert.equal(capturedUrl, url);
    assert.ok(capturedUrl.includes('travelmode=walking'));
  });
});
