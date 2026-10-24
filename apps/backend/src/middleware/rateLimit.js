const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

/**
 * Login Rate Limiter:
 * 5 attempts per minute per IP
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 1 minute.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Signup Rate Limiter:
 * 10 signups per hour per IP
 */
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many account creation attempts. Please try again later.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Resend Verification Rate Limiter:
 * 3 requests per hour per IP
 */
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many verification email requests. Please wait before requesting another.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = {
  loginLimiter,
  signupLimiter,
  resendVerificationLimiter,
};
