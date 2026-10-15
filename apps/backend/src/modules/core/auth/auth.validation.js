const { z } = require('zod');

// Accepts either 10 digits or E.164 format (+919876543210)
const phoneRegex = /^(?:\+?\d{1,3})?[6-9]\d{9}$/;
const pinRegex = /^\d{4,6}$/;

const registerSchema = {
  body: z.object({
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(phoneRegex, { message: 'Phone number must be a valid 10-digit or E.164 phone number' }),
    name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Name must be at least 2 characters' })
      .max(80, { message: 'Name cannot exceed 80 characters' }),
    pin: z
      .string({ required_error: 'PIN is required' })
      .trim()
      .regex(pinRegex, { message: 'PIN must be between 4 and 6 digits' }),
    emergencyNote: z
      .string()
      .trim()
      .max(500, { message: 'Emergency note cannot exceed 500 characters' })
      .optional()
  })
};

const loginSchema = {
  body: z.object({
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(phoneRegex, { message: 'Phone number must be a valid 10-digit or E.164 phone number' }),
    pin: z
      .string({ required_error: 'PIN is required' })
      .trim()
      .regex(pinRegex, { message: 'PIN must be between 4 and 6 digits' })
  })
};

module.exports = {
  registerSchema,
  loginSchema,
  phoneRegex
};
