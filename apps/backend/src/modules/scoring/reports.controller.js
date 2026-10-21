const reportsService = require('./reports.service');

/**
 * POST /reports
 * Create a new safety report (requires authentication)
 */
async function createReport(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identifier missing from request'
      });
    }

    const report = await reportsService.createReport(userId, req.body);

    return res.status(201).json({
      success: true,
      message: 'Report submitted',
      data: report
    });
  } catch (error) {
    if (error.name === 'ServiceError') {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
}

/**
 * POST /reports/:id/confirm
 * Confirm an existing report (requires authentication)
 */
async function confirmReport(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identifier missing from request'
      });
    }

    const { id } = req.params;
    const result = await reportsService.confirmReport(id, userId);

    return res.status(200).json({
      success: true,
      message: 'Report confirmed',
      data: result
    });
  } catch (error) {
    if (error.name === 'ServiceError') {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
}

/**
 * GET /reports
 * Retrieve active or near reports (public, no authentication required)
 */
async function listReports(req, res, next) {
  try {
    const { near, radius, limit, includePending } = req.query;
    const reports = await reportsService.listReports({
      near,
      radius,
      limit,
      includePending
    });

    return res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    if (error.name === 'ServiceError') {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
}

module.exports = {
  createReport,
  confirmReport,
  listReports
};
