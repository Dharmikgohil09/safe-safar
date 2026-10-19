/**
 * Google Encoded Polyline algorithm (precision 5 by default).
 * ORS uses this algorithm with coordinates encoded as (latitude delta, longitude delta).
 * Functions here accept and return coordinates in GeoJSON [longitude, latitude] order.
 */

/**
 * Encodes a signed integer using Google's variable-length chunking algorithm.
 *
 * @param {number} num - Signed integer
 * @returns {string} Encoded ASCII character string
 */
function encodeSignedNumber(num) {
  let sgn = num < 0 ? ~(num << 1) : num << 1;
  let str = '';
  while (sgn >= 0x20) {
    str += String.fromCharCode((0x20 | (sgn & 0x1f)) + 63);
    sgn >>= 5;
  }
  str += String.fromCharCode(sgn + 63);
  return str;
}

/**
 * Encodes an array of [lng, lat] coordinate pairs into a polyline string.
 *
 * @param {Array<Array<number>>} coordinates - Array of [lng, lat] pairs
 * @param {number} [precision=5] - Decimal precision (default 5 for ORS)
 * @returns {string} Encoded polyline string
 */
function encodePolyline(coordinates, precision = 5) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return '';
  }

  const factor = Math.pow(10, precision);
  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const point = coordinates[i];
    if (!Array.isArray(point) || point.length < 2) {
      continue;
    }

    const lng = point[0];
    const lat = point[1];

    const latInt = Math.round(lat * factor);
    const lngInt = Math.round(lng * factor);

    const dLat = latInt - prevLat;
    const dLng = lngInt - prevLng;

    prevLat = latInt;
    prevLng = lngInt;

    output += encodeSignedNumber(dLat);
    output += encodeSignedNumber(dLng);
  }

  return output;
}

/**
 * Decodes a Google encoded polyline string into an array of [lng, lat] coordinate pairs.
 *
 * @param {string} encoded - Encoded polyline string
 * @param {number} [precision=5] - Decimal precision (default 5 for ORS)
 * @returns {Array<Array<number>>} Array of [lng, lat] coordinates
 */
function decodePolyline(encoded, precision = 5) {
  if (!encoded || typeof encoded !== 'string') {
    return [];
  }

  const factor = Math.pow(10, precision);
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const len = encoded.length;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);

    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    if (index >= len) {
      break;
    }

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);

    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    coordinates.push([
      Math.round((lng / factor) * factor) / factor,
      Math.round((lat / factor) * factor) / factor
    ]);
  }

  return coordinates;
}

module.exports = {
  encodePolyline,
  decodePolyline
};
