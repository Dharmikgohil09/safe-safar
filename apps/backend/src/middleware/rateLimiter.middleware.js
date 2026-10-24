const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  skip: () => config.isTest
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.authMax, // e.g. 15 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login or registration attempts. Please wait 15 minutes before retrying.'
  },
  skip: () => config.isTest
});

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reports per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?._id || req.user?.id || req.ip).toString(),
  message: {
    success: false,
    error: 'Too many reports submitted. Maximum 10 reports per hour allowed.'
  },
  skip: () => config.isTest
});

module.exports = {
  generalLimiter,
  authLimiter,
  reportLimiter
};
