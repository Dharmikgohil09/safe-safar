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
      report,
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

/**
 * GET /reports/nearby?lat=&lng=&radius=
 * Retrieve reports near coordinates using $geoNear (public)
 */
async function getNearbyReports(req, res, next) {
  try {
    let lat, lng;
    if (req.query.lat !== undefined && req.query.lng !== undefined) {
      lat = Number(req.query.lat);
      lng = Number(req.query.lng);
    } else if (req.query.near) {
      const parts = req.query.near.split(',').map(Number);
      lng = parts[0];
      lat = parts[1];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Query parameter lat and lng (or near=lng,lat) are required.'
      });
    }

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.'
      });
    }

    const radius = req.query.radius ? Number(req.query.radius) : 1000;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const reports = await reportsService.getNearbyReports({ lat, lng, radius, limit });
    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
      data: reports
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReport,
  confirmReport,
  listReports,
  getNearbyReports
};
