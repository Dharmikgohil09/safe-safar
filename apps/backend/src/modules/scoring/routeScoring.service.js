const { Report, Landmark, LightPoint } = require('./models');
const { calculateDecayWeight } = require('./decay');
const { isReportActive } = require('./reports.service');
const { samplePath, haversineMeters, boundingBox } = require('./geo');
const {
  MIN_CONFIRMATIONS,
  LIGHT_RADIUS_M,
  REPORT_RADIUS_M,
  POLICE_MAX_DISTANCE_M,
  REPORT_PENALTY,
  NEUTRAL_SCORE,
  WEIGHTS,
  COLOR_THRESHOLDS
} = require('./constants');

/**
 * Maps a numerical safety score (0-100) to its corresponding color tier.
 * Pure function:
 *   >= 70 -> 'green'
 *   >= 40 -> 'yellow'
 *   < 40  -> 'red'
 *
 * @param {number} score
 * @returns {'green' | 'yellow' | 'red'}
 */
function colorForScore(score) {
  if (typeof score !== 'number' || isNaN(score)) {
    return 'red';
  }
  if (score >= COLOR_THRESHOLDS.green) {
    return 'green';
  }
  if (score >= COLOR_THRESHOLDS.yellow) {
    return 'yellow';
  }
  return 'red';
}

/**
 * Scores a route polyline based on incident reports, street lighting, and police/hospital proximity.
 *
 * @param {Array<Array<number>>} coordinates - Polyline coordinates as [[lng, lat], ...]
 * @param {Object} [options]
 * @param {Date} [options.now=new Date()] - Reference timestamp for report time decay
 * @returns {Promise<{
 *   safetyScore: number,
 *   color: 'green' | 'yellow' | 'red',
 *   safetyFactors: {
 *     lightingScore: number,
 *     policeProximityScore: number,
 *     incidentDecayScore: number
 *   },
 *   sampleCount: number
 * }>}
 */
async function scoreRoute(coordinates, { now = new Date() } = {}) {
  // Step a: Sample path points at ~50m intervals
  const samples = samplePath(coordinates);

  if (samples.length === 0) {
    const incidentDecayScore = 100;
    const lightingScore = NEUTRAL_SCORE;
    const policeProximityScore = NEUTRAL_SCORE;
    const weighted =
      WEIGHTS.incident * incidentDecayScore +
      WEIGHTS.lighting * lightingScore +
      WEIGHTS.police * policeProximityScore;
    const safetyScore = Math.max(0, Math.min(100, Math.round(weighted)));

    return {
      safetyScore,
      color: colorForScore(safetyScore),
      safetyFactors: {
        lightingScore,
        policeProximityScore,
        incidentDecayScore
      },
      sampleCount: 0
    };
  }

  // Step b: Calculate padded bounding boxes for each query
  const reportBox = boundingBox(samples, REPORT_RADIUS_M);
  const lightBox = boundingBox(samples, LIGHT_RADIUS_M);
  const landmarkBox = boundingBox(samples, POLICE_MAX_DISTANCE_M);

  // Fetch candidates using ONE query per collection with $geoWithin $box
  const [reportCandidates, lightCandidates, landmarkCandidates] = await Promise.all([
    Report.find({
      location: {
        $geoWithin: {
          $box: [
            [reportBox.minLng, reportBox.minLat],
            [reportBox.maxLng, reportBox.maxLat]
          ]
        }
      },
      $expr: {
        $gte: [{ $size: '$confirmations' }, MIN_CONFIRMATIONS]
      }
    }).lean(),

    LightPoint.find({
      location: {
        $geoWithin: {
          $box: [
            [lightBox.minLng, lightBox.minLat],
            [lightBox.maxLng, lightBox.maxLat]
          ]
        }
      }
    }).lean(),

    Landmark.find({
      category: { $in: ['police', 'hospital'] },
      location: {
        $geoWithin: {
          $box: [
            [landmarkBox.minLng, landmarkBox.minLat],
            [landmarkBox.maxLng, landmarkBox.maxLat]
          ]
        }
      }
    }).lean()
  ]);

  // Step c: incidentDecayScore
  // Active reports within REPORT_RADIUS_M of at least one sample point
  const activeReports = reportCandidates.filter(isReportActive);
  const matchingReports = [];

  for (const report of activeReports) {
    const [repLng, repLat] = report.location.coordinates;
    const isNearRoute = samples.some(
      (sample) => haversineMeters(sample, [repLng, repLat]) <= REPORT_RADIUS_M
    );
    if (isNearRoute) {
      matchingReports.push(report);
    }
  }

  let totalPenalty = 0;
  for (const rep of matchingReports) {
    const weight = calculateDecayWeight(rep.createdAt, now);
    totalPenalty += weight * REPORT_PENALTY;
  }

  const rawIncidentScore = 100 - totalPenalty;
  const incidentDecayScore = Math.max(
    0,
    Math.min(100, Math.round(rawIncidentScore * 100) / 100)
  );

  // Step d: lightingScore
  // 100 * fraction of samples with a LightPoint within LIGHT_RADIUS_M
  // If no LightPoint candidates in padded box, return NEUTRAL_SCORE
  let lightingScore;
  if (lightCandidates.length === 0) {
    lightingScore = NEUTRAL_SCORE;
  } else {
    let litSampleCount = 0;
    for (const sample of samples) {
      const isLit = lightCandidates.some((lp) => {
        const [lpLng, lpLat] = lp.location.coordinates;
        return haversineMeters(sample, [lpLng, lpLat]) <= LIGHT_RADIUS_M;
      });
      if (isLit) {
        litSampleCount++;
      }
    }
    lightingScore = Math.round((litSampleCount / samples.length) * 100);
  }

  // Step e: policeProximityScore
  // Average over samples of max(0, 1 - distanceToNearest / POLICE_MAX_DISTANCE_M) * 100
  // If no landmark candidates in padded box, return NEUTRAL_SCORE
  let policeProximityScore;
  if (landmarkCandidates.length === 0) {
    policeProximityScore = NEUTRAL_SCORE;
  } else {
    let totalScore = 0;
    for (const sample of samples) {
      let minDistance = Infinity;
      for (const lm of landmarkCandidates) {
        const [lmLng, lmLat] = lm.location.coordinates;
        const d = haversineMeters(sample, [lmLng, lmLat]);
        if (d < minDistance) {
          minDistance = d;
        }
      }
      const sampleScore = Math.max(0, 1 - minDistance / POLICE_MAX_DISTANCE_M) * 100;
      totalScore += sampleScore;
    }
    policeProximityScore = Math.round(totalScore / samples.length);
  }

  // Step f: safetyScore
  const weighted =
    WEIGHTS.incident * incidentDecayScore +
    WEIGHTS.lighting * lightingScore +
    WEIGHTS.police * policeProximityScore;
  const safetyScore = Math.max(0, Math.min(100, Math.round(weighted)));

  // Step g: color
  const color = colorForScore(safetyScore);

  return {
    safetyScore,
    color,
    safetyFactors: {
      lightingScore,
      policeProximityScore,
      incidentDecayScore
    },
    sampleCount: samples.length
  };
}

module.exports = {
  scoreRoute,
  colorForScore
};
