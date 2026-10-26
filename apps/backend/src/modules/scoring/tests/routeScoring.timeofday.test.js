const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Report, Landmark, LightPoint } = require('../models');
const { scoreRoute } = require('../routeScoring.service');
const { samplePath } = require('../geo');

describe('Route Scoring Engine - Time of Day & Details (routeScoring.timeofday.test.js)', () => {
  let mongoServer;

  // Test route: ~500m straight line in Surat
  const start = [72.8311, 21.1702];
  const dLat500m = (500 / 6371000) * (180 / Math.PI);
  const end = [72.8311, 21.1702 + dLat500m];
  const testRoute = [start, end];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

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

  test('the night score is lower than the day score with an active incident report', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');

    // Create an active report right at the route start
    const report = await Report.create({
      type: 'harassment',
      location: {
        type: 'Point',
        coordinates: [72.8311, 21.1702]
      },
      reporterId: 'reporter-1',
      confirmations: [
        { userId: 'user-2', at: now },
        { userId: 'user-3', at: now }
      ],
      createdAt: now
    });

    // Ensure createdAt is explicitly synced
    await Report.collection.updateOne(
      { _id: report._id },
      { $set: { createdAt: now } }
    );

    const dayResult = await scoreRoute(testRoute, { now, timeOfDay: 'day' });
    const nightResult = await scoreRoute(testRoute, { now, timeOfDay: 'night' });

    // Day: penaltyMultiplier 1.0 (penalty 15 -> incidentDecayScore 85)
    // Night: penaltyMultiplier 1.5 (penalty 22.5 -> incidentDecayScore 77.5)
    expect(dayResult.safetyFactors.incidentDecayScore).toBe(85);
    expect(nightResult.safetyFactors.incidentDecayScore).toBe(77.5);

    // Night score must be strictly lower than day score
    expect(nightResult.safetyScore).toBeLessThan(dayResult.safetyScore);
    expect(nightResult.timeOfDay).toBe('night');
    expect(dayResult.timeOfDay).toBe('day');
  });

  test('details object correctly captures activeReportCount, litSamplePercent, and nearestSafePlace', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');

    // 1. Seed 1 active report near route and 1 far away (>5 km north)
    await Report.create({
      type: 'harassment',
      location: {
        type: 'Point',
        coordinates: [72.8311, 21.1702]
      },
      reporterId: 'reporter-1',
      confirmations: [
        { userId: 'user-2', at: now },
        { userId: 'user-3', at: now }
      ],
      createdAt: now
    });

    await Report.create({
      type: 'dark_street',
      location: {
        type: 'Point',
        coordinates: [72.8311, 21.25] // Far away
      },
      reporterId: 'reporter-4',
      confirmations: [
        { userId: 'user-5', at: now },
        { userId: 'user-6', at: now }
      ],
      createdAt: now
    });

    // 2. Seed LightPoints along some sample points
    const samples = samplePath(testRoute, 50);
    // Light up only the first 2 samples
    for (let i = 0; i < 2; i++) {
      await LightPoint.create({
        location: {
          type: 'Point',
          coordinates: samples[i]
        },
        status: 'active'
      });
    }

    // 3. Seed nearest safe place (Police station ~20m from start)
    await Landmark.create({
      name: 'Central Kotwali Police Station',
      category: 'police',
      location: {
        type: 'Point',
        coordinates: [72.8311, 21.1704]
      }
    });

    const result = await scoreRoute(testRoute, { now, timeOfDay: 'evening' });

    expect(result.details).toBeDefined();
    // Only 1 report is within REPORT_RADIUS_M of route samples
    expect(result.details.activeReportCount).toBe(1);

    // Lighting coverage
    expect(result.details.lightingDataAvailable).toBe(true);
    expect(typeof result.details.litSamplePercent).toBe('number');
    expect(result.details.litSamplePercent).toBeGreaterThan(0);
    expect(result.details.litSamplePercent).toBeLessThan(100);

    // Nearest safe place landmark
    expect(result.details.landmarkDataAvailable).toBe(true);
    expect(result.details.nearestSafePlace).toBeDefined();
    expect(result.details.nearestSafePlace.name).toBe('Central Kotwali Police Station');
    expect(result.details.nearestSafePlace.category).toBe('police');
    expect(typeof result.details.nearestSafePlace.distanceMeters).toBe('number');
    expect(result.details.nearestSafePlace.distanceMeters).toBeGreaterThan(0);
  });

  test('calling scoreRoute with no timeOfDay option returns identical safetyScore as timeOfDay "day"', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');

    // Create an active report
    await Report.create({
      type: 'harassment',
      location: {
        type: 'Point',
        coordinates: [72.8311, 21.1702]
      },
      reporterId: 'reporter-1',
      confirmations: [
        { userId: 'user-2', at: now },
        { userId: 'user-3', at: now }
      ],
      createdAt: now
    });

    const defaultResult = await scoreRoute(testRoute, { now });
    const dayResult = await scoreRoute(testRoute, { now, timeOfDay: 'day' });

    expect(defaultResult.safetyScore).toBe(dayResult.safetyScore);
    expect(defaultResult.color).toBe(dayResult.color);
    expect(defaultResult.timeOfDay).toBe('day');
    expect(defaultResult.safetyFactors).toEqual(dayResult.safetyFactors);
  });
});
