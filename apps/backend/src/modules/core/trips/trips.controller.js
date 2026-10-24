const tripsService = require('./trips.service');

const create = async (req, res, next) => {
  try {
    const { origin, destination, estimatedDurationMinutes, emergencyContactIds } = req.body;
    const trip = await tripsService.createTrip(req.user._id, {
      origin,
      destination,
      estimatedDurationMinutes,
      emergencyContactIds
    });

    return res.status(201).json({
      success: true,
      message: 'Walk Me Home trip created successfully',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

const checkin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { extendMinutes } = req.body || {};
    const trip = await tripsService.checkinTrip(req.user._id, id, { extendMinutes });

    return res.status(200).json({
      success: true,
      message: 'Check-in recorded successfully',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

const arrived = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trip = await tripsService.arriveTrip(req.user._id, id);

    const io = req.app.get('io');
    if (io) {
      io.to(`trip:${id}`).emit('trip:ended', {
        tripId: id,
        status: 'arrived',
        arrivedAt: trip.arrivedAt
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Trip safely completed. You have arrived!',
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

const getTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trip = await tripsService.getTripById(req.user._id, id);

    return res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

const track = async (req, res, next) => {
  try {
    const { token } = req.params;
    const trip = await tripsService.getTripByTrackingToken(token);

    return res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  checkin,
  arrived,
  getTrip,
  track
};
