const { getTimePeriod, getPeriodConfig } = require('../timeOfDay');
const {
  WEIGHTS,
  WEIGHTS_BY_PERIOD,
  PENALTY_MULTIPLIER_BY_PERIOD
} = require('../constants');

describe('Time of Day Engine (timeOfDay.js)', () => {
  describe('getTimePeriod', () => {
    test('computes correct IST time-of-day period for UTC boundary inputs', () => {
      // 00:29:59 UTC + 5:30 = 05:59:59 IST -> night
      expect(getTimePeriod(new Date('2026-10-20T00:29:59Z'))).toBe('night');

      // 00:30:00 UTC + 5:30 = 06:00:00 IST -> day
      expect(getTimePeriod(new Date('2026-10-20T00:30:00Z'))).toBe('day');

      // 12:29:59 UTC + 5:30 = 17:59:59 IST -> day
      expect(getTimePeriod(new Date('2026-10-20T12:29:59Z'))).toBe('day');

      // 12:30:00 UTC + 5:30 = 18:00:00 IST -> evening
      expect(getTimePeriod(new Date('2026-10-20T12:30:00Z'))).toBe('evening');

      // 15:29:59 UTC + 5:30 = 20:59:59 IST -> evening
      expect(getTimePeriod(new Date('2026-10-20T15:29:59Z'))).toBe('evening');

      // 15:30:00 UTC + 5:30 = 21:00:00 IST -> night
      expect(getTimePeriod(new Date('2026-10-20T15:30:00Z'))).toBe('night');

      // 18:30:00 UTC + 5:30 = 00:00:00 IST (midnight) -> night
      expect(getTimePeriod(new Date('2026-10-20T18:30:00Z'))).toBe('night');
    });

    test('throws TypeError on invalid date inputs', () => {
      expect(() => getTimePeriod('2026-10-20T12:00:00Z')).toThrow(TypeError);
      expect(() => getTimePeriod(null)).toThrow(TypeError);
      expect(() => getTimePeriod(undefined)).toThrow(TypeError);
      expect(() => getTimePeriod(1234567890)).toThrow(TypeError);
      expect(() => getTimePeriod(new Date('not-a-valid-date'))).toThrow(TypeError);
      expect(() => getTimePeriod({})).toThrow(TypeError);
    });
  });

  describe('getPeriodConfig', () => {
    test('returns correct period configuration for day, evening, and night', () => {
      const dayConfig = getPeriodConfig('day');
      expect(dayConfig.weights).toEqual(WEIGHTS_BY_PERIOD.day);
      expect(dayConfig.penaltyMultiplier).toBe(PENALTY_MULTIPLIER_BY_PERIOD.day);

      const eveningConfig = getPeriodConfig('evening');
      expect(eveningConfig.weights).toEqual(WEIGHTS_BY_PERIOD.evening);
      expect(eveningConfig.penaltyMultiplier).toBe(PENALTY_MULTIPLIER_BY_PERIOD.evening);

      const nightConfig = getPeriodConfig('night');
      expect(nightConfig.weights).toEqual(WEIGHTS_BY_PERIOD.night);
      expect(nightConfig.penaltyMultiplier).toBe(PENALTY_MULTIPLIER_BY_PERIOD.night);
    });

    test('unknown period falls back to day configuration', () => {
      const unknownConfig = getPeriodConfig('afternoon');
      expect(unknownConfig.weights).toEqual(WEIGHTS_BY_PERIOD.day);
      expect(unknownConfig.penaltyMultiplier).toBe(1);

      const emptyConfig = getPeriodConfig(undefined);
      expect(emptyConfig.weights).toEqual(WEIGHTS_BY_PERIOD.day);
      expect(emptyConfig.penaltyMultiplier).toBe(1);
    });
  });

  describe('Weights & Constants consistency', () => {
    test('every WEIGHTS_BY_PERIOD entry sums to 1.0', () => {
      for (const [period, weights] of Object.entries(WEIGHTS_BY_PERIOD)) {
        const sum = weights.incident + weights.lighting + weights.police;
        expect(sum).toBeCloseTo(1.0, 5);
      }
    });

    test('day weights equal the existing WEIGHTS constant', () => {
      expect(WEIGHTS_BY_PERIOD.day).toEqual(WEIGHTS);
    });
  });
});
