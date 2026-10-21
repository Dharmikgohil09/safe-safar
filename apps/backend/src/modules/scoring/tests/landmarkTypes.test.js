/**
 * apps/backend/src/modules/scoring/tests/landmarkTypes.test.js
 *
 * Tests that scoreRoute correctly handles landmarks in TWO shapes:
 *   1. Original schema shape:  { name, category: 'police'|'hospital', location, source }
 *   2. Teammate OSM seed shape: { landmarkId, name, type: 'police'|..., location,
 *                                 address, phone, isOpen24Hours, zone, updatedAt }
 *      — this shape has NO "category" field.
 *
 * All landmark documents are inserted via Landmark.collection.insertMany so that
 * the teammate's shape is stored exactly as-is, bypassing Mongoose validation.
 */

'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Report, Landmark, LightPoint } = require('../models');
const { scoreRoute } = require('../routeScoring.service');
const { NEUTRAL_SCORE } = require('../constants');

describe('Landmark type-field compatibility (landmarkTypes.test.js)', () => {
  let mongoServer;

  // Test route: short 100 m line near [72.8311, 21.1702]
  const routeStart = [72.8311, 21.1702];
  const routeEnd   = [72.8311, 21.171]; // ~90 m north
  const testRoute  = [routeStart, routeEnd];

  // A coordinate right on the route start (distance ≈ 0 m)
  const onRouteCoord = [72.8311, 21.1702];

  // A coordinate far from the route (≈ 5 km away, well outside POLICE_MAX_DISTANCE_M = 1000 m)
  const farCoord = [72.8311, 21.22];

  // Fixed clock for determinism
  const FIXED_NOW = new Date('2026-10-20T06:00:00.000Z');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Ensure 2dsphere indexes exist – required for $geoWithin queries
    await Report.init();
    await Report.syncIndexes();
    await Landmark.init();
    await Landmark.syncIndexes();
    await LightPoint.init();
    await LightPoint.syncIndexes();
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Report.deleteMany({});
    await Landmark.deleteMany({});
    await LightPoint.deleteMany({});
  });

  // ── Helper: build a teammate-style landmark document ──────────────────────
  function makeTypeLandmark(overrides) {
    return {
      landmarkId: 'osm-1',
      name: 'Test Landmark',
      type: 'police',
      location: { type: 'Point', coordinates: onRouteCoord },
      address: '1 Main St',
      phone: '+91-0000000000',
      isOpen24Hours: true,
      zone: 'central',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      ...overrides
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Teammate shape – type: 'police'
  // ───────────────────────────────────────────────────────────────────────────
  test('type-style police landmark near route raises policeProximityScore above neutral', async () => {
    await Landmark.collection.insertMany([
      makeTypeLandmark({ name: 'Test Police', type: 'police', location: { type: 'Point', coordinates: onRouteCoord } })
    ]);

    const result = await scoreRoute(testRoute, { now: FIXED_NOW, timeOfDay: 'day' });

    expect(result.safetyFactors.policeProximityScore).toBeGreaterThan(NEUTRAL_SCORE);
    expect(result.details.landmarkDataAvailable).toBe(true);
    expect(result.details.nearestSafePlace).not.toBeNull();
    expect(result.details.nearestSafePlace.name).toBe('Test Police');
    expect(result.details.nearestSafePlace.category).toBe('police');
    expect(Number.isInteger(result.details.nearestSafePlace.distanceMeters)).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Teammate shape – type: 'hospital'
  // ───────────────────────────────────────────────────────────────────────────
  test('type-style hospital landmark near route raises policeProximityScore above neutral', async () => {
    await Landmark.collection.insertMany([
      makeTypeLandmark({ name: 'Test Hospital', type: 'hospital', location: { type: 'Point', coordinates: onRouteCoord } })
    ]);

    const result = await scoreRoute(testRoute, { now: FIXED_NOW, timeOfDay: 'day' });

    expect(result.safetyFactors.policeProximityScore).toBeGreaterThan(NEUTRAL_SCORE);
    expect(result.details.landmarkDataAvailable).toBe(true);
    expect(result.details.nearestSafePlace).not.toBeNull();
    expect(result.details.nearestSafePlace.name).toBe('Test Hospital');
    expect(result.details.nearestSafePlace.category).toBe('hospital');
    expect(Number.isInteger(result.details.nearestSafePlace.distanceMeters)).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Non-scoring types: pharmacy, school, shelter are ignored
  // ───────────────────────────────────────────────────────────────────────────
  test('type-style pharmacy landmark near route: policeProximityScore stays at neutral, landmarkDataAvailable false', async () => {
    await Landmark.collection.insertMany([
      makeTypeLandmark({ name: 'Nearby Pharmacy', type: 'pharmacy', location: { type: 'Point', coordinates: onRouteCoord } })
    ]);

    const result = await scoreRoute(testRoute, { now: FIXED_NOW, timeOfDay: 'day' });

    expect(result.safetyFactors.policeProximityScore).toBe(NEUTRAL_SCORE);
    expect(result.details.landmarkDataAvailable).toBe(false);
    expect(result.details.nearestSafePlace).toBeNull();
  });

  test('type-style school landmark near route: policeProximityScore stays at neutral, landmarkDataAvailable false', async () => {
    await Landmark.collection.insertMany([
      makeTypeLandmark({ name: 'Nearby School', type: 'school', location: { type: 'Point', coordinates: onRouteCoord } })
    ]);

    const result = await scoreRoute(testRoute, { now: FIXED_NOW, timeOfDay: 'day' });

    expect(result.safetyFactors.policeProximityScore).toBe(NEUTRAL_SCORE);
    expect(result.details.landmarkDataAvailable).toBe(false);
    expect(result.details.nearestSafePlace).toBeNull();
  });

  test('type-style shelter landmark near route: policeProximityScore stays at neutral, landmarkDataAvailable false', async () => {
    await Landmark.collection.insertMany([
      makeTypeLandmark({ name: 'Nearby Shelter', type: 'shelter', location: { type: 'Point', coordinates: onRouteCoord } })
    ]);

    const result = await scoreRoute(testRoute, { now: FIXED_NOW, timeOfDay: 'day' });

    expect(result.safetyFactors.policeProximityScore).toBe(NEUTRAL_SCORE);
    expect(result.details.landmarkDataAvailable).toBe(false);
    expect(result.details.nearestSafePlace).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Original category-style landmark still works
  // ───────────────────────────────────────────────────────────────────────────
  test('original category-style police landmark still works as before', async () => {
    // Use Landmark.create (goes through Mongoose) – original shape with 'category'
    await Landmark.create({
      name: 'Central Police Station',
      category: 'police',
      location: {
        type: 'Point',
        coordinates: onRouteCoord
      },
      source: 'osm'
    });

    const result = await scoreRoute(testRoute, { now: FIXED_NOW, timeOfDay: 'day' });

    expect(result.safetyFactors.policeProximityScore).toBeGreaterThan(NEUTRAL_SCORE);
    expect(result.safetyFactors.policeProximityScore).toBeGreaterThanOrEqual(90);
    expect(result.details.landmarkDataAvailable).toBe(true);
    expect(result.details.nearestSafePlace).not.toBeNull();
    expect(result.details.nearestSafePlace.name).toBe('Central Police Station');
    expect(result.details.nearestSafePlace.category).toBe('police');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Mix of both shapes: nearest one wins
  // ───────────────────────────────────────────────────────────────────────────
  test('mix of category-style and type-style: nearest landmark wins for nearestSafePlace', async () => {
    // Category-style hospital at the route start (≈ 0 m)
    await Landmark.create({
      name: 'Close Hospital',
      category: 'hospital',
      location: {
        type: 'Point',
        coordinates: onRouteCoord
      },
      source: 'osm'
    });

    // Type-style police at ~200 m north of the route
    const farNorthCoord = [72.8311, 21.1720]; // ~200 m north
    await Landmark.collection.insertMany([
      makeTypeLandmark({
        name: 'Far Police',
        type: 'police',
        location: { type: 'Point', coordinates: farNorthCoord }
      })
    ]);

    const result = await scoreRoute(testRoute, { now: FIXED_NOW, timeOfDay: 'day' });

    expect(result.details.landmarkDataAvailable).toBe(true);
    expect(result.details.nearestSafePlace).not.toBeNull();
    // The closest landmark to any sample is the hospital at 0 m
    expect(result.details.nearestSafePlace.name).toBe('Close Hospital');
    expect(result.details.nearestSafePlace.category).toBe('hospital');
    expect(result.safetyFactors.policeProximityScore).toBeGreaterThan(NEUTRAL_SCORE);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Far-away type-style police does not affect a route more than 1000 m away
  // ───────────────────────────────────────────────────────────────────────────
  test('a type-style police landmark > 1000 m away does not raise policeProximityScore', async () => {
    // Place a type-style police station ≈ 5 km north of the route
    await Landmark.collection.insertMany([
      makeTypeLandmark({
        name: 'Distant Police Post',
        type: 'police',
        location: { type: 'Point', coordinates: farCoord }
      })
    ]);

    const result = await scoreRoute(testRoute, { now: FIXED_NOW, timeOfDay: 'day' });

    // The padded bounding box is only POLICE_MAX_DISTANCE_M = 1000 m wide.
    // A landmark 5 km away is entirely outside the box, so it is never fetched.
    // → landmarkDataAvailable = false → neutral score rule applies.
    expect(result.details.landmarkDataAvailable).toBe(false);
    expect(result.details.nearestSafePlace).toBeNull();
    expect(result.safetyFactors.policeProximityScore).toBe(NEUTRAL_SCORE);
  });

});
