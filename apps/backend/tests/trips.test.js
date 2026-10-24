const request = require('supertest');
const app = require('../src/app');
const Trip = require('../src/models/trip.model');
const { setupTestDB, createTestUser } = require('./setup');

describe('Walk Me Home Trips API', () => {
  setupTestDB();

  let userAToken;
  let userBToken;
  let contactId;

  const validTripPayload = {
    origin: {
      address: 'Surat Railway Station',
      coordinates: [72.8407, 21.2044]
    },
    destination: {
      address: 'VR Mall Surat',
      coordinates: [72.7565, 21.1442]
    },
    estimatedDurationMinutes: 30
  };

  beforeEach(async () => {
    const userA = await createTestUser({
      phone: '+919876543210',
      name: 'User A',
      pin: '1234'
    });
    userAToken = userA.token;

    const userB = await createTestUser({
      phone: '+919876543211',
      name: 'User B',
      pin: '5678'
    });
    userBToken = userB.token;

    const contactRes = await request(app)
      .post('/contacts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Emergency Mom', phone: '+919876543299' });
    contactId = contactRes.body.data._id;
  });

  describe('POST /trips', () => {
    it('creates an active trip with server-calculated deadline and trackingToken', async () => {
      const res = await request(app)
        .post('/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          ...validTripPayload,
          emergencyContactIds: [contactId]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tripId).toBeDefined();
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.trackingToken).toHaveLength(32);
      expect(res.body.data.deadlineAt).toBeDefined();
      expect(res.body.data.remainingSeconds).toBeGreaterThan(0);
      expect(res.body.data.emergencyContacts.length).toBe(1);
      expect(res.body.data.emergencyContacts[0].name).toBe('Emergency Mom');
    });

    it('rejects trip creation with invalid coordinates', async () => {
      const res = await request(app)
        .post('/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          ...validTripPayload,
          origin: {
            address: 'Invalid Coordinates',
            coordinates: [999, 999] // Out of range
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /trips/:id/checkin', () => {
    let tripId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(validTripPayload);
      tripId = res.body.data.tripId;
    });

    it('records check-in on active trip', async () => {
      const res = await request(app)
        .post(`/trips/${tripId}/checkin`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.lastCheckinAt).toBeDefined();
    });

    it('extends deadline when extendMinutes is supplied', async () => {
      const tripBefore = await Trip.findById(tripId);
      const initialDeadline = tripBefore.deadlineAt.getTime();

      const res = await request(app)
        .post(`/trips/${tripId}/checkin`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ extendMinutes: 15 });

      expect(res.status).toBe(200);
      const newDeadline = new Date(res.body.data.deadlineAt).getTime();
      expect(newDeadline).toBeGreaterThan(initialDeadline);
    });

    it('prevents another user from checking in (cross-user authorization)', async () => {
      const res = await request(app)
        .post(`/trips/${tripId}/checkin`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /trips/:id/arrived & State Transitions', () => {
    let tripId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(validTripPayload);
      tripId = res.body.data.tripId;
    });

    it('successfully marks active trip as arrived', async () => {
      const res = await request(app)
        .post(`/trips/${tripId}/arrived`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('arrived');
      expect(res.body.data.arrivedAt).toBeDefined();
    });

    it('rejects subsequent check-in once trip has arrived', async () => {
      // Arrive trip first
      await request(app)
        .post(`/trips/${tripId}/arrived`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Try checking in
      const res = await request(app)
        .post(`/trips/${tripId}/checkin`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Cannot check-in to a trip with status: arrived');
    });

    it('rejects marking an already arrived trip as arrived again', async () => {
      await request(app)
        .post(`/trips/${tripId}/arrived`)
        .set('Authorization', `Bearer ${userAToken}`);

      const res = await request(app)
        .post(`/trips/${tripId}/arrived`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /trips/track/:token (Live Tracker Web Integration)', () => {
    it('allows public access to trip status via unguessable trackingToken', async () => {
      const createRes = await request(app)
        .post('/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(validTripPayload);

      const { trackingToken } = createRes.body.data;

      const trackRes = await request(app).get(`/trips/track/${trackingToken}`);

      expect(trackRes.status).toBe(200);
      expect(trackRes.body.success).toBe(true);
      expect(trackRes.body.data.trackingToken).toBe(trackingToken);
      expect(trackRes.body.data.userName).toBe('User A');
      expect(trackRes.body.data.status).toBe('active');
    });

    it('returns 404 for invalid tracking token', async () => {
      const res = await request(app).get('/trips/track/nonexistent_fake_token_123456');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Server-managed Deadline & Expiry Logic', () => {
    it('transitions overdue active trip to expired upon check', async () => {
      const createRes = await request(app)
        .post('/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(validTripPayload);

      const { tripId } = createRes.body.data;

      // Manually simulate time travel by setting deadline in the past
      await Trip.findByIdAndUpdate(tripId, {
        deadlineAt: new Date(Date.now() - 60000) // 1 minute in the past
      });

      // Checking in should reconcile status to expired and reject
      const res = await request(app)
        .post(`/trips/${tripId}/checkin`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status: expired');

      const updated = await Trip.findById(tripId);
      expect(updated.status).toBe('expired');
    });
  });
});
