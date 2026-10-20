const MIN_CONFIRMATIONS = 2;
const HALF_LIFE_DAYS = 7;
const DEFAULT_RADIUS_M = 1000;
const MAX_RADIUS_M = 5000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Route safety scoring constants
const SAMPLE_INTERVAL_M = 50;
const LIGHT_RADIUS_M = 50;
const REPORT_RADIUS_M = 100;
const POLICE_MAX_DISTANCE_M = 1000;
const REPORT_PENALTY = 15;
const NEUTRAL_SCORE = 50;
const WEIGHTS = {
  incident: 0.4,
  lighting: 0.35,
  police: 0.25
};
const COLOR_THRESHOLDS = {
  green: 70,
  yellow: 40
};

// Time-of-day weighting constants (IST: UTC+05:30)
const TIMEZONE_OFFSET_MINUTES = 330;

const TIME_PERIODS = {
  day: { startHour: 6, endHour: 18 },
  evening: { startHour: 18, endHour: 21 },
  night: { startHour: 21, endHour: 6 } // wraps past midnight: hours 21-23 and 0-5
};

// Tunable parameters: these values are a team choice for SafeSafar (Track 3 SheLeads), not an official standard.
// Each period's weights must sum to 1.0.
const WEIGHTS_BY_PERIOD = {
  day: {
    incident: 0.40,
    lighting: 0.35,
    police: 0.25
  },
  evening: {
    incident: 0.40,
    lighting: 0.40,
    police: 0.20
  },
  night: {
    incident: 0.35,
    lighting: 0.45,
    police: 0.20
  }
};

const PENALTY_MULTIPLIER_BY_PERIOD = {
  day: 1,
  evening: 1.25,
  night: 1.5
};

module.exports = {
  MIN_CONFIRMATIONS,
  HALF_LIFE_DAYS,
  DEFAULT_RADIUS_M,
  MAX_RADIUS_M,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SAMPLE_INTERVAL_M,
  LIGHT_RADIUS_M,
  REPORT_RADIUS_M,
  POLICE_MAX_DISTANCE_M,
  REPORT_PENALTY,
  NEUTRAL_SCORE,
  WEIGHTS,
  COLOR_THRESHOLDS,
  TIMEZONE_OFFSET_MINUTES,
  TIME_PERIODS,
  WEIGHTS_BY_PERIOD,
  PENALTY_MULTIPLIER_BY_PERIOD
};


