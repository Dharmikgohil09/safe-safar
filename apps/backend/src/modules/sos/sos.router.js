/**
 * SafeSafar - SOS Engine & Emergency Integrations Module
 * Owner: Kristal (@kristal)
 *
 * This router serves as the designated mounting point for Kristal's SOS engine,
 * handling multi-channel emergency triggers (SMS via Twilio, voice calls, Telegram Bot, FCM alerts).
 *
 * Core backend provides this stable router interface and coordinates trip-expiry hooks.
 */

const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { registerTripExpiryHook } = require('../core/trips/trips.service');

const router = express.Router();

// Register coordinate hook with core trip expiry
// Note: Handled safely in development to avoid accidental triggers
registerTripExpiryHook(async (expiredTrip) => {
  console.log(`[SOS Coordination] Trip ${expiredTrip._id} expired. Ready for Kristal SOS engine hook.`);
});

// Contract placeholder for POST /sos/trigger
router.post('/trigger', requireAuth, async (req, res) => {
  const { latitude, longitude, reason, batteryLevel } = req.body || {};

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'latitude and longitude coordinates are required to trigger an SOS alert.'
    });
  }

  // Development interface stub - Kristal will wire Twilio SMS, Telegram and FCM here
  return res.status(200).json({
    success: true,
    module: 'sos',
    status: 'development_interface',
    message: 'SOS trigger endpoint mounted for Kristal emergency module.',
    data: {
      alertId: 'sos_alert_' + Date.now(),
      userId: req.user._id,
      coordinates: [longitude, latitude],
      reason: reason || 'manual_trigger',
      batteryLevel: batteryLevel || null,
      dispatches: {
        sms: 'pending_kristal_integration',
        telegram: 'pending_kristal_integration',
        fcm: 'pending_kristal_integration'
      },
      triggeredAt: new Date().toISOString()
    }
  });
});

// Contract placeholder for POST /sos/cancel
router.post('/cancel', requireAuth, async (req, res) => {
  const { alertId, pin } = req.body || {};

  if (!alertId) {
    return res.status(400).json({
      success: false,
      error: 'alertId is required to cancel an SOS alert.'
    });
  }

  return res.status(200).json({
    success: true,
    module: 'sos',
    status: 'development_interface',
    message: 'SOS cancellation endpoint mounted for Kristal emergency module.',
    data: {
      alertId,
      cancelledBy: req.user._id,
      cancelledAt: new Date().toISOString()
    }
  });
});

module.exports = router;
