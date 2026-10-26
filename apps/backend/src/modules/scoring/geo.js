const { SAMPLE_INTERVAL_M } = require('./constants');

/**
 * Calculates the great-circle distance between two [lng, lat] coordinates
 * in meters using the Haversine formula.
 *
 * @param {Array<number>} coord1 - [longitude, latitude]
 * @param {Array<number>} coord2 - [longitude, latitude]
 * @returns {number} Distance in meters
 */
function haversineMeters(coord1, coord2) {
  if (
    !Array.isArray(coord1) ||
    !Array.isArray(coord2) ||
    coord1.length < 2 ||
    coord2.length < 2
  ) {
    return 0;
  }

  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  if (lng1 === lng2 && lat1 === lat2) {
    return 0;
  }

  const R = 6371000; // Earth's mean radius in meters
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Samples points along a polyline spaced approximately intervalM apart.
 * Always includes the first and last point.
 * Robust to 0, 1, or 2 coordinates and repeated/degenerate points.
 *
 * @param {Array<Array<number>>} coordinates - Array of [lng, lat] points
 * @param {number} [intervalM=SAMPLE_INTERVAL_M] - Sampling interval in meters
 * @returns {Array<Array<number>>} Sampled [lng, lat] points
 */
function samplePath(coordinates, intervalM = SAMPLE_INTERVAL_M) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  if (coordinates.length === 1) {
    return [[coordinates[0][0], coordinates[0][1]]];
  }

  const interval = intervalM > 0 ? intervalM : SAMPLE_INTERVAL_M;
  const result = [[coordinates[0][0], coordinates[0][1]]];
  let distanceSinceLastSample = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    let currentA = [coordinates[i][0], coordinates[i][1]];
    const targetB = [coordinates[i + 1][0], coordinates[i + 1][1]];
    let segLen = haversineMeters(currentA, targetB);

    if (segLen <= 1e-6) {
      continue;
    }

    while (distanceSinceLastSample + segLen >= interval) {
      const needed = interval - distanceSinceLastSample;
      const t = Math.min(1, Math.max(0, needed / segLen));
      const nextPoint = [
        currentA[0] + t * (targetB[0] - currentA[0]),
        currentA[1] + t * (targetB[1] - currentA[1])
      ];

      result.push(nextPoint);
      currentA = nextPoint;
      segLen = haversineMeters(currentA, targetB);
      distanceSinceLastSample = 0;

      if (segLen <= 1e-6) {
        break;
      }
    }

    distanceSinceLastSample += segLen;
  }

  const lastCoord = coordinates[coordinates.length - 1];
  const lastSample = result[result.length - 1];

  if (haversineMeters(lastSample, lastCoord) > 1e-3) {
    result.push([lastCoord[0], lastCoord[1]]);
  } else {
    // Overwrite the last sample with exact endpoint coordinates to prevent floating drift
    result[result.length - 1] = [lastCoord[0], lastCoord[1]];
  }

  return result;
}

/**
 * Computes a 2D bounding box enclosing the given points, padded by paddingM meters.
 *
 * @param {Array<Array<number>>} points - Array of [lng, lat] points
 * @param {number} [paddingM=0] - Padding distance in meters
 * @returns {{ minLng: number, minLat: number, maxLng: number, maxLat: number }}
 */
function boundingBox(points, paddingM = 0) {
  if (!Array.isArray(points) || points.length === 0) {
    return { minLng: 0, minLat: 0, maxLng: 0, maxLat: 0 };
  }

  let minLng = points[0][0];
  let maxLng = points[0][0];
  let minLat = points[0][1];
  let maxLat = points[0][1];

  for (let i = 1; i < points.length; i++) {
    const [lng, lat] = points[i];
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  if (!paddingM || paddingM <= 0) {
    return { minLng, minLat, maxLng, maxLat };
  }

  const R = 6371000;
  const toDeg = 180 / Math.PI;

  const dLat = (paddingM / R) * toDeg;
  const maxAbsLat = Math.min(89, Math.max(Math.abs(minLat), Math.abs(maxLat)));
  const cosLat = Math.cos((maxAbsLat * Math.PI) / 180);
  const dLng = (paddingM / (R * cosLat)) * toDeg;

  return {
    minLng: Math.max(-180, minLng - dLng),
    minLat: Math.max(-90, minLat - dLat),
    maxLng: Math.min(180, maxLng + dLng),
    maxLat: Math.min(90, maxLat + dLat)
  };
}

module.exports = {
  haversineMeters,
  samplePath,
  boundingBox
};
