/**
 * Controller factory for route safety endpoints.
 *
 * @param {Object} options
 * @param {Object} options.routesService - Safe routes service instance
 * @returns {{ getSafeRoutes: Function }}
 */
function createRoutesController({ routesService }) {
  /**
   * POST /safe
   * Calculates safe walking routes between origin and destination.
   */
  async function getSafeRoutes(req, res, next) {
    try {
      const { origin, destination, preferences } = req.body;
      const routes = await routesService.getSafeRoutes({
        origin,
        destination,
        preferences
      });

      return res.status(200).json({
        success: true,
        data: {
          routes
        }
      });
    } catch (error) {
      if (error && typeof error.statusCode === 'number') {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  return {
    getSafeRoutes
  };
}

module.exports = {
  createRoutesController
};
