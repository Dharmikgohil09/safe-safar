const express = require('express');
const tripsController = require('./trips.controller');
const {
  createTripSchema,
  tripIdParamSchema,
  checkinTripSchema,
  trackingTokenSchema
} = require('./trips.validation');
const validate = require('../../../middleware/validate.middleware');
const { requireAuth } = require('../../../middleware/auth.middleware');

const router = express.Router();

// Public live tracking endpoint using secure tracking token (for tracker web and trusted contacts)
router.get('/track/:token', validate(trackingTokenSchema), tripsController.track);

// Authenticated trip management endpoints
router.post('/', requireAuth, validate(createTripSchema), tripsController.create);
router.get('/:id', requireAuth, validate(tripIdParamSchema), tripsController.getTrip);
router.post('/:id/checkin', requireAuth, validate(checkinTripSchema), tripsController.checkin);
router.post('/:id/arrived', requireAuth, validate(tripIdParamSchema), tripsController.arrived);

module.exports = router;
