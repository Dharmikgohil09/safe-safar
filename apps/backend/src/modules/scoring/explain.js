/**
 * Deterministic plain-language route safety explanation builder.
 *
 * Produces an explainable English summary composed of up to four sentences in exact order:
 * 1. Time-of-day sentence (night / evening only)
 * 2. Community reports sentence (0, 1, or n)
 * 3. Lighting coverage sentence (unavailable, mostly >=70%, partly 40-69%, poorly <40%)
 * 4. Nearest safe place sentence (police station or hospital, rounded to nearest 10m)
 *
 * @param {Object} details
 * @param {number} details.activeReportCount
 * @param {boolean} details.lightingDataAvailable
 * @param {number|null} details.litSamplePercent
 * @param {boolean} details.landmarkDataAvailable
 * @param {Object|null} details.nearestSafePlace
 * @param {'day' | 'evening' | 'night'} period
 * @returns {string} Plain-language explanation
 */
function buildExplanation(details = {}, period = 'day') {
  const sentences = [];

  // a. Period sentence
  if (period === 'night') {
    sentences.push('Night-time: lighting and reports count more.');
  } else if (period === 'evening') {
    sentences.push('Evening: lighting counts slightly more.');
  }
  // day: no period sentence

  // b. Reports sentence
  const reportCount = typeof details?.activeReportCount === 'number' ? details.activeReportCount : 0;
  if (reportCount === 0) {
    sentences.push('No active community reports along this route.');
  } else if (reportCount === 1) {
    sentences.push('1 community report near this route.');
  } else {
    sentences.push(`${reportCount} community reports near this route.`);
  }

  // c. Lighting sentence
  const hasLightData =
    Boolean(details?.lightingDataAvailable) &&
    details?.litSamplePercent !== null &&
    details?.litSamplePercent !== undefined;

  if (!hasLightData) {
    sentences.push('Lighting data is not available for this area.');
  } else {
    const pct = details.litSamplePercent;
    if (pct >= 70) {
      sentences.push(`Mostly well lit (${pct}% of the route is near street lights).`);
    } else if (pct >= 40) {
      sentences.push(`Partly lit (${pct}% of the route is near street lights).`);
    } else {
      sentences.push(`Poorly lit (${pct}% of the route is near street lights).`);
    }
  }

  // d. Nearest safe place sentence
  if (!details?.nearestSafePlace) {
    sentences.push('No police or hospital data for this area.');
  } else {
    const safePlace = details.nearestSafePlace;
    const categoryName = safePlace.category === 'police' ? 'police station' : 'hospital';
    const roundedDist = Math.round((safePlace.distanceMeters || 0) / 10) * 10;
    const name = safePlace.name && typeof safePlace.name === 'string' ? safePlace.name.trim() : '';

    if (name) {
      sentences.push(`Nearest ${categoryName} is ${name} about ${roundedDist} m from the route.`);
    } else {
      sentences.push(`Nearest ${categoryName} is about ${roundedDist} m from the route.`);
    }
  }

  return sentences.join(' ');
}

module.exports = {
  buildExplanation
};
