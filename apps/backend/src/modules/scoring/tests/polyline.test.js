const { encodePolyline, decodePolyline } = require('../polyline');

describe('Polyline Encoding and Decoding (polyline.js)', () => {
  // Official Google Polyline test vector:
  // Points: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
  // In [lng, lat] format: [[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]]
  const googleEncoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
  const expectedGoogleCoords = [
    [-120.2, 38.5],
    [-120.95, 40.7],
    [-126.453, 43.252]
  ];

  test('decodes a known encoded sample to expected coordinates', () => {
    const decoded = decodePolyline(googleEncoded);
    expect(decoded.length).toBe(3);

    for (let i = 0; i < decoded.length; i++) {
      expect(decoded[i][0]).toBeCloseTo(expectedGoogleCoords[i][0], 5);
      expect(decoded[i][1]).toBeCloseTo(expectedGoogleCoords[i][1], 5);
    }
  });

  test('round trip encodes and decodes coordinates correctly', () => {
    const original = [
      [72.8311, 21.1702],
      [72.835, 21.1745],
      [72.84, 21.18]
    ];

    const encoded = encodePolyline(original);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodePolyline(encoded);
    expect(decoded.length).toBe(original.length);

    for (let i = 0; i < decoded.length; i++) {
      expect(decoded[i][0]).toBeCloseTo(original[i][0], 4);
      expect(decoded[i][1]).toBeCloseTo(original[i][1], 4);
    }
  });

  test('handles empty and invalid inputs gracefully', () => {
    expect(encodePolyline([])).toBe('');
    expect(encodePolyline(null)).toBe('');
    expect(decodePolyline('')).toEqual([]);
    expect(decodePolyline(null)).toEqual([]);
  });
});
