const { z } = require('zod');
const { phoneRegex } = require('../auth/auth.validation');

const createContactSchema = {
  body: z.object({
    name: z
      .string({ required_error: 'Contact name is required' })
      .trim()
      .min(2, { message: 'Contact name must be at least 2 characters' })
      .max(80, { message: 'Contact name cannot exceed 80 characters' }),
    phone: z
      .string({ required_error: 'Contact phone number is required' })
      .trim()
      .regex(phoneRegex, { message: 'Phone number must be a valid 10-digit or E.164 phone number' }),
    telegramToken: z
      .string()
      .trim()
      .max(256, { message: 'Telegram token cannot exceed 256 characters' })
      .optional()
      .nullable()
  })
};

const deleteContactSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid contact identifier format' })
  })
};

module.exports = {
  createContactSchema,
  deleteContactSchema
};
