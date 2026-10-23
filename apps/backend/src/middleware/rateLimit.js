const rateLimit = require('express-rate-limit');

/**
 * Login Rate Limiter:
 * 5 attempts per minute per IP
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 1 minute.',
  },
});

/**
 * Signup Rate Limiter:
 * 10 signups per hour per IP
 */
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many account creation attempts. Please try again later.',
  },
});

/**
 * Resend Verification Rate Limiter:
 * 3 requests per hour per IP
 */
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many verification email requests. Please wait before requesting another.',
  },
});

module.exports = {
  loginLimiter,
  signupLimiter,
  resendVerificationLimiter,
};
