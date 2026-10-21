import { GeocodingService } from '../src/services/geocodingService';

describe('GeocodingService Tests', () => {
  const geocodingService = new GeocodingService();
  const svnitCoords = { latitude: 21.1648, longitude: 72.7848 };

  test('searchPlaces returns matching Surat spots for query', async () => {
    const results = await geocodingService.searchPlaces('Adajan', svnitCoords);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const match = results.find((r) => r.name.toLowerCase().includes('adajan'));
    expect(match).toBeDefined();
    expect(match?.coordinates.latitude).toBeCloseTo(21.196, 2);
  });

  test('searchPlaces returns curated spots on empty query', async () => {
    const spots = await geocodingService.searchPlaces('', svnitCoords);
    expect(spots.length).toBeGreaterThanOrEqual(5);
    expect(spots[0].formattedDistance).toBeDefined();
  });

  test('reverseGeocode returns friendly name near SVNIT', async () => {
    const geo = await geocodingService.reverseGeocode(svnitCoords);
    expect(geo.name).toBeDefined();
    expect(typeof geo.name).toBe('string');
  });
});
