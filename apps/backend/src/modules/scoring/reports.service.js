const mongoose = require('mongoose');
const { Report } = require('./models');
const { calculateDecayWeight } = require('./decay');
const { MIN_CONFIRMATIONS } = require('./constants');

/**
 * Custom operational error carrying an HTTP status code
 */
class ServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
  }
}

/**
 * Pure function: Determines whether a report is active.
 * Counts distinct confirmation userIds excluding the reporter.
 * Active if >= MIN_CONFIRMATIONS (2).
 *
 * @param {Object} report
 * @returns {boolean}
 */
function isReportActive(report) {
  if (!report) {
    return false;
  }
  if (!Array.isArray(report.confirmations)) {
    return false;
  }
  const reporterId = report.reporterId ? String(report.reporterId) : null;
  const distinctUserIds = new Set();

  for (const c of report.confirmations) {
    if (c && c.userId) {
      const uid = String(c.userId);
      if (uid !== reporterId) {
        distinctUserIds.add(uid);
      }
    }
  }

  return distinctUserIds.size >= MIN_CONFIRMATIONS;
}

/**
 * Maps DB report document or aggregation object to safe client DTO.
 * Exposes 'description' instead of DB field 'note'.
 * Omits raw reporterId and individual confirmation user IDs.
 *
 * @param {Object} report
 * @param {Date} [now=new Date()]
 * @returns {Object}
 */
function toReportDto(report, now = new Date()) {
  const doc = report.toObject ? report.toObject() : report;
  const active = isReportActive(doc);
  const confirmationCount = Array.isArray(doc.confirmations) ? doc.confirmations.length : 0;
  const weight = calculateDecayWeight(doc.createdAt, now);

  const dto = {
    _id: String(doc._id),
    reportId: String(doc._id),
    category: doc.category || doc.type || 'other',
    type: doc.type || doc.category || 'other',
    description: doc.description || doc.note || '',
    note: doc.note || doc.description || '',
    address: doc.address || '',
    status: doc.status || 'active',
    location: {
      type: doc.location?.type || 'Point',
      coordinates: doc.location?.coordinates || [0, 0]
    },
    coordinates: doc.location?.coordinates ? [...doc.location.coordinates] : [0, 0],
    reporter: doc.reporter ? String(doc.reporter) : (doc.reporterId || null),
    reporterId: doc.reporterId || (doc.reporter ? String(doc.reporter) : ''),
    confirmationCount,
    confirmationsCount: confirmationCount,
    isActive: active,
    weight,
    createdAt: doc.createdAt,
    id: String(doc._id),
    confirmations: confirmationCount,
    verified: active
  };

  if (typeof doc.distanceMeters === 'number') {
    dto.distanceMeters = Math.round(doc.distanceMeters * 10) / 10;
  }

  return dto;
}

/**
 * Creates a new report submitted by userId.
 *
 * @param {string|ObjectId} userId - Reporter user ID
 * @param {Object} input - { category, type, location, latitude, longitude, description, note, address }
 * @returns {Promise<Object>} Safe report DTO
 */
async function createReport(userId, input) {
  const category = input.category || input.type || 'other';
  const description = (input.description || input.note || '').trim();
  const address = (input.address || '').trim();

  let location;
  if (input.location && Array.isArray(input.location.coordinates)) {
    location = {
      type: 'Point',
      coordinates: input.location.coordinates
    };
  } else if (input.latitude !== undefined && input.longitude !== undefined) {
    location = {
      type: 'Point',
      coordinates: [input.longitude, input.latitude] // GeoJSON [lng, lat]
    };
  } else {
    throw new ServiceError('Valid location coordinates [longitude, latitude] required', 400);
  }

  const reportData = {
    category,
    type: category,
    location,
    description,
    note: description,
    address,
    status: 'pending',
    confirmations: []
  };

  if (mongoose.isValidObjectId(userId)) {
    reportData.reporter = new mongoose.Types.ObjectId(userId);
    reportData.reporterId = String(userId);
  } else {
    reportData.reporterId = String(userId);
  }

  const report = new Report(reportData);
  await report.save();
  return toReportDto(report);
}

/**
 * Gets nearby safety reports for a given coordinate and radius
 * Uses 2dsphere $geoNear aggregation
 *
 * @param {Object} options - { lat, lng, radius, limit }
 * @returns {Promise<Array<Object>>}
 */
async function getNearbyReports({ lat, lng, radius = 1000, limit = 50 }) {
  const now = new Date();
  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat] // [lng, lat]
        },
        key: 'location',
        spherical: true,
        distanceField: 'distanceMeters',
        maxDistance: radius
      }
    },
    { $limit: limit }
  ];

  const results = await Report.aggregate(pipeline);
  return results.map((r) => toReportDto(r, now));
}

/**
 * Atomically confirms a report by another user.
 *
 * @param {string} reportId - 24-hex string or ObjectId
 * @param {string} userId - Confirming user ID
 * @returns {Promise<Object>} { _id, confirmationCount, isActive }
 */
async function confirmReport(reportId, userId) {
  const normalizedUserId = String(userId);

  // Atomic update: report exists, reporterId != userId, and userId not already in confirmations
  const updatedReport = await Report.findOneAndUpdate(
    {
      _id: reportId,
      reporterId: { $ne: normalizedUserId },
      'confirmations.userId': { $ne: normalizedUserId }
    },
    {
      $push: {
        confirmations: {
          userId: normalizedUserId,
          at: new Date()
        }
      }
    },
    { new: true }
  );

  if (updatedReport) {
    return {
      _id: String(updatedReport._id),
      reportId: String(updatedReport._id),
      confirmationCount: updatedReport.confirmations.length,
      confirmationsCount: updatedReport.confirmations.length,
      isActive: isReportActive(updatedReport)
    };
  }

  // If nothing matched, inspect the report state to return the exact HTTP status code
  const existing = await Report.findById(reportId);
  if (!existing) {
    throw new ServiceError('Report not found', 404);
  }

  if (String(existing.reporterId) === normalizedUserId) {
    throw new ServiceError('You cannot confirm your own report', 403);
  }

  const alreadyConfirmed = existing.confirmations.some(
    (c) => String(c.userId) === normalizedUserId
  );
  if (alreadyConfirmed) {
    throw new ServiceError('You have already confirmed this report', 409);
  }

  throw new ServiceError('Unable to confirm report', 400);
}

/**
 * Lists community reports.
 * If near is provided, runs $geoNear aggregation.
 * By default, returns only active reports (confirmations.length >= MIN_CONFIRMATIONS).
 * If includePending is true, returns both active and pending reports.
 *
 * @param {Object} options - { near, radius, limit, includePending }
 * @returns {Promise<Array<Object>>} Array of report DTOs
 */
async function listReports({ near, radius, limit, includePending }) {
  const now = new Date();
  const pipeline = [];

  if (near) {
    const [lng, lat] = near.split(',').map(Number);
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        key: 'location',
        spherical: true,
        distanceField: 'distanceMeters',
        maxDistance: radius
      }
    });
  }

  // Filter pending reports unless includePending is true
  if (!includePending) {
    pipeline.push({
      $match: {
        $expr: {
          $gte: [{ $size: '$confirmations' }, MIN_CONFIRMATIONS]
        }
      }
    });
  }

  // If not using $geoNear, sort by newest first
  if (!near) {
    pipeline.push({
      $sort: { createdAt: -1 }
    });
  }

  pipeline.push({
    $limit: limit
  });

  const reports = await Report.aggregate(pipeline);
  return reports.map((doc) => toReportDto(doc, now));
}

module.exports = {
  ServiceError,
  isReportActive,
  toReportDto,
  createReport,
  confirmReport,
  listReports,
  getNearbyReports
};
