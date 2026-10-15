const { expireOverdueTrips } = require('./trips.service');

let workerTimer = null;
let isProcessing = false;

/**
 * Runs a single cycle to find and expire all overdue active trips.
 * Catches database errors without crashing the main application.
 */
const processOverdueTrips = async () => {
  if (isProcessing) {
    return { skipped: true, reason: 'Already in progress' };
  }

  isProcessing = true;
  try {
    const result = await expireOverdueTrips();
    return result;
  } catch (error) {
    console.error('[TripExpiryWorker] Error scanning overdue trips:', error.message);
    return { error: error.message };
  } finally {
    isProcessing = false;
  }
};

/**
 * Starts the periodic background worker.
 * @param {Object} options
 * @param {number} options.intervalMs Interval between sweeps in milliseconds (default 60000ms = 1m)
 */
const startTripExpiryWorker = ({ intervalMs = 60000 } = {}) => {
  if (workerTimer) {
    return workerTimer;
  }

  // Run immediate first sweep
  processOverdueTrips();

  workerTimer = setInterval(() => {
    processOverdueTrips();
  }, intervalMs);

  // Unref timer so it does not block the Node process from exiting
  if (workerTimer && typeof workerTimer.unref === 'function') {
    workerTimer.unref();
  }

  return workerTimer;
};

/**
 * Stops the worker cleanly.
 */
const stopTripExpiryWorker = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
  isProcessing = false;
};

const isWorkerRunning = () => {
  return workerTimer !== null;
};

module.exports = {
  startTripExpiryWorker,
  stopTripExpiryWorker,
  processOverdueTrips,
  isWorkerRunning
};
