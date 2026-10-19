const { z } = require('zod');

/**
 * Validates a GeoJSON [longitude, latitude] coordinate pair.
 */
const coordinatePairSchema = z
  .array(z.number({ required_error: 'Coordinates must be numbers' }))
  .length(2, 'coordinates must contain exactly 2 numbers [lng, lat]')
  .refine(
    ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
    {
      message: 'Coordinates must be valid: longitude between -180 and 180, latitude between -90 and 90'
    }
  );

/**
 * Zod schema for POST /routes/safe request body
 */
const safeRoutesBodySchema = z
  .object({
    origin: z.object({
      coordinates: coordinatePairSchema
    }),
    destination: z.object({
      coordinates: coordinatePairSchema
    }),
    preferences: z
      .object({
        prioritizeLighting: z.boolean().optional(),
        avoidReportHotspots: z.boolean().optional()
      })
      .optional()
  })
  .refine(
    (data) => {
      if (!data.origin?.coordinates || !data.destination?.coordinates) {
        return true;
      }
      const [oLng, oLat] = data.origin.coordinates;
      const [dLng, dLat] = data.destination.coordinates;
      return oLng !== dLng || oLat !== dLat;
    },
    {
      message: 'Origin and destination must not be identical',
      path: ['destination', 'coordinates']
    }
  );

/**
 * Express middleware helper for request validation
 */
function validateRequest({ body, query, params }) {
  return (req, res, next) => {
    const details = [];

    if (body) {
      const result = body.safeParse(req.body);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          details.push({
            field: ['body', ...err.path].join('.'),
            message: err.message
          });
        });
      } else {
        req.body = result.data;
      }
    }

    if (query) {
      const result = query.safeParse(req.query);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          details.push({
            field: ['query', ...err.path].join('.'),
            message: err.message
          });
        });
      } else {
        req.query = result.data;
      }
    }

    if (params) {
      const result = params.safeParse(req.params);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          details.push({
            field: ['params', ...err.path].join('.'),
            message: err.message
          });
        });
      } else {
        req.params = result.data;
      }
    }

    if (details.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details
      });
    }

    next();
  };
}

module.exports = {
  coordinatePairSchema,
  safeRoutesBodySchema,
  validateRequest
};
