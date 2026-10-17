const { HALF_LIFE_DAYS } = require('./constants');

/**
 * Calculates exponential decay weight for a safety report.
 * Weight halves every HALF_LIFE_DAYS (7 days).
 *
 * formula: 0.5 ** (ageInDays / HALF_LIFE_DAYS)
 * Clamped: age cannot be negative (future dates yield weight = 1).
 *
 * @param {Date|string|number} createdAt - Creation timestamp of the report
 * @param {Date} [now=new Date()] - Reference timestamp (default: current time)
 * @returns {number} Decay weight in range (0, 1]
 */
function calculateDecayWeight(createdAt, now = new Date()) {
  const createdTime = new Date(createdAt).getTime();
  const currentTime = new Date(now).getTime();

  const diffMs = currentTime - createdTime;
  const ageInDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));

  return Math.pow(0.5, ageInDays / HALF_LIFE_DAYS);
}

module.exports = {
  calculateDecayWeight
};
