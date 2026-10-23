const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../../../config/env');
const Trip = require('../../../models/trip.model');
const { updateTripLocation, getTripByTrackingToken } = require('../trips/trips.service');

const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const trackingToken = socket.handshake.auth?.trackingToken || socket.handshake.query?.trackingToken;

    // Viewers connecting via trackingToken (e.g., tracker web page)
    if (trackingToken) {
      try {
        const trip = await getTripByTrackingToken(trackingToken);
        socket.isViewer = true;
        socket.trackingTripId = trip.tripId;
        socket.trackingToken = trackingToken;
        return next();
      } catch (err) {
        return next(new Error('Invalid tracking token'));
      }
    }

    // Authenticated mobile users
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.userId;
        socket.userPhone = decoded.phone;
        return next();
      } catch (err) {
        return next(new Error('Authentication failed: Invalid or expired token'));
      }
    }

    // Allow unauthenticated connection but restrict actions until joined with trackingToken
    socket.isAnonymous = true;
    return next();
  });

  io.on('connection', (socket) => {
    // If viewer authenticated at handshake, auto-join room
    if (socket.isViewer && socket.trackingTripId) {
      const room = `trip:${socket.trackingTripId}`;
      socket.join(room);
      socket.emit('trip:joined', { tripId: socket.trackingTripId, role: 'viewer' });
    }

    /**
     * Join a trip room as a viewer using trackingToken or authenticated owner
     */
    socket.on('trip:join', async (payload) => {
      try {
        const { tripId, trackingToken } = payload || {};

        if (trackingToken) {
          const trip = await getTripByTrackingToken(trackingToken);
          const room = `trip:${trip.tripId}`;
          socket.join(room);
          socket.emit('trip:joined', { tripId: trip.tripId, role: 'viewer' });
          return;
        }

        if (tripId && socket.userId) {
          const trip = await Trip.findById(tripId).lean();
          if (!trip) {
            return socket.emit('trip:error', { message: 'Trip not found' });
          }

          if (trip.userId.toString() !== socket.userId.toString()) {
            return socket.emit('trip:error', { message: 'Unauthorized to join this trip room' });
          }

          const room = `trip:${tripId}`;
          socket.join(room);
          socket.emit('trip:joined', { tripId, role: 'owner' });
          return;
        }

        socket.emit('trip:error', { message: 'Either tripId (authenticated) or trackingToken is required to join' });
      } catch (error) {
        socket.emit('trip:error', { message: error.message || 'Error joining trip room' });
      }
    });

    /**
     * Leave a trip room
     */
    socket.on('trip:leave', (payload) => {
      const { tripId } = payload || {};
      if (tripId) {
        socket.leave(`trip:${tripId}`);
        socket.emit('trip:left', { tripId });
      }
    });

    /**
     * Tracker / Mobile universal session room join
     */
    socket.on('join-session', (payload) => {
      const token = payload?.token || payload?.trackingToken;
      if (token) {
        socket.join(`session:${token}`);
        socket.join(`trip:${token}`);
        socket.emit('session:joined', { token });
      }
    });

    /**
     * Universal live GPS coordinate telemetry broadcast for Walk With Me Home & Live Tracking
     */
    socket.on('location:update', (payload) => {
      const token = payload?.token || payload?.trackingToken || payload?.tripId;
      if (token) {
        const telemetry = {
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed || 0,
          heading: payload.heading || 0,
          accuracy: payload.accuracy || 5,
          timestamp: payload.timestamp || new Date().toISOString()
        };
        io.to(`session:${token}`).to(`trip:${token}`).emit('location', telemetry);
        io.to(`session:${token}`).to(`trip:${token}`).emit('location:update', telemetry);
        io.to(`session:${token}`).to(`trip:${token}`).emit('trip:location_broadcast', telemetry);
      }
    });

    /**
     * Location update emitted by mobile trip owner during active Walk Me Home
     */
    socket.on('trip:location_update', async (payload) => {
      try {
        if (!socket.userId) {
          return socket.emit('trip:error', { message: 'Authentication required to publish location updates' });
        }

        const { tripId, latitude, longitude, speed = 0, heading = 0, accuracy = 0 } = payload || {};

        if (!tripId) {
          return socket.emit('trip:error', { message: 'tripId is required in location update' });
        }

        // Validate coordinates
        if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
            latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          return socket.emit('trip:error', { message: 'Invalid coordinates: latitude (-90..90), longitude (-180..180)' });
        }

        // Update database and verify ownership
        const updatedTrip = await updateTripLocation(tripId, socket.userId, {
          coordinates: [longitude, latitude],
          speed,
          heading,
          accuracy
        });

        if (!updatedTrip) {
          return socket.emit('trip:error', { message: 'Trip not found' });
        }

        const broadcastPayload = {
          tripId,
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          timestamp: new Date().toISOString()
        };

        // Broadcast to all viewers listening in the trip room
        io.to(`trip:${tripId}`).emit('trip:location_broadcast', broadcastPayload);

        // Acknowledge receipt to sender
        socket.emit('trip:location_ack', {
          tripId,
          receivedAt: broadcastPayload.timestamp
        });
      } catch (error) {
        socket.emit('trip:error', {
          message: error.message || 'Failed to process location update'
        });
      }
    });

    socket.on('disconnect', () => {
      // Room cleanups are automatically handled by Socket.io
    });
  });

  return io;
};

module.exports = {
  initializeSocketIO
};
