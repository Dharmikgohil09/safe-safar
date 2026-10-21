const { calculateDecayWeight } = require('../decay');

describe('calculateDecayWeight', () => {
  const baseTime = new Date('2026-05-15T12:00:00.000Z');

  test('returns 1 for a report created right now (0 days old)', () => {
    const weight = calculateDecayWeight(baseTime, baseTime);
    expect(weight).toBeCloseTo(1.0, 5);
  });

  test('returns 0.5 for a report created exactly 7 days ago', () => {
    const sevenDaysAgo = new Date(baseTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weight = calculateDecayWeight(sevenDaysAgo, baseTime);
    expect(weight).toBeCloseTo(0.5, 5);
  });

  test('returns 0.25 for a report created exactly 14 days ago (2 half-lives)', () => {
    const fourteenDaysAgo = new Date(baseTime.getTime() - 14 * 24 * 60 * 60 * 1000);
    const weight = calculateDecayWeight(fourteenDaysAgo, baseTime);
    expect(weight).toBeCloseTo(0.25, 5);
  });

  test('clamps future dates (negative age) to weight = 1', () => {
    const futureDate = new Date(baseTime.getTime() + 3 * 24 * 60 * 60 * 1000);
    const weight = calculateDecayWeight(futureDate, baseTime);
    expect(weight).toBe(1.0);
  });
});
