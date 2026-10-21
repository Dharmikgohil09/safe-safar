const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Report, Landmark, LightPoint } = require('../models');
const { createReportsRouter } = require('../reports.router');
const { createRoutesRouter } = require('../routes.router');
const { encodePolyline } = require('../polyline');

describe('Mobile App Contract Integration Tests (integration.contract.test.js)', () => {
  let mongoServer;
  let app;
  let fakeOrsClient;

  // Fake auth middleware reading user ID from x-test-user header
  const fakeRequireAuth = (req, res, next) => {
    const userId = req.headers['x-test-user'];
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: missing x-test-user header'
      });
    }
    req.user = { _id: String(userId), phone: '9999999999', name: 'Test User' };
    next();
  };

  const origin = [72.8311, 21.1702];
  const destination = [72.835, 21.175];

  const route1Coords = [
    [72.8311, 21.1702],
    [72.833, 21.1725],
    [72.835, 21.175]
  ];

  const route2Coords = [
    [72.8311, 21.1702],
    [72.845, 21.1725],
    [72.835, 21.175]
  ];

  const defaultFakeRoutes = [
    {
      distanceMeters: 550,
      durationSeconds: 380,
      polyline: encodePolyline(route1Coords),
      coordinates: route1Coords
    },
    {
      distanceMeters: 750,
      durationSeconds: 520,
      polyline: encodePolyline(route2Coords),
      coordinates: route2Coords
    }
  ];

  const fixedClock = () => new Date('2026-10-20T06:30:00Z');

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
    app.use('/reports', createReportsRouter({ requireAuth: fakeRequireAuth }));
    app.use(
      '/routes',
      createRoutesRouter({ orsClient: fakeOrsClient, now: fixedClock })
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
    fakeOrsClient.getRoutes.mockResolvedValue(defaultFakeRoutes);
  });

  describe('Reports Contract: mobile-consumed fields & new types', () => {
    test('GET /reports returns mobile fields (id, coordinates, confirmations, verified) and preserves existing fields', async () => {
      const now = new Date();
      const created = await Report.create({
        type: 'dark_street',
        location: {
          type: 'Point',
          coordinates: [72.8315, 21.1705]
        },
        note: 'Broken streetlight on corner',
        reporterId: 'user-reporter-1',
        confirmations: [
          { userId: 'user-c1', at: now },
          { userId: 'user-c2', at: now }
        ],
        createdAt: now
      });

      const res = await request(app).get('/reports');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);

      const report = res.body.data[0];

      // Added fields parsed by parseIncidentReport on mobile
      expect(report.id).toBe(created._id.toString());
      expect(report.coordinates).toEqual([72.8315, 21.1705]);
      expect(report.confirmations).toBe(2);
      expect(report.verified).toBe(true);

      // Preserved fields
      expect(report._id).toBe(created._id.toString());
      expect(report.type).toBe('dark_street');
      expect(report.description).toBe('Broken streetlight on corner');
      expect(report.location).toEqual({
        type: 'Point',
        coordinates: [72.8315, 21.1705]
      });
      expect(report.confirmationCount).toBe(2);
      expect(report.isActive).toBe(true);
      expect(typeof report.weight).toBe('number');
      expect(report.createdAt).toBeDefined();
    });

    test('POST /reports accepts isolated_path and suspicious types (201) and rejects unknown types (400)', async () => {
      // 1. isolated_path
      const resIsolated = await request(app)
        .post('/reports')
        .set('x-test-user', 'user-1')
        .send({
          type: 'isolated_path',
          location: { coordinates: [72.8311, 21.1702] },
          description: 'Dark alleyway with overgrown bushes'
        });

      expect(resIsolated.status).toBe(201);
      expect(resIsolated.body.success).toBe(true);
      expect(resIsolated.body.data.type).toBe('isolated_path');
      expect(resIsolated.body.data.id).toBeDefined();
      expect(resIsolated.body.data.coordinates).toEqual([72.8311, 21.1702]);

      // 2. suspicious
      const resSuspicious = await request(app)
        .post('/reports')
        .set('x-test-user', 'user-1')
        .send({
          type: 'suspicious',
          location: { coordinates: [72.832, 21.171] },
          description: 'Suspicious vehicle parked'
        });

      expect(resSuspicious.status).toBe(201);
      expect(resSuspicious.body.success).toBe(true);
      expect(resSuspicious.body.data.type).toBe('suspicious');
      expect(resSuspicious.body.data.id).toBeDefined();
      expect(resSuspicious.body.data.coordinates).toEqual([72.832, 21.171]);

      // 3. unknown type rejected with 400
      const resUnknown = await request(app)
        .post('/reports')
        .set('x-test-user', 'user-1')
        .send({
          type: 'flooding',
          location: { coordinates: [72.832, 21.171] }
        });

      expect(resUnknown.status).toBe(400);
      expect(resUnknown.body.success).toBe(false);
      expect(resUnknown.body.error).toBe('Validation failed');
    });
  });

  describe('Routes Contract: mobile-consumed fields (coordinates array, isSafest flag)', () => {
    test('POST /routes/safe returns coordinates array, polyline string, and exactly one route with isSafest true', async () => {
      const res = await request(app)
        .post('/routes/safe')
        .send({
          origin: { coordinates: origin },
          destination: { coordinates: destination }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.routes)).toBe(true);
      expect(res.body.data.routes.length).toBe(2);

      const routes = res.body.data.routes;

      for (const route of routes) {
        // coordinates array containing [lng, lat] pairs with length > 1
        expect(Array.isArray(route.coordinates)).toBe(true);
        expect(route.coordinates.length).toBeGreaterThan(1);
        for (const coord of route.coordinates) {
          expect(Array.isArray(coord)).toBe(true);
          expect(coord.length).toBe(2);
          expect(typeof coord[0]).toBe('number');
          expect(typeof coord[1]).toBe('number');
        }

        // polyline string
        expect(typeof route.polyline).toBe('string');
        expect(route.polyline.length).toBeGreaterThan(0);

        // isSafest flag boolean
        expect(typeof route.isSafest).toBe('boolean');

        // isFastest flag preserved
        expect(typeof route.isFastest).toBe('boolean');
      }

      // Exactly one route has isSafest === true (the first route after sorting)
      const safestRoutes = routes.filter((r) => r.isSafest);
      expect(safestRoutes.length).toBe(1);
      expect(routes[0].isSafest).toBe(true);
      expect(routes[1].isSafest).toBe(false);

      // Same sorting order preserved (highest safetyScore first, tie broken by durationSeconds)
      for (let i = 0; i < routes.length - 1; i++) {
        expect(routes[i].safetyScore).toBeGreaterThanOrEqual(routes[i + 1].safetyScore);
      }
    });
  });
});
