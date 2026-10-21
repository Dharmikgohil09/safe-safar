/**
 * SafeSafar - Safety Scoring & Safe Routing Router
 * Owner: Satej (@satej)
 *
 * Mounts Satej's production safety scoring engine, community incident reporting,
 * trust & time decay, and safe route routing.
 */

const { requireAuth } = require('../../middleware/auth.middleware');
const { createReportsRouter } = require('./reports.router');
const { createRoutesRouter } = require('./routes.router');

const routesRouter = createRoutesRouter();
const reportsRouter = createReportsRouter({ requireAuth });

module.exports = {
  routesRouter,
  reportsRouter
};
