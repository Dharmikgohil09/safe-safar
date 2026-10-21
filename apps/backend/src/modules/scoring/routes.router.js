const express = require('express');
const { createOrsClient } = require('./ors.client');
const { createRoutesService } = require('./routes.service');
const { createRoutesController } = require('./routes.controller');
const { safeRoutesBodySchema, validateRequest } = require('./routes.validation');

/**
 * Creates and returns the Express router for route safety.
 * Route path inside this router is POST "/safe" (mounted at "/routes" by core app).
 *
 * @param {Object} [options]
 * @param {Object} [options.orsClient] - Optional injected ORS client instance (for testing or mocking)
 * @returns {express.Router}
 */
function createRoutesRouter({ orsClient, now = () => new Date() } = {}) {
  const router = express.Router();

  // POST /safe (public, no authentication required)
  router.post(
    '/safe',
    validateRequest({ body: safeRoutesBodySchema }),
    async (req, res, next) => {
      try {
        const client =
          orsClient ||
          createOrsClient({
            apiKey: process.env.ORS_API_KEY
          });

        const routesService = createRoutesService({ orsClient: client, now });
        const controller = createRoutesController({ routesService });

        return await controller.getSafeRoutes(req, res, next);
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
  );

  return router;
}

module.exports = {
  createRoutesRouter
};
