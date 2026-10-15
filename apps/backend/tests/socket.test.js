const http = require('http');
const ioClient = require('socket.io-client');
const app = require('../src/app');
const { initializeSocketIO } = require('../src/modules/core/socket/socket.handler');
const { registerUser } = require('../src/modules/core/auth/auth.service');
const { createTrip } = require('../src/modules/core/trips/trips.service');
const { setupTestDB } = require('./setup');

describe('Socket.io Real-Time Tracking Protocol', () => {
  setupTestDB();

  let server;
  let port;
  let serverUrl;
  let userToken;
  let userId;
  let userBToken;
  let activeTrip;

  beforeAll((done) => {
    server = http.createServer(app);
    initializeSocketIO(server);
    server.listen(0, () => {
      port = server.address().port;
      serverUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(async () => {
    const userA = await registerUser({
      phone: '+919876543210',
      name: 'Owner User',
      pin: '1234'
    });
    userToken = userA.token;
    userId = userA.user._id;

    const userB = await registerUser({
      phone: '+919876543211',
      name: 'Other User',
      pin: '5678'
    });
    userBToken = userB.token;

    activeTrip = await createTrip(userId, {
      origin: { address: 'Origin', coordinates: [72.84, 21.20] },
      destination: { address: 'Dest', coordinates: [72.75, 21.14] },
      estimatedDurationMinutes: 30
    });
  });

  it('connects authenticated mobile client with valid JWT token', (done) => {
    const client = ioClient(serverUrl, {
      auth: { token: userToken },
      transports: ['websocket']
    });

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.disconnect();
      done();
    });

    client.on('connect_error', (err) => {
      done(err);
    });
  });

  it('rejects connection when token is invalid', (done) => {
    const client = ioClient(serverUrl, {
      auth: { token: 'invalid_malformed_token' },
      transports: ['websocket']
    });

    client.on('connect_error', (err) => {
      expect(err.message).toContain('Authentication failed');
      client.disconnect();
      done();
    });
  });

  it('allows web tracker viewer to connect using trackingToken and auto-join room', (done) => {
    const viewerClient = ioClient(serverUrl, {
      auth: { trackingToken: activeTrip.trackingToken },
      transports: ['websocket']
    });

    viewerClient.on('trip:joined', (payload) => {
      expect(payload.tripId).toBe(activeTrip.tripId);
      expect(payload.role).toBe('viewer');
      viewerClient.disconnect();
      done();
    });
  });

  it('broadcasts location update from owner to viewers in the trip room', (done) => {
    // 1. Connect viewer
    const viewerClient = ioClient(serverUrl, {
      auth: { trackingToken: activeTrip.trackingToken },
      transports: ['websocket']
    });

    // 2. Connect owner
    const ownerClient = ioClient(serverUrl, {
      auth: { token: userToken },
      transports: ['websocket']
    });

    viewerClient.on('trip:joined', () => {
      // Viewer is in room; now owner sends location update
      ownerClient.emit('trip:location_update', {
        tripId: activeTrip.tripId,
        latitude: 21.1702,
        longitude: 72.8311,
        speed: 12.5,
        heading: 90,
        accuracy: 3
      });
    });

    viewerClient.on('trip:location_broadcast', (data) => {
      expect(data.tripId).toBe(activeTrip.tripId);
      expect(data.latitude).toBe(21.1702);
      expect(data.longitude).toBe(72.8311);
      expect(data.speed).toBe(12.5);
      expect(data.timestamp).toBeDefined();

      viewerClient.disconnect();
      ownerClient.disconnect();
      done();
    });
  });

  it('rejects invalid coordinates with trip:error event', (done) => {
    const ownerClient = ioClient(serverUrl, {
      auth: { token: userToken },
      transports: ['websocket']
    });

    ownerClient.on('connect', () => {
      ownerClient.emit('trip:location_update', {
        tripId: activeTrip.tripId,
        latitude: 999, // Invalid
        longitude: 72.8311
      });
    });

    ownerClient.on('trip:error', (err) => {
      expect(err.message).toContain('Invalid coordinates');
      ownerClient.disconnect();
      done();
    });
  });

  it('rejects location update if user does not own the trip', (done) => {
    const unauthorizedClient = ioClient(serverUrl, {
      auth: { token: userBToken },
      transports: ['websocket']
    });

    unauthorizedClient.on('connect', () => {
      unauthorizedClient.emit('trip:location_update', {
        tripId: activeTrip.tripId,
        latitude: 21.17,
        longitude: 72.83
      });
    });

    unauthorizedClient.on('trip:error', (err) => {
      expect(err.message).toContain('Unauthorized');
      unauthorizedClient.disconnect();
      done();
    });
  });
});
