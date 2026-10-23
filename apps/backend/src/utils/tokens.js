const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || config.jwt?.secret || 'safesafar_access_secret_min_32_chars';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (config.jwt?.secret ? config.jwt.secret + '_refresh' : 'safesafar_refresh_secret_min_32_chars');

/**
 * Generate a short-lived access token (15 minutes)
 */
function generateAccessToken(user) {
  const payload = {
    userId: user._id ? user._id.toString() : user.id,
    email: user.email,
    phone: user.phone || null,
  };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

/**
 * Generate a long-lived refresh token (30 days)
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user._id ? user._id.toString() : user.id,
    tokenVersion: Date.now(),
  };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' });
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Generate random 32-byte hex string for email verification
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create SHA-256 hash of a raw token string for secure DB storage
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateVerificationToken,
  hashToken,
  ACCESS_SECRET,
  REFRESH_SECRET,
};
