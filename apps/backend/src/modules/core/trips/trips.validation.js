const { z } = require('zod');

const coordinatesSchema = z
  .array(z.number())
  .length(2, { message: 'Coordinates must be [longitude, latitude]' })
  .refine(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90, {
    message: 'Coordinates must be valid: longitude between -180 and 180, latitude between -90 and 90'
  });

const pointSchema = z.object({
  address: z.string().trim().optional().default(''),
  coordinates: coordinatesSchema
});

const createTripSchema = {
  body: z.object({
    origin: pointSchema,
    destination: pointSchema,
    estimatedDurationMinutes: z
      .number({ required_error: 'Estimated duration in minutes is required' })
      .int()
      .min(1, { message: 'Estimated duration must be at least 1 minute' })
      .max(1440, { message: 'Estimated duration cannot exceed 1440 minutes (24 hours)' }),
    emergencyContactIds: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid contact ID format' }))
      .optional()
      .default([])
  })
};

const tripIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid trip ID format' })
  })
};

const checkinTripSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid trip ID format' })
  }),
  body: z
    .object({
      extendMinutes: z
        .number()
        .int()
        .min(1, { message: 'Extension must be at least 1 minute' })
        .max(120, { message: 'Extension cannot exceed 120 minutes' })
        .optional()
    })
    .optional()
};

const trackingTokenSchema = {
  params: z.object({
    token: z.string().min(16, { message: 'Invalid tracking token format' })
  })
};

module.exports = {
  coordinatesSchema,
  createTripSchema,
  tripIdParamSchema,
  checkinTripSchema,
  trackingTokenSchema
};
