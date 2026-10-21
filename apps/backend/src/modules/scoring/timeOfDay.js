const {
  TIMEZONE_OFFSET_MINUTES,
  WEIGHTS_BY_PERIOD,
  PENALTY_MULTIPLIER_BY_PERIOD
} = require('./constants');

/**
 * Computes the time-of-day period ("day" | "evening" | "night") in Indian Standard Time (IST, UTC+05:30).
 *
 * IST hours mapping:
 * - Day: 06:00 - 17:59 (hours 6 through 17)
 * - Evening: 18:00 - 20:59 (hours 18 through 20)
 * - Night: 21:00 - 05:59 (hours 21 through 23 and 0 through 5)
 *
 * @param {Date} date
 * @returns {'day' | 'evening' | 'night'}
 * @throws {TypeError} If date is not a valid Date instance
 */
function getTimePeriod(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new TypeError('Invalid Date passed to getTimePeriod');
  }

  const istHour = new Date(date.getTime() + TIMEZONE_OFFSET_MINUTES * 60000).getUTCHours();

  if (istHour >= 6 && istHour < 18) {
    return 'day';
  }
  if (istHour >= 18 && istHour < 21) {
    return 'evening';
  }
  return 'night';
}

/**
 * Returns the weights and incident penalty multiplier for a given time-of-day period.
 * Falls back to "day" configuration if period is unrecognized.
 *
 * @param {string} period - 'day' | 'evening' | 'night'
 * @returns {{ weights: { incident: number, lighting: number, police: number }, penaltyMultiplier: number }}
 */
function getPeriodConfig(period) {
  const key = WEIGHTS_BY_PERIOD[period] ? period : 'day';
  return {
    weights: WEIGHTS_BY_PERIOD[key],
    penaltyMultiplier: PENALTY_MULTIPLIER_BY_PERIOD[key]
  };
}

module.exports = {
  getTimePeriod,
  getPeriodConfig
};
