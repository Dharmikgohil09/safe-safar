const { buildExplanation } = require('../explain');

describe('Route Explanation Builder (explain.js)', () => {
  describe('Period sentences', () => {
    test('night-time prepends period sentence', () => {
      const explanation = buildExplanation(
        {
          activeReportCount: 0,
          lightingDataAvailable: false,
          litSamplePercent: null,
          nearestSafePlace: null
        },
        'night'
      );
      expect(explanation.startsWith('Night-time: lighting and reports count more.')).toBe(true);
    });

    test('evening prepends evening sentence', () => {
      const explanation = buildExplanation(
        {
          activeReportCount: 0,
          lightingDataAvailable: false,
          litSamplePercent: null,
          nearestSafePlace: null
        },
        'evening'
      );
      expect(explanation.startsWith('Evening: lighting counts slightly more.')).toBe(true);
    });

    test('day has no period sentence', () => {
      const explanation = buildExplanation(
        {
          activeReportCount: 0,
          lightingDataAvailable: false,
          litSamplePercent: null,
          nearestSafePlace: null
        },
        'day'
      );
      expect(explanation.startsWith('No active community reports along this route.')).toBe(true);
      expect(explanation).not.toContain('Night-time:');
      expect(explanation).not.toContain('Evening:');
    });
  });

  describe('Community report sentence branches', () => {
    const baseDetails = {
      lightingDataAvailable: false,
      litSamplePercent: null,
      nearestSafePlace: null
    };

    test('0 reports -> "No active community reports along this route."', () => {
      const result = buildExplanation({ ...baseDetails, activeReportCount: 0 }, 'day');
      expect(result).toContain('No active community reports along this route.');
    });

    test('1 report -> "1 community report near this route."', () => {
      const result = buildExplanation({ ...baseDetails, activeReportCount: 1 }, 'day');
      expect(result).toContain('1 community report near this route.');
    });

    test('many reports -> "{n} community reports near this route."', () => {
      const result = buildExplanation({ ...baseDetails, activeReportCount: 4 }, 'day');
      expect(result).toContain('4 community reports near this route.');
    });
  });

  describe('Lighting sentence branches and boundaries (70, 69, 40, 39)', () => {
    const baseDetails = {
      activeReportCount: 0,
      nearestSafePlace: null
    };

    test('lighting unavailable when lightingDataAvailable is false or litSamplePercent is null', () => {
      const resFalse = buildExplanation(
        { ...baseDetails, lightingDataAvailable: false, litSamplePercent: 100 },
        'day'
      );
      expect(resFalse).toContain('Lighting data is not available for this area.');

      const resNull = buildExplanation(
        { ...baseDetails, lightingDataAvailable: true, litSamplePercent: null },
        'day'
      );
      expect(resNull).toContain('Lighting data is not available for this area.');
    });

    test('boundary >= 70: mostly well lit at 70%', () => {
      const result = buildExplanation(
        { ...baseDetails, lightingDataAvailable: true, litSamplePercent: 70 },
        'day'
      );
      expect(result).toContain('Mostly well lit (70% of the route is near street lights).');
    });

    test('boundary 40-69: partly lit at 69%', () => {
      const result = buildExplanation(
        { ...baseDetails, lightingDataAvailable: true, litSamplePercent: 69 },
        'day'
      );
      expect(result).toContain('Partly lit (69% of the route is near street lights).');
    });

    test('boundary 40-69: partly lit at 40%', () => {
      const result = buildExplanation(
        { ...baseDetails, lightingDataAvailable: true, litSamplePercent: 40 },
        'day'
      );
      expect(result).toContain('Partly lit (40% of the route is near street lights).');
    });

    test('boundary < 40: poorly lit at 39%', () => {
      const result = buildExplanation(
        { ...baseDetails, lightingDataAvailable: true, litSamplePercent: 39 },
        'day'
      );
      expect(result).toContain('Poorly lit (39% of the route is near street lights).');
    });
  });

  describe('Nearest safe place sentence branches', () => {
    const baseDetails = {
      activeReportCount: 0,
      lightingDataAvailable: false,
      litSamplePercent: null
    };

    test('null safe place -> "No police or hospital data for this area."', () => {
      const result = buildExplanation({ ...baseDetails, nearestSafePlace: null }, 'day');
      expect(result).toContain('No police or hospital data for this area.');
    });

    test('police station with name and distance rounded to nearest 10m', () => {
      const result = buildExplanation(
        {
          ...baseDetails,
          nearestSafePlace: {
            name: 'Chowk Police Station',
            category: 'police',
            distanceMeters: 124 // rounds to 120
          }
        },
        'day'
      );
      expect(result).toContain('Nearest police station is Chowk Police Station about 120 m from the route.');
    });

    test('hospital with name and distance rounded to nearest 10m', () => {
      const result = buildExplanation(
        {
          ...baseDetails,
          nearestSafePlace: {
            name: 'Surat Civil Hospital',
            category: 'hospital',
            distanceMeters: 247 // rounds to 250
          }
        },
        'day'
      );
      expect(result).toContain('Nearest hospital is Surat Civil Hospital about 250 m from the route.');
    });

    test('safe place with missing or blank name', () => {
      const resultNoName = buildExplanation(
        {
          ...baseDetails,
          nearestSafePlace: {
            category: 'police',
            distanceMeters: 81 // rounds to 80
          }
        },
        'day'
      );
      expect(resultNoName).toContain('Nearest police station is about 80 m from the route.');

      const resultEmptyName = buildExplanation(
        {
          ...baseDetails,
          nearestSafePlace: {
            name: '   ',
            category: 'hospital',
            distanceMeters: 54 // rounds to 50
          }
        },
        'day'
      );
      expect(resultEmptyName).toContain('Nearest hospital is about 50 m from the route.');
    });
  });

  describe('Exact full string integration example', () => {
    test('produces exact deterministic plain-language string joined by one space', () => {
      const details = {
        activeReportCount: 2,
        lightingDataAvailable: true,
        litSamplePercent: 85,
        landmarkDataAvailable: true,
        nearestSafePlace: {
          name: 'Athwa Police Station',
          category: 'police',
          distanceMeters: 143 // rounds to 140
        },
        sampleCount: 15
      };

      const explanation = buildExplanation(details, 'night');

      const expected =
        'Night-time: lighting and reports count more. ' +
        '2 community reports near this route. ' +
        'Mostly well lit (85% of the route is near street lights). ' +
        'Nearest police station is Athwa Police Station about 140 m from the route.';

      expect(explanation).toBe(expected);
    });
  });
});
