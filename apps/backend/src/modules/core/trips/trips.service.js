const crypto = require('crypto');
const Trip = require('../../../models/trip.model');
const Contact = require('../../../models/contact.model');

// Event hooks for Kristal's SOS module integration
const expiryHooks = [];

const registerTripExpiryHook = (callback) => {
  if (typeof callback === 'function') {
    expiryHooks.push(callback);
  }
};

const notifyExpiryHooks = async (trip) => {
  for (const hook of expiryHooks) {
    try {
      await hook(trip);
    } catch (err) {
      console.error('[TripsService] Error in trip expiry hook:', err.message);
    }
  }
};

const reconcileTripStatus = async (trip) => {
  if (trip.status === 'active' && new Date() > trip.deadlineAt) {
    trip.status = 'expired';
    await trip.save();
    // Safely notify internal hooks without firing raw unverified alerts
    await notifyExpiryHooks(trip);
  }
  return trip;
};

const createTrip = async (userId, { origin, destination, estimatedDurationMinutes, emergencyContactIds }) => {
  // Resolve chosen emergency contacts if any
  let emergencyContacts = [];
  if (emergencyContactIds && emergencyContactIds.length > 0) {
    const contacts = await Contact.find({
      _id: { $in: emergencyContactIds },
      userId
    }).lean();

    emergencyContacts = contacts.map(c => ({
      contactId: c._id,
      name: c.name,
      phone: c.phone
    }));
  }

  const now = new Date();
  const deadlineAt = new Date(now.getTime() + estimatedDurationMinutes * 60 * 1000);
  const trackingToken = crypto.randomBytes(16).toString('hex');

  const trip = await Trip.create({
    userId,
    trackingToken,
    origin,
    destination,
    estimatedDurationMinutes,
    deadlineAt,
    lastCheckinAt: now,
    status: 'active',
    emergencyContacts,
    lastKnownLocation: {
      coordinates: origin.coordinates,
      timestamp: now
    }
  });

  return formatTripResponse(trip);
};

const checkinTrip = async (userId, tripId, { extendMinutes = 0 } = {}) => {
  const trip = await Trip.findById(tripId);

  if (!trip) {
    const error = new Error('Trip not found');
    error.statusCode = 404;
    throw error;
  }

  if (trip.userId.toString() !== userId.toString()) {
    const error = new Error('Unauthorized to access this trip');
    error.statusCode = 403;
    throw error;
  }

  await reconcileTripStatus(trip);

  if (trip.status !== 'active') {
    const error = new Error(`Cannot check-in to a trip with status: ${trip.status}`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  trip.lastCheckinAt = now;

  if (extendMinutes > 0) {
    trip.estimatedDurationMinutes += extendMinutes;
    trip.deadlineAt = new Date(trip.deadlineAt.getTime() + extendMinutes * 60 * 1000);
  }

  await trip.save();
  return formatTripResponse(trip);
};

const arriveTrip = async (userId, tripId) => {
  const trip = await Trip.findById(tripId);

  if (!trip) {
    const error = new Error('Trip not found');
    error.statusCode = 404;
    throw error;
  }

  if (trip.userId.toString() !== userId.toString()) {
    const error = new Error('Unauthorized to access this trip');
    error.statusCode = 403;
    throw error;
  }

  await reconcileTripStatus(trip);

  if (trip.status !== 'active') {
    const error = new Error(`Trip cannot be marked as arrived. Current status: ${trip.status}`);
    error.statusCode = 400;
    throw error;
  }

  trip.status = 'arrived';
  trip.arrivedAt = new Date();
  await trip.save();

  return formatTripResponse(trip);
};

const getTripById = async (userId, tripId) => {
  const trip = await Trip.findById(tripId);

  if (!trip) {
    const error = new Error('Trip not found');
    error.statusCode = 404;
    throw error;
  }

  if (trip.userId.toString() !== userId.toString()) {
    const error = new Error('Unauthorized to view this trip');
    error.statusCode = 403;
    throw error;
  }

  await reconcileTripStatus(trip);
  return formatTripResponse(trip);
};

const getTripByTrackingToken = async (trackingToken) => {
  const trip = await Trip.findOne({ trackingToken }).populate('userId', 'name');

  if (!trip) {
    const error = new Error('Invalid tracking token or trip not found');
    error.statusCode = 404;
    throw error;
  }

  await reconcileTripStatus(trip);

  const remainingSeconds = Math.max(0, Math.floor((trip.deadlineAt.getTime() - Date.now()) / 1000));

  return {
    tripId: trip._id.toString(),
    trackingToken: trip.trackingToken,
    userName: trip.userId ? trip.userId.name : 'SafeSafar User',
    origin: trip.origin,
    destination: trip.destination,
    status: trip.status,
    deadlineAt: trip.deadlineAt,
    remainingSeconds,
    lastCheckinAt: trip.lastCheckinAt,
    arrivedAt: trip.arrivedAt,
    lastKnownLocation: trip.lastKnownLocation
  };
};

const updateTripLocation = async (tripId, userId, { coordinates, speed = 0, heading = 0, accuracy = 0 }) => {
  const trip = await Trip.findById(tripId);
  if (!trip) return null;

  if (trip.userId.toString() !== userId.toString()) {
    const error = new Error('Unauthorized: only trip owner can publish location updates');
    error.statusCode = 403;
    throw error;
  }

  if (trip.status !== 'active') {
    return trip;
  }

  trip.lastKnownLocation = {
    coordinates,
    speed,
    heading,
    accuracy,
    timestamp: new Date()
  };

  await trip.save();
  return trip;
};

const formatTripResponse = (trip) => {
  const remainingSeconds = Math.max(0, Math.floor((trip.deadlineAt.getTime() - Date.now()) / 1000));

  return {
    tripId: trip._id.toString(),
    trackingToken: trip.trackingToken,
    userId: trip.userId.toString(),
    origin: trip.origin,
    destination: trip.destination,
    status: trip.status,
    estimatedDurationMinutes: trip.estimatedDurationMinutes,
    deadlineAt: trip.deadlineAt,
    remainingSeconds,
    lastCheckinAt: trip.lastCheckinAt,
    arrivedAt: trip.arrivedAt,
    emergencyContacts: trip.emergencyContacts,
    lastKnownLocation: trip.lastKnownLocation,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt
  };
};

module.exports = {
  createTrip,
  checkinTrip,
  arriveTrip,
  getTripById,
  getTripByTrackingToken,
  updateTripLocation,
  reconcileTripStatus,
  registerTripExpiryHook,
  formatTripResponse
};
