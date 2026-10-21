const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Report, Landmark, LightPoint } = require('../models');
const { createRoutesRouter } = require('../routes.router');
const { encodePolyline } = require('../polyline');

describe('Safe Routes API - Explanations & Time of Day (routes.explanation.test.js)', () => {
  let mongoServer;
  let app;
  let fakeOrsClient;
  let injectedClock;

  const origin = [72.8311, 21.1702];
  const destination = [72.835, 21.175];

  const route1Coords = [
    [72.8311, 21.1702],
    [72.833, 21.1725],
    [72.835, 21.175]
  ];

  const fakeRoutes = [
    {
      distanceMeters: 550,
      durationSeconds: 380,
      polyline: encodePolyline(route1Coords),
      coordinates: route1Coords
    }
  ];

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

    fakeOrsClient = {
      getRoutes: jest.fn().mockResolvedValue(fakeRoutes)
    };

    // Injected clock default: 06:00 UTC = 11:30 IST (day)
    injectedClock = new Date('2026-10-20T06:00:00Z');

    app = express();
    app.use(express.json());
    app.use(
      '/routes',
      createRoutesRouter({
        orsClient: fakeOrsClient,
        now: () => injectedClock
      })
    );
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
    jest.clearAllMocks();
    fakeOrsClient.getRoutes.mockResolvedValue(fakeRoutes);
    injectedClock = new Date('2026-10-20T06:00:00Z');
  });

  test('every route has a non-empty explanation string and details is not exposed', async () => {
    const res = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.routes)).toBe(true);
    expect(res.body.data.routes.length).toBeGreaterThan(0);

    for (const route of res.body.data.routes) {
      expect(typeof route.explanation).toBe('string');
      expect(route.explanation.length).toBeGreaterThan(0);
      // details object must not be exposed in the response
      expect(route.details).toBeUndefined();
    }
  });

  test('data.timeOfDay is "night" for departureTime 2026-10-20T16:00:00Z and "day" for 2026-10-20T06:00:00Z', async () => {
    // 16:00 UTC + 5:30 = 21:30 IST -> night
    const resNight = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination },
        departureTime: '2026-10-20T16:00:00Z'
      });

    expect(resNight.status).toBe(200);
    expect(resNight.body.data.timeOfDay).toBe('night');
    expect(resNight.body.data.routes[0].explanation).toContain('Night-time:');

    // 06:00 UTC + 5:30 = 11:30 IST -> day
    const resDay = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination },
        departureTime: '2026-10-20T06:00:00Z'
      });

    expect(resDay.status).toBe(200);
    expect(resDay.body.data.timeOfDay).toBe('day');
    expect(resDay.body.data.routes[0].explanation).not.toContain('Night-time:');
  });

  test('the same seeded report gives a lower safetyScore at night than at day', async () => {
    const reportTime = new Date('2026-10-20T05:00:00Z');

    // Seed active report along route 1
    await Report.create({
      type: 'harassment',
      location: {
        type: 'Point',
        coordinates: [72.833, 21.1725]
      },
      reporterId: 'reporter-1',
      confirmations: [
        { userId: 'user-2', at: reportTime },
        { userId: 'user-3', at: reportTime }
      ],
      createdAt: reportTime
    });

    // Score during Day
    const resDay = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination },
        departureTime: '2026-10-20T06:00:00Z'
      });

    // Score during Night
    const resNight = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination },
        departureTime: '2026-10-20T16:00:00Z'
      });

    expect(resDay.status).toBe(200);
    expect(resNight.status).toBe(200);

    const dayScore = resDay.body.data.routes[0].safetyScore;
    const nightScore = resNight.body.data.routes[0].safetyScore;

    expect(nightScore).toBeLessThan(dayScore);
  });

  test('an invalid departureTime returns HTTP 400 with validation details', async () => {
    const res = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination },
        departureTime: 'invalid-date-string'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.some((d) => d.field.includes('departureTime'))).toBe(true);
  });

  test('omitting departureTime still returns 200 and uses the injected clock', async () => {
    // 1. Clock set to night: 16:00 UTC = 21:30 IST
    injectedClock = new Date('2026-10-20T16:00:00Z');

    const resNight = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination }
      });

    expect(resNight.status).toBe(200);
    expect(resNight.body.data.timeOfDay).toBe('night');

    // 2. Clock set to day: 06:00 UTC = 11:30 IST
    injectedClock = new Date('2026-10-20T06:00:00Z');

    const resDay = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination }
      });

    expect(resDay.status).toBe(200);
    expect(resDay.body.data.timeOfDay).toBe('day');
  });
});
