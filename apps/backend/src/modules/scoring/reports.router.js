const express = require('express');
const reportsController = require('./reports.controller');
const {
  createReportBodySchema,
  listReportsQuerySchema,
  reportIdParamSchema,
  validateRequest
} = require('./reports.validation');

/**
 * Creates and returns the reports Express router.
 * Injects requireAuth middleware so Dharmik's auth can be provided cleanly.
 *
 * @param {Object} options
 * @param {Function} options.requireAuth - Authentication middleware
 * @returns {express.Router}
 */
function createReportsRouter({ requireAuth }) {
  if (typeof requireAuth !== 'function') {
    throw new Error('createReportsRouter requires a `requireAuth` middleware function');
  }

  const router = express.Router();

  // POST / (auth required)
  router.post(
    '/',
    requireAuth,
    validateRequest({ body: createReportBodySchema }),
    reportsController.createReport
  );

  // GET / (public, no auth)
  router.get(
    '/',
    validateRequest({ query: listReportsQuerySchema }),
    reportsController.listReports
  );

  // POST /:id/confirm (auth required)
  router.post(
    '/:id/confirm',
    requireAuth,
    validateRequest({ params: reportIdParamSchema }),
    reportsController.confirmReport
  );

  return router;
}

module.exports = {
  createReportsRouter
};
