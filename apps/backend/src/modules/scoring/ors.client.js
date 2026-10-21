const { decodePolyline } = require('./polyline');

/**
 * Custom error carrying an HTTP status code for routing service failures.
 */
class OrsError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'OrsError';
    this.statusCode = statusCode;
  }
}

/**
 * Creates an OpenRouteService API client.
 *
 * NOTE: OpenRouteService free-tier request limits (rate per minute and daily quotas)
 * must be verified in the ORS developer dashboard and documentation.
 *
 * @param {Object} options
 * @param {string} options.apiKey - ORS API key
 * @param {Function} [options.fetchImpl=fetch] - Fetch function (allows injecting mock for testing)
 * @param {string} [options.baseUrl="https://api.openrouteservice.org"] - Base URL
 * @param {string} [options.profile="foot-walking"] - Routing profile
 * @returns {{ getRoutes: Function }}
 */
function createOrsClient({
  apiKey,
  fetchImpl = fetch,
  baseUrl = 'https://api.openrouteservice.org',
  profile = 'foot-walking'
} = {}) {
  /**
   * Helper to execute a single POST request to ORS.
   */
  async function callOrs(body) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/v2/directions/${profile}`, {
        method: 'POST',
        headers: {
          Authorization: apiKey, // The key itself, no "Bearer" prefix
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json'
        },
        body: JSON.stringify(body)
      });
    } catch {
      // Network failure or fetch exception
      throw new OrsError('Routing provider error', 502);
    }
    return response;
  }

  /**
   * Fetches walking routes between origin and destination.
   *
   * @param {Object} params
   * @param {Object|Array<number>} params.origin - { coordinates: [lng, lat] } or [lng, lat]
   * @param {Object|Array<number>} params.destination - { coordinates: [lng, lat] } or [lng, lat]
   * @returns {Promise<Array<{ distanceMeters: number, durationSeconds: number, polyline: string, coordinates: Array<Array<number>> }>>}
   */
  async function getRoutes({ origin, destination }) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new OrsError('Routing service is not configured', 503);
    }

    const originCoords = Array.isArray(origin) ? origin : origin?.coordinates;
    const destCoords = Array.isArray(destination) ? destination : destination?.coordinates;

    const basePayload = {
      coordinates: [originCoords, destCoords]
    };

    // First attempt: request alternative routes
    const initialPayload = {
      ...basePayload,
      alternative_routes: {
        target_count: 3,
        share_factor: 0.6,
        weight_factor: 1.4
      }
    };

    let response = await callOrs(initialPayload);

    // If ORS returns 400 with alternative_routes, retry ONCE without alternative_routes
    if (response.status === 400) {
      response = await callOrs(basePayload);
      if (response.status === 400 || response.status === 404) {
        throw new OrsError('No route found', 404);
      }
    } else if (response.status === 404) {
      throw new OrsError('No route found', 404);
    }

    if (response.status === 429) {
      throw new OrsError('Routing service is busy, try again shortly', 503);
    }

    if (!response.ok) {
      throw new OrsError('Routing provider error', 502);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new OrsError('Routing provider error', 502);
    }

    if (!data || !Array.isArray(data.routes) || data.routes.length === 0) {
      throw new OrsError('No route found', 404);
    }

    return data.routes.map((route) => {
      const geometry = route.geometry || '';
      return {
        distanceMeters: route.summary?.distance ?? 0,
        durationSeconds: route.summary?.duration ?? 0,
        polyline: geometry,
        coordinates: decodePolyline(geometry)
      };
    });
  }

  return {
    getRoutes
  };
}

module.exports = {
  createOrsClient,
  OrsError
};
