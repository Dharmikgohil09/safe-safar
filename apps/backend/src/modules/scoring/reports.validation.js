const { z } = require('zod');
const {
  DEFAULT_RADIUS_M,
  MAX_RADIUS_M,
  DEFAULT_LIMIT,
  MAX_LIMIT
} = require('./constants');

const REPORT_TYPES = [
  'poor_lighting',
  'harassment',
  'suspicious_activity',
  'unsafe_pathway',
  'other',
  // Backward compatibility with existing tests/routes
  'dark_street',
  'isolated',
  'unsafe_crowd',
  'isolated_path',
  'suspicious'
];

/**
 * Zod schema for POST /reports request body
 */
const createReportBodySchema = z
  .object({
    category: z.enum(REPORT_TYPES).optional(),
    type: z.enum(REPORT_TYPES).optional(),
    location: z
      .object({
        type: z.string().optional(),
        coordinates: z
          .array(z.number())
          .length(2, 'location.coordinates must contain exactly 2 numbers [lng, lat]')
          .refine(
            ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
            {
              message: 'Coordinates must be valid: longitude between -180 and 180, latitude between -90 and 90'
            }
          )
      })
      .optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    description: z.string().max(500, 'description cannot exceed 500 characters').optional(),
    note: z.string().max(500, 'note cannot exceed 500 characters').optional(),
    address: z.string().max(300).optional()
  })
  .refine(
    (data) => Boolean(data.category || data.type),
    { message: `category or type is required and must be one of: ${REPORT_TYPES.join(', ')}`, path: ['category'] }
  )
  .refine(
    (data) => Boolean(data.location?.coordinates || (data.latitude !== undefined && data.longitude !== undefined)),
    { message: 'Valid location coordinates [lng, lat] or latitude and longitude required', path: ['location'] }
  );

/**
 * Zod schema for GET /reports/nearby query string parameters
 */
const nearbyReportsQuerySchema = z.object({
  lat: z.preprocess((v) => Number(v), z.number().min(-90).max(90)),
  lng: z.preprocess((v) => Number(v), z.number().min(-180).max(180)),
  radius: z.preprocess((v) => (v === undefined ? DEFAULT_RADIUS_M : Number(v)), z.number().positive().max(MAX_RADIUS_M)).default(DEFAULT_RADIUS_M)
});

/**
 * Zod schema for GET /reports query string parameters
 */
const listReportsQuerySchema = z.object({
  near: z
    .string()
    .regex(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/, 'near must be formatted as "lng,lat"')
    .refine(
      (val) => {
        const [lng, lat] = val.split(',').map(Number);
        return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
      },
      {
        message: 'near coordinates must be valid: longitude between -180 and 180, latitude between -90 and 90'
      }
    )
    .optional(),
  radius: z
    .preprocess((val) => (val === undefined ? DEFAULT_RADIUS_M : Number(val)), z.number().positive().max(MAX_RADIUS_M))
    .default(DEFAULT_RADIUS_M),
  limit: z
    .preprocess((val) => (val === undefined ? DEFAULT_LIMIT : Number(val)), z.number().int().positive().max(MAX_LIMIT))
    .default(DEFAULT_LIMIT),
  includePending: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true' || val === '1';
      }
      return Boolean(val);
    }, z.boolean())
    .default(false)
});

/**
 * Zod schema for 24-character hexadecimal ObjectId path params
 */
const reportIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'id must be a valid 24-character hex ObjectId')
});

/**
 * Express middleware helper for Zod validation with standard error envelope
 * { success: false, error: "Validation failed", details: [{ field, message }] }
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
  createReportBodySchema,
  listReportsQuerySchema,
  nearbyReportsQuerySchema,
  reportIdParamSchema,
  validateRequest,
  REPORT_TYPES
};
