const { scoreRoute } = require('./routeScoring.service');
const { getTimePeriod } = require('./timeOfDay');
const { buildExplanation } = require('./explain');

/**
 * Factory creating the routes safety service with an injected OpenRouteService client.
 *
 * @param {Object} options
 * @param {Object} options.orsClient - Initialized ORS client instance
 * @param {Function|Date} [options.now=() => new Date()] - Clock provider for deterministic testing
 * @returns {{ getSafeRoutes: Function }}
 */
function createRoutesService({ orsClient, now = () => new Date() }) {
  if (!orsClient || typeof orsClient.getRoutes !== 'function') {
    throw new Error('createRoutesService requires an `orsClient` instance with a `getRoutes` method');
  }

  /**
   * Retrieves alternative walking routes, scores each route using the safety engine,
   * tags the fastest route, and sorts them by safety score descending.
   *
   * @param {Object} params
   * @param {Object} params.origin - { coordinates: [lng, lat] }
   * @param {Object} params.destination - { coordinates: [lng, lat] }
   * @param {Object} [params.preferences] - User preferences (accepted but ignored for now)
   * @param {string} [params.departureTime] - Optional ISO 8601 departure timestamp
   * @returns {Promise<{ routes: Array<Object>, timeOfDay: string }>} Sorted safe routes and period
   */
  async function getSafeRoutes({ origin, destination, preferences, departureTime }) {
    // 1. Fetch raw walking routes from OpenRouteService
    const rawRoutes = await orsClient.getRoutes({ origin, destination });

    if (!Array.isArray(rawRoutes) || rawRoutes.length === 0) {
      const err = new Error('No route found');
      err.statusCode = 404;
      throw err;
    }

    const currentNow = typeof now === 'function' ? now() : now;
    const period = departureTime
      ? getTimePeriod(new Date(departureTime))
      : getTimePeriod(currentNow);

    // 2. Score each route in parallel
    const scoredRoutes = await Promise.all(
      rawRoutes.map(async (route, index) => {
        const routeId = `route_${index + 1}`; // n starts at 1, in ORS order
        const scoring = await scoreRoute(route.coordinates, {
          timeOfDay: period,
          now: currentNow
        });

        const explanation = buildExplanation(scoring.details, period);

        return {
          routeId,
          safetyScore: scoring.safetyScore,
          color: scoring.color,
          distanceMeters: Math.round(route.distanceMeters),
          durationSeconds: Math.round(route.durationSeconds),
          polyline: route.polyline,
          explanation,
          safetyFactors: {
            lightingScore: scoring.safetyFactors.lightingScore,
            policeProximityScore: scoring.safetyFactors.policeProximityScore,
            incidentDecayScore: Math.round(scoring.safetyFactors.incidentDecayScore)
          }
        };
      })
    );

    // 3. Mark the fastest route (lowest durationSeconds)
    const minDuration = Math.min(...scoredRoutes.map((r) => r.durationSeconds));
    const routesWithFastest = scoredRoutes.map((r) => ({
      ...r,
      isFastest: r.durationSeconds === minDuration
    }));

    // 4. Sort routes: highest safetyScore first; ties broken by shortest duration
    routesWithFastest.sort((a, b) => {
      if (b.safetyScore !== a.safetyScore) {
        return b.safetyScore - a.safetyScore;
      }
      return a.durationSeconds - b.durationSeconds;
    });

    return {
      routes: routesWithFastest,
      timeOfDay: period
    };
  }

  return {
    getSafeRoutes
  };
}

module.exports = {
  createRoutesService
};

