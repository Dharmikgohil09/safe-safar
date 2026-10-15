/**
 * SafeSafar - Safety Scoring & Community Reports Module
 * Owner: Satej (@satej)
 *
 * This router serves as the designated mounting point for Satej's safety scoring engine,
 * community incident reporting, trust/time decay, and Surat seed dataset.
 *
 * Core backend provides this stable router interface so mobile and web applications can
 * integrate seamlessly.
 */

const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = express.Router();

// Contract placeholder for POST /routes/safe
router.post('/safe', async (req, res) => {
  const { origin, destination, preferences } = req.body || {};

  if (!origin || !destination) {
    return res.status(400).json({
      success: false,
      error: 'origin and destination coordinates are required for safety-scored route generation.'
    });
  }

  // Development response contract stub - to be connected to Satej's OpenRouteService + scoring engine
  return res.status(200).json({
    success: true,
    module: 'scoring',
    status: 'development_interface',
    message: 'Safe route calculation endpoint mounted for Satej scoring engine.',
    contract: {
      origin,
      destination,
      preferences: preferences || { prioritizeLighting: true, avoidReportHotspots: true },
      sampleOutputStructure: {
        routes: [
          {
            routeId: 'route_safest_sample',
            safetyScore: 88,
            distanceMeters: 2450,
            durationSeconds: 1320,
            polyline: 'sample_encoded_polyline',
            safetyFactors: {
              lightingScore: 90,
              policeProximityScore: 85,
              incidentDecayScore: 89
            }
          }
        ]
      }
    }
  });
});

// Contract placeholder for community incident reports
router.post('/reports', requireAuth, async (req, res) => {
  const { type, location, description } = req.body || {};

  if (!type || !location || !location.coordinates) {
    return res.status(400).json({
      success: false,
      error: 'Report type and location coordinates are required.'
    });
  }

  return res.status(201).json({
    success: true,
    module: 'scoring',
    status: 'development_interface',
    message: 'Community report endpoint mounted for Satej reports engine.',
    data: {
      reportId: 'dev_report_' + Date.now(),
      userId: req.user._id,
      type,
      location,
      description: description || '',
      verified: false,
      timestamp: new Date().toISOString()
    }
  });
});

router.get('/reports', async (req, res) => {
  return res.status(200).json({
    success: true,
    module: 'scoring',
    status: 'development_interface',
    message: 'Community reports query mounted for Satej reports engine.',
    data: []
  });
});

module.exports = router;
