const request = require('supertest');
const app = require('../src/app');
const Trip = require('../src/models/trip.model');
const {
  createTrip,
  expireTripAtomically,
  expireOverdueTrips,
  registerTripExpiryHook,
  clearTripExpiryHooks
} = require('../src/modules/core/trips/trips.service');
const {
  startTripExpiryWorker,
  stopTripExpiryWorker,
  processOverdueTrips,
  isWorkerRunning
} = require('../src/modules/core/trips/tripExpiry.worker');
const { registerUser } = require('../src/modules/core/auth/auth.service');
const { setupTestDB } = require('./setup');

describe('Trip Expiration Worker & Reports Routing', () => {
  setupTestDB();

  let userToken;
  let userId;

  beforeEach(async () => {
    clearTripExpiryHooks();
    stopTripExpiryWorker();

    const authRes = await registerUser({
      phone: '+919876543210',
      name: 'Worker Test User',
      pin: '1234'
    });
    userToken = authRes.token;
    userId = authRes.user._id;
  });

  afterEach(() => {
    stopTripExpiryWorker();
    clearTripExpiryHooks();
  });

  describe('Reports Routing Fixes', () => {
    it('POST /routes/safe - calculates route placeholder', async () => {
      const res = await request(app)
        .post('/routes/safe')
        .send({
          origin: { coordinates: [72.84, 21.20] },
          destination: { coordinates: [72.75, 21.14] }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Satej scoring engine');
    });

    it('GET /reports - returns empty reports list', async () => {
      const res = await request(app).get('/reports');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /reports - creates a community incident report', async () => {
      const res = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'dark_street',
          location: { coordinates: [72.83, 21.18] },
          description: 'Street lights malfunctioning'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('dark_street');
      expect(res.body.data.reportId).toBeDefined();
    });

    it('POST /reports/:id/confirm - confirms a community report', async () => {
      const createRes = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'dark_street',
          location: { coordinates: [72.83, 21.18] },
          description: 'Street lights malfunctioning'
        });

      const reportId = createRes.body.data.reportId || createRes.body.data._id;

      const confirmer = await registerUser({
        phone: '+919876543299',
        name: 'Confirmer User',
        pin: '5678'
      });

      const res = await request(app)
        .post(`/reports/${reportId}/confirm`)
        .set('Authorization', `Bearer ${confirmer.token}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe(reportId);
      expect(res.body.data.confirmationsCount).toBe(1);
    });
  });

  describe('Trip Expiration Worker & Atomic State Transitions', () => {
    it('detects and expires overdue trips while ignoring unexpired trips', async () => {
      // 1. Create Trip 1: overdue
      const trip1 = await createTrip(userId, {
        origin: { address: 'A', coordinates: [72.84, 21.20] },
        destination: { address: 'B', coordinates: [72.75, 21.14] },
        estimatedDurationMinutes: 10
      });
      // Simulate overdue
      await Trip.findByIdAndUpdate(trip1.tripId, {
        deadlineAt: new Date(Date.now() - 60000)
      });

      // 2. Create Trip 2: still active and valid in future
      const trip2 = await createTrip(userId, {
        origin: { address: 'C', coordinates: [72.84, 21.20] },
        destination: { address: 'D', coordinates: [72.75, 21.14] },
        estimatedDurationMinutes: 60
      });

      // Execute worker cycle
      const sweepResult = await processOverdueTrips();

      expect(sweepResult.checked).toBe(1);
      expect(sweepResult.expired).toBe(1);

      // Verify Trip 1 is expired
      const updatedTrip1 = await Trip.findById(trip1.tripId);
      expect(updatedTrip1.status).toBe('expired');

      // Verify Trip 2 is still active
      const updatedTrip2 = await Trip.findById(trip2.tripId);
      expect(updatedTrip2.status).toBe('active');
    });

    it('prevents duplicate processing: concurrent transitions only execute once', async () => {
      const trip = await createTrip(userId, {
        origin: { address: 'A', coordinates: [72.84, 21.20] },
        destination: { address: 'B', coordinates: [72.75, 21.14] },
        estimatedDurationMinutes: 10
      });
      await Trip.findByIdAndUpdate(trip.tripId, {
        deadlineAt: new Date(Date.now() - 60000)
      });

      let hookInvocationCount = 0;
      registerTripExpiryHook(async (expiredTrip) => {
        hookInvocationCount++;
      });

      // Attempt 5 concurrent atomic expiry calls on the exact same trip
      const results = await Promise.all([
        expireTripAtomically(trip.tripId),
        expireTripAtomically(trip.tripId),
        expireTripAtomically(trip.tripId),
        expireTripAtomically(trip.tripId),
        expireTripAtomically(trip.tripId)
      ]);

      // Exactly ONE caller should succeed and return the document; others must return null
      const successfulTransitions = results.filter(r => r !== null);
      expect(successfulTransitions.length).toBe(1);
      expect(hookInvocationCount).toBe(1);
    });

    it('starts and stops worker cleanly without dangling timers', () => {
      expect(isWorkerRunning()).toBe(false);

      startTripExpiryWorker({ intervalMs: 1000 });
      expect(isWorkerRunning()).toBe(true);

      stopTripExpiryWorker();
      expect(isWorkerRunning()).toBe(false);
    });

    it('coordinates with SOS hooks safely without throwing unhandled exceptions', async () => {
      const trip = await createTrip(userId, {
        origin: { address: 'A', coordinates: [72.84, 21.20] },
        destination: { address: 'B', coordinates: [72.75, 21.14] },
        estimatedDurationMinutes: 10
      });
      await Trip.findByIdAndUpdate(trip.tripId, {
        deadlineAt: new Date(Date.now() - 60000)
      });

      const dispatchedAlerts = [];
      registerTripExpiryHook(async (expiredTrip) => {
        // Safe internal mock simulation of Kristal SOS hook
        dispatchedAlerts.push({
          tripId: expiredTrip._id.toString(),
          simulatedDispatches: ['sms_mock', 'telegram_mock']
        });
      });

      await processOverdueTrips();

      expect(dispatchedAlerts.length).toBe(1);
      expect(dispatchedAlerts[0].tripId).toBe(trip.tripId);
      expect(dispatchedAlerts[0].simulatedDispatches).toContain('sms_mock');
    });

    it('handles database query errors gracefully without crashing the process', async () => {
      // Mock Trip.find to reject once with simulated connection error
      const originalFind = Trip.find;
      Trip.find = jest.fn().mockImplementation(() => {
        throw new Error('Simulated transient MongoDB network failure');
      });

      const result = await processOverdueTrips();

      expect(result).toBeDefined();
      expect(result.error).toBe('Simulated transient MongoDB network failure');

      // Restore original find
      Trip.find = originalFind;
    });
  });
});
