const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Report, Landmark, LightPoint } = require('../models');
const { createRoutesRouter } = require('../routes.router');
const { encodePolyline } = require('../polyline');

describe('Safe Routes API (POST /routes/safe)', () => {
  let mongoServer;
  let app;
  let fakeOrsClient;

  // Hand-made routes around Surat [72.8311, 21.1702]
  const origin = [72.8311, 21.1702];
  const destination = [72.835, 21.175];

  // Route 1: Direct route through origin (will receive a report in tests)
  const route1Coords = [
    [72.8311, 21.1702],
    [72.833, 21.1725],
    [72.835, 21.175]
  ];

  // Route 2: Detour via East (clean route, away from route 1's report)
  const route2Coords = [
    [72.8311, 21.1702],
    [72.845, 21.1725],
    [72.835, 21.175]
  ];

  // Route 3: Detour via West (clean route)
  const route3Coords = [
    [72.8311, 21.1702],
    [72.82, 21.1725],
    [72.835, 21.175]
  ];

  const defaultFakeRoutes = [
    {
      distanceMeters: 550,
      durationSeconds: 380, // Fastest
      polyline: encodePolyline(route1Coords),
      coordinates: route1Coords
    },
    {
      distanceMeters: 750,
      durationSeconds: 520,
      polyline: encodePolyline(route2Coords),
      coordinates: route2Coords
    },
    {
      distanceMeters: 900,
      durationSeconds: 640,
      polyline: encodePolyline(route3Coords),
      coordinates: route3Coords
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
      getRoutes: jest.fn().mockResolvedValue(defaultFakeRoutes)
    };

    app = express();
    app.use(express.json());
    app.use('/routes', createRoutesRouter({ orsClient: fakeOrsClient, now: () => new Date('2026-10-20T06:30:00Z') }));
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
    fakeOrsClient.getRoutes.mockResolvedValue(defaultFakeRoutes);
  });

  test('returns 200 with sorted routes, contract fields, color, and isFastest flag', async () => {
    const res = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.routes)).toBe(true);
    expect(res.body.data.routes.length).toBe(3);

    const routes = res.body.data.routes;

    // Verify contract fields on each route
    for (const route of routes) {
      expect(route).toHaveProperty('routeId');
      expect(typeof route.safetyScore).toBe('number');
      expect(['green', 'yellow', 'red']).toContain(route.color);
      expect(Number.isInteger(route.distanceMeters)).toBe(true);
      expect(Number.isInteger(route.durationSeconds)).toBe(true);
      expect(typeof route.polyline).toBe('string');
      expect(route.safetyFactors).toBeDefined();
      expect(Number.isInteger(route.safetyFactors.lightingScore)).toBe(true);
      expect(Number.isInteger(route.safetyFactors.policeProximityScore)).toBe(true);
      expect(Number.isInteger(route.safetyFactors.incidentDecayScore)).toBe(true);
      expect(typeof route.isFastest).toBe('boolean');
    }

    // Verify exactly one is fastest (the 380s route)
    const fastestRoutes = routes.filter((r) => r.isFastest);
    expect(fastestRoutes.length).toBe(1);
    expect(fastestRoutes[0].durationSeconds).toBe(380);

    // Verify sorted by safetyScore descending
    for (let i = 0; i < routes.length - 1; i++) {
      expect(routes[i].safetyScore).toBeGreaterThanOrEqual(routes[i + 1].safetyScore);
    }
  });

  test('a route passing a seeded active report scores lower and sorts below a clean route', async () => {
    const now = new Date();

    // Seed active report along the middle of route 1
    await Report.create({
      type: 'harassment',
      location: {
        type: 'Point',
        coordinates: [72.833, 21.1725]
      },
      reporterId: 'reporter-1',
      confirmations: [
        { userId: 'user-2', at: now },
        { userId: 'user-3', at: now }
      ],
      createdAt: now
    });

    const res = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination }
      });

    expect(res.status).toBe(200);
    const routes = res.body.data.routes;

    // Route 1 (hit by incident) should have an incident penalty
    const hitRoute = routes.find((r) => r.routeId === 'route_1');
    expect(hitRoute.safetyFactors.incidentDecayScore).toBe(85);

    // Clean routes (route_2, route_3) should have incident score 100
    const cleanRoute2 = routes.find((r) => r.routeId === 'route_2');
    expect(cleanRoute2.safetyFactors.incidentDecayScore).toBe(100);

    // Safest route at index 0 must NOT be route 1
    expect(routes[0].routeId).not.toBe('route_1');
    expect(routes[0].safetyScore).toBeGreaterThan(hitRoute.safetyScore);
  });

  test('returns 400 on missing or invalid coordinates, and on identical origin and destination', async () => {
    // Missing destination
    const resMissing = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin }
      });
    expect(resMissing.status).toBe(400);
    expect(resMissing.body.success).toBe(false);
    expect(resMissing.body.error).toBe('Validation failed');
    expect(Array.isArray(resMissing.body.details)).toBe(true);

    // Invalid coordinates out of latitude range
    const resInvalid = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: [72.8311, 21.1702] },
        destination: { coordinates: [72.8311, 150.0] } // Lat > 90
      });
    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.success).toBe(false);

    // Identical origin and destination
    const resIdentical = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: origin }
      });
    expect(resIdentical.status).toBe(400);
    expect(resIdentical.body.success).toBe(false);
    expect(resIdentical.body.error).toBe('Validation failed');
  });

  test('returns 502 when routing provider throws 502', async () => {
    const failingClient = {
      getRoutes: jest.fn().mockRejectedValue({
        statusCode: 502,
        message: 'Routing provider error'
      })
    };

    const failingApp = express();
    failingApp.use(express.json());
    failingApp.use('/routes', createRoutesRouter({ orsClient: failingClient, now: () => new Date('2026-10-20T06:30:00Z') }));

    const res = await request(failingApp)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination }
      });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Routing provider error');
  });

  test('returns 503 when routing provider throws 503', async () => {
    const busyClient = {
      getRoutes: jest.fn().mockRejectedValue({
        statusCode: 503,
        message: 'Routing service is busy, try again shortly'
      })
    };

    const busyApp = express();
    busyApp.use(express.json());
    busyApp.use('/routes', createRoutesRouter({ orsClient: busyClient, now: () => new Date('2026-10-20T06:30:00Z') }));

    const res = await request(busyApp)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination }
      });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Routing service is busy, try again shortly');
  });

  test('never leaks the API key string in any response', async () => {
    const testSecret = 'mock-super-secret-key-xyz-987';
    process.env.ORS_API_KEY = testSecret;

    const res = await request(app)
      .post('/routes/safe')
      .send({
        origin: { coordinates: origin },
        destination: { coordinates: destination }
      });

    const responseText = JSON.stringify(res.body);
    expect(responseText).not.toContain(testSecret);

    delete process.env.ORS_API_KEY;
  });
});
