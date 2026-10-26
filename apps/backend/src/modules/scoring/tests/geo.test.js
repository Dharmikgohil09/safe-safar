const { haversineMeters, samplePath, boundingBox } = require('../geo');
const { SAMPLE_INTERVAL_M } = require('../constants');

describe('Geo utilities', () => {
  describe('haversineMeters', () => {
    test('haversineMeters of a known pair is roughly right', () => {
      // 1 degree of latitude along the prime meridian on a sphere of radius 6,371,000 m
      // is ~111,195 meters.
      const p1 = [0, 0];
      const p2 = [0, 1];
      const distance = haversineMeters(p1, p2);
      expect(distance).toBeGreaterThan(111000);
      expect(distance).toBeLessThan(112000);

      // Surat [72.8311, 21.1702] to Mumbai [72.8777, 19.0760] is ~233-235 km
      const surat = [72.8311, 21.1702];
      const mumbai = [72.8777, 19.076];
      const cityDist = haversineMeters(surat, mumbai);
      expect(cityDist).toBeGreaterThan(230000);
      expect(cityDist).toBeLessThan(240000);
    });

    test('returns 0 for identical points or invalid inputs', () => {
      expect(haversineMeters([72.8311, 21.1702], [72.8311, 21.1702])).toBe(0);
      expect(haversineMeters(null, [72.8311, 21.1702])).toBe(0);
      expect(haversineMeters([], [72.8311, 21.1702])).toBe(0);
    });
  });

  describe('samplePath', () => {
    test('samplePath spacing is about 50 m on a straight 500 m line and includes first and last points', () => {
      const start = [72.8311, 21.1702];
      // Move 500m north: dLat = (500 / 6371000) * (180 / Math.PI)
      const dLat = (500 / 6371000) * (180 / Math.PI);
      const end = [72.8311, 21.1702 + dLat];

      const lineDistance = haversineMeters(start, end);
      expect(lineDistance).toBeCloseTo(500, 0);

      const samples = samplePath([start, end], 50);

      // 500m / 50m = 10 segments -> 11 sample points
      expect(samples.length).toBe(11);

      // Verify first point equals start
      expect(samples[0][0]).toBeCloseTo(start[0], 6);
      expect(samples[0][1]).toBeCloseTo(start[1], 6);

      // Verify last point equals end
      expect(samples[samples.length - 1][0]).toBeCloseTo(end[0], 6);
      expect(samples[samples.length - 1][1]).toBeCloseTo(end[1], 6);

      // Verify consecutive point spacing is about 50m
      for (let i = 0; i < samples.length - 1; i++) {
        const stepDist = haversineMeters(samples[i], samples[i + 1]);
        expect(stepDist).toBeCloseTo(50, 0);
      }
    });

    test('a single coordinate and duplicated points do not crash', () => {
      // Empty input
      expect(samplePath([])).toEqual([]);
      expect(samplePath(null)).toEqual([]);

      // Single coordinate
      const single = [[72.8311, 21.1702]];
      const singleSample = samplePath(single);
      expect(singleSample.length).toBe(1);
      expect(singleSample[0]).toEqual([72.8311, 21.1702]);

      // Duplicated identical coordinates (zero length segment)
      const duplicated = [
        [72.8311, 21.1702],
        [72.8311, 21.1702]
      ];
      const dupSample = samplePath(duplicated);
      expect(dupSample.length).toBe(1);
      expect(dupSample[0]).toEqual([72.8311, 21.1702]);

      // Duplicated points in a polyline
      const dLat = (100 / 6371000) * (180 / Math.PI);
      const withDup = [
        [72.8311, 21.1702],
        [72.8311, 21.1702],
        [72.8311, 21.1702 + dLat]
      ];
      const res = samplePath(withDup, 50);
      expect(res.length).toBeGreaterThanOrEqual(2);
      expect(res[0]).toEqual([72.8311, 21.1702]);
      expect(res[res.length - 1][1]).toBeCloseTo(21.1702 + dLat, 6);
    });
  });

  describe('boundingBox', () => {
    test('boundingBox contains all points', () => {
      const points = [
        [72.8311, 21.1702],
        [72.835, 21.175],
        [72.828, 21.168]
      ];

      // Unpadded bounding box
      const box = boundingBox(points, 0);
      for (const pt of points) {
        expect(pt[0]).toBeGreaterThanOrEqual(box.minLng);
        expect(pt[0]).toBeLessThanOrEqual(box.maxLng);
        expect(pt[1]).toBeGreaterThanOrEqual(box.minLat);
        expect(pt[1]).toBeLessThanOrEqual(box.maxLat);
      }

      // Padded bounding box
      const padded = boundingBox(points, 100);
      for (const pt of points) {
        expect(pt[0]).toBeGreaterThan(padded.minLng);
        expect(pt[0]).toBeLessThan(padded.maxLng);
        expect(pt[1]).toBeGreaterThan(padded.minLat);
        expect(pt[1]).toBeLessThan(padded.maxLat);
      }
    });

    test('handles empty or degenerate points gracefully', () => {
      expect(boundingBox([])).toEqual({ minLng: 0, minLat: 0, maxLng: 0, maxLat: 0 });
      expect(boundingBox(null)).toEqual({ minLng: 0, minLat: 0, maxLng: 0, maxLat: 0 });
    });
  });
});
