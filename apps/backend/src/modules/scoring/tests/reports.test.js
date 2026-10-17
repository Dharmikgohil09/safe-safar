const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Report } = require('../models');
const { createReportsRouter } = require('../reports.router');

describe('Reports API (/reports)', () => {
  let mongoServer;
  let app;

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

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Ensure 2dsphere index is built before geospatial queries
    await Report.init();
    await Report.syncIndexes();

    app = express();
    app.use(express.json());
    app.use('/reports', createReportsRouter({ requireAuth: fakeRequireAuth }));
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Report.deleteMany({});
  });

  describe('POST /reports', () => {
    test('creates report successfully and returns 201 with DTO', async () => {
      const payload = {
        type: 'dark_street',
        location: {
          coordinates: [72.8311, 21.1702] // [lng, lat] Surat
        },
        description: 'Street lights broken near main road'
      };

      const res = await request(app)
        .post('/reports')
        .set('x-test-user', 'user-reporter-1')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Report submitted');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.type).toBe('dark_street');
      expect(res.body.data.description).toBe('Street lights broken near main road');
      expect(res.body.data.confirmationCount).toBe(0);
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.data.weight).toBeCloseTo(1.0, 3);
      expect(res.body.data.location.coordinates).toEqual([72.8311, 21.1702]);

      // DB check
      const doc = await Report.findById(res.body.data._id);
      expect(doc).not.toBeNull();
      expect(doc.reporterId).toBe('user-reporter-1');
      expect(doc.note).toBe('Street lights broken near main road');
    });

    test('returns 400 when validation fails on coordinates or type', async () => {
      const invalidPayload = {
        type: 'invalid_type',
        location: {
          coordinates: [200, 100] // Out of range
        }
      };

      const res = await request(app)
        .post('/reports')
        .set('x-test-user', 'user-reporter-1')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(Array.isArray(res.body.details)).toBe(true);
      expect(res.body.details.length).toBeGreaterThanOrEqual(1);
    });

    test('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/reports')
        .send({
          type: 'dark_street',
          location: { coordinates: [72.83, 21.17] }
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /reports/:id/confirm', () => {
    let reportId;

    beforeEach(async () => {
      const created = await Report.create({
        type: 'dark_street',
        location: { type: 'Point', coordinates: [72.8311, 21.1702] },
        note: 'Broken light',
        reporterId: 'user-reporter-1',
        confirmations: []
      });
      reportId = created._id.toString();
    });

    test('confirms report successfully and returns 200', async () => {
      const res = await request(app)
        .post(`/reports/${reportId}/confirm`)
        .set('x-test-user', 'user-confirmer-1')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Report confirmed');
      expect(res.body.data._id).toBe(reportId);
      expect(res.body.data.confirmationCount).toBe(1);
      expect(res.body.data.isActive).toBe(false); // Needs 2 confirmations

      // Confirm with a second distinct user
      const res2 = await request(app)
        .post(`/reports/${reportId}/confirm`)
        .set('x-test-user', 'user-confirmer-2')
        .send();

      expect(res2.status).toBe(200);
      expect(res2.body.data.confirmationCount).toBe(2);
      expect(res2.body.data.isActive).toBe(true); // Active now!
    });

    test('returns 403 when confirming own report', async () => {
      const res = await request(app)
        .post(`/reports/${reportId}/confirm`)
        .set('x-test-user', 'user-reporter-1')
        .send();

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('You cannot confirm your own report');
    });

    test('returns 409 when user already confirmed the report', async () => {
      // First confirmation
      await request(app)
        .post(`/reports/${reportId}/confirm`)
        .set('x-test-user', 'user-confirmer-1')
        .send();

      // Duplicate confirmation
      const res = await request(app)
        .post(`/reports/${reportId}/confirm`)
        .set('x-test-user', 'user-confirmer-1')
        .send();

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('You have already confirmed this report');
    });

    test('returns 404 for unknown report id', async () => {
      const unknownId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/reports/${unknownId}/confirm`)
        .set('x-test-user', 'user-confirmer-1')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Report not found');
    });

    test('returns 400 for invalid non-hex ObjectId param', async () => {
      const res = await request(app)
        .post('/reports/not-a-valid-id/confirm')
        .set('x-test-user', 'user-confirmer-1')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('GET /reports', () => {
    let activeReportId;
    let pendingReportId;

    beforeEach(async () => {
      // Create pending report (0 confirmations)
      const p = await Report.create({
        type: 'isolated',
        location: { type: 'Point', coordinates: [72.8311, 21.1702] },
        note: 'Pending report',
        reporterId: 'user-reporter-1',
        confirmations: []
      });
      pendingReportId = p._id.toString();

      // Create active report (2 distinct confirmations)
      const a = await Report.create({
        type: 'dark_street',
        location: { type: 'Point', coordinates: [72.8315, 21.1705] },
        note: 'Active dark street report',
        reporterId: 'user-reporter-2',
        confirmations: [
          { userId: 'user-c1', at: new Date() },
          { userId: 'user-c2', at: new Date() }
        ]
      });
      activeReportId = a._id.toString();
    });

    test('returns only active reports by default (count = 1)', async () => {
      const res = await request(app).get('/reports');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(activeReportId);
      expect(res.body.data[0].isActive).toBe(true);
    });

    test('returns pending report after receiving 2 confirmations from different users', async () => {
      // First confirmation -> still pending
      await request(app)
        .post(`/reports/${pendingReportId}/confirm`)
        .set('x-test-user', 'user-c1')
        .send();

      let res = await request(app).get('/reports');
      expect(res.body.count).toBe(1);

      // Second confirmation -> becomes active
      await request(app)
        .post(`/reports/${pendingReportId}/confirm`)
        .set('x-test-user', 'user-c2')
        .send();

      res = await request(app).get('/reports');
      expect(res.body.count).toBe(2);
    });

    test('returns both pending and active reports when includePending=true', async () => {
      const res = await request(app).get('/reports?includePending=true');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      const ids = res.body.data.map((r) => r._id);
      expect(ids).toContain(activeReportId);
      expect(ids).toContain(pendingReportId);
    });

    test('filters with near and radius correctly using $geoNear', async () => {
      // Point within 100 meters
      const resNear = await request(app).get(
        '/reports?near=72.8315,21.1705&radius=500'
      );
      expect(resNear.status).toBe(200);
      expect(resNear.body.count).toBe(1);
      expect(resNear.body.data[0]._id).toBe(activeReportId);
      expect(typeof resNear.body.data[0].distanceMeters).toBe('number');

      // Point far away (e.g. Mumbai ~250km away) with radius 1000m
      const resFar = await request(app).get(
        '/reports?near=72.8777,19.0760&radius=1000'
      );
      expect(resFar.status).toBe(200);
      expect(resFar.body.count).toBe(0);
    });

    test('calculates lower decay weight for an older report (7 days old)', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await Report.updateOne({ _id: activeReportId }, { $set: { createdAt: sevenDaysAgo } });

      const res = await request(app).get('/reports');
      expect(res.status).toBe(200);
      expect(res.body.data[0]._id).toBe(activeReportId);
      expect(res.body.data[0].weight).toBeCloseTo(0.5, 2);
    });
  });
});
