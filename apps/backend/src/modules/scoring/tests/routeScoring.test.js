const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Report, Landmark, LightPoint } = require('../models');
const { scoreRoute, colorForScore } = require('../routeScoring.service');
const { samplePath } = require('../geo');
const { NEUTRAL_SCORE, COLOR_THRESHOLDS } = require('../constants');

describe('Route Scoring Engine (routeScoring.service)', () => {
  let mongoServer;

  // Standard test route: straight line in Surat (~500m north)
  const start = [72.8311, 21.1702];
  const dLat500m = (500 / 6371000) * (180 / Math.PI);
  const end = [72.8311, 21.1702 + dLat500m];
  const testRoute = [start, end];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Build 2dsphere indexes for geospatial queries
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

  test('empty database gives neutral lighting and police scores and incident score 100', async () => {
    const result = await scoreRoute(testRoute);

    expect(result.sampleCount).toBeGreaterThan(1);
    expect(result.safetyFactors.incidentDecayScore).toBe(100);
    expect(result.safetyFactors.lightingScore).toBe(NEUTRAL_SCORE);
    expect(result.safetyFactors.policeProximityScore).toBe(NEUTRAL_SCORE);

    // 0.4 * 100 + 0.35 * 50 + 0.25 * 50 = 40 + 17.5 + 12.5 = 70
    expect(result.safetyScore).toBe(70);
    expect(result.color).toBe('green');
  });

  test('an active report on the route lowers incidentDecayScore', async () => {
    const now = new Date();

    // Active report: >= 2 distinct non-reporter confirmations
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

    const result = await scoreRoute(testRoute, { now });

    // Penalty = 1.0 * 15 = 15; score = 100 - 15 = 85
    expect(result.safetyFactors.incidentDecayScore).toBe(85);
    expect(result.safetyScore).toBeLessThan(70);
  });

  test('a pending report (fewer than 2 confirmations) is ignored', async () => {
    const now = new Date();

    // Pending report: only 1 confirmation (< MIN_CONFIRMATIONS)
    await Report.create({
      type: 'dark_street',
      location: {
        type: 'Point',
        coordinates: [72.8311, 21.1702]
      },
      reporterId: 'reporter-1',
      confirmations: [{ userId: 'user-2', at: now }],
      createdAt: now
    });

    const result = await scoreRoute(testRoute, { now });

    // Pending report must not penalize the route
    expect(result.safetyFactors.incidentDecayScore).toBe(100);
    expect(result.safetyScore).toBe(70);
  });

  test('a report 7 days old penalises about half as much as a fresh one', async () => {
    const now = new Date();

    // Create fresh active report on the route
    const report = await Report.create({
      type: 'isolated',
      location: {
        type: 'Point',
        coordinates: [72.8311, 21.1702]
      },
      reporterId: 'reporter-1',
      confirmations: [
        { userId: 'user-2', at: now },
        { userId: 'user-3', at: now }
      ]
    });

    const freshResult = await scoreRoute(testRoute, { now });
    const freshPenalty = 100 - freshResult.safetyFactors.incidentDecayScore;
    expect(freshPenalty).toBeCloseTo(15, 1);

    // Set createdAt through Report.collection.updateOne to bypass Mongoose timestamp overwrite
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    await Report.collection.updateOne(
      { _id: report._id },
      { $set: { createdAt: sevenDaysAgo } }
    );

    const oldResult = await scoreRoute(testRoute, { now });
    const oldPenalty = 100 - oldResult.safetyFactors.incidentDecayScore;

    // Weight after 7 days is 0.5 -> penalty ~ 7.5 (half of 15)
    expect(oldPenalty).toBeCloseTo(freshPenalty / 2, 1);
  });

  test('a report far from the route is ignored', async () => {
    const now = new Date();

    // Report ~5 km north of the route (well outside REPORT_RADIUS_M of 100m)
    const farCoord = [72.8311, 21.22];
    await Report.create({
      type: 'unsafe_crowd',
      location: {
        type: 'Point',
        coordinates: farCoord
      },
      reporterId: 'reporter-1',
      confirmations: [
        { userId: 'user-2', at: now },
        { userId: 'user-3', at: now }
      ],
      createdAt: now
    });

    const result = await scoreRoute(testRoute, { now });
    expect(result.safetyFactors.incidentDecayScore).toBe(100);
  });

  test('the same report near several samples counts once', async () => {
    const now = new Date();

    // Report placed midway along the route, within 100m of multiple sample points
    const midPoint = [72.8311, 21.1702 + dLat500m / 2];
    await Report.create({
      type: 'dark_street',
      location: {
        type: 'Point',
        coordinates: midPoint
      },
      reporterId: 'reporter-1',
      confirmations: [
        { userId: 'user-2', at: now },
        { userId: 'user-3', at: now }
      ],
      createdAt: now
    });

    const result = await scoreRoute(testRoute, { now });

    // Must be penalized exactly once (15 points), not once per sample
    expect(result.safetyFactors.incidentDecayScore).toBe(85);
  });

  test('light points along the route raise lightingScore', async () => {
    // Generate light points at all sample locations along the route
    const samples = samplePath(testRoute, 50);
    for (const pt of samples) {
      await LightPoint.create({
        location: {
          type: 'Point',
          coordinates: pt
        },
        status: 'active'
      });
    }

    const result = await scoreRoute(testRoute);

    // With every sample illuminated, lightingScore is 100
    expect(result.safetyFactors.lightingScore).toBe(100);
    expect(result.safetyFactors.lightingScore).toBeGreaterThan(NEUTRAL_SCORE);
  });

  test('a police station near the route raises policeProximityScore', async () => {
    // Short 100m route
    const shortRoute = [
      [72.8311, 21.1702],
      [72.8311, 21.171]
    ];

    // Place a police station very close to the start of the route (~10m away)
    await Landmark.create({
      name: 'Central Police Station',
      category: 'police',
      location: {
        type: 'Point',
        coordinates: [72.8311, 21.1702]
      }
    });

    const result = await scoreRoute(shortRoute);

    // Score must be higher than the neutral 50
    expect(result.safetyFactors.policeProximityScore).toBeGreaterThan(50);
    expect(result.safetyFactors.policeProximityScore).toBeGreaterThanOrEqual(90);
  });

  test('colorForScore thresholds at 70 and 40', () => {
    expect(colorForScore(100)).toBe('green');
    expect(colorForScore(70)).toBe('green');
    expect(colorForScore(COLOR_THRESHOLDS.green)).toBe('green');

    expect(colorForScore(69.9)).toBe('yellow');
    expect(colorForScore(55)).toBe('yellow');
    expect(colorForScore(40)).toBe('yellow');
    expect(colorForScore(COLOR_THRESHOLDS.yellow)).toBe('yellow');

    expect(colorForScore(39.9)).toBe('red');
    expect(colorForScore(20)).toBe('red');
    expect(colorForScore(0)).toBe('red');
    expect(colorForScore(-10)).toBe('red');
  });
});
