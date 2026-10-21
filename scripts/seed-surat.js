/**
 * scripts/seed-surat.js
 *
 * Usage:
 *   MONGODB_URI=<uri> node scripts/seed-surat.js              # reset + re-create
 *   MONGODB_URI=<uri> node scripts/seed-surat.js --dry-run    # show counts, change nothing
 *   MONGODB_URI=<uri> node scripts/seed-surat.js --reset-only # delete tagged docs only
 *
 * What it creates (tag: "surat-demo-v1"):
 *   - LightPoint documents: grid-filled circular zones around SVNIT, Umra/Athwa (green),
 *     and Vesu/VR Mall (yellow). No light points in Adajan canal or Railway east exit zones.
 *   - Report documents: 8 incident reports across Surat demonstrating red, yellow, and green
 *     safety zones. Report #8 is intentionally PENDING (only 1 confirmation).
 *
 * seedTag safety rule:
 *   resetSeedData ONLY deletes documents whose seedTag field equals "surat-demo-v1".
 *   It never issues an unfiltered deleteMany and never touches the landmarks collection.
 *
 * Landmarks are NOT created or deleted by this script. They come from Dhruv's seed script.
 *
 * All coordinates are APPROXIMATE demo values (zone centres from public map references).
 * They should be verified and tuned by someone with detailed knowledge of Surat's streets
 * before the app goes to production.
 *
 * Author: Satej Kolhe (Team Codecraft, IEEE WIE ILS 2026, Problem Statement 5)
 */

'use strict';

const path = require('path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEED_TAG = 'surat-demo-v1';

// Zone anchors [lng, lat]
const ZONES = {
  svnit:   { center: [72.7848, 21.1648], radiusM: 500 },
  umra:    { center: [72.7935, 21.1685], radiusM: 500 },
  vesu:    { center: [72.7565, 21.1442], radiusM: 500 },
  adajan:  { center: [72.7912, 21.1975], radiusM: 500 },
  railway: { center: [72.8385, 21.2030], radiusM: 500 }
};

// ---------------------------------------------------------------------------
// Lazy loader – loads mongoose + models from apps/backend only when needed.
// Keeping this lazy means require('scripts/seed-surat.js') in tests is cheap.
// ---------------------------------------------------------------------------

function loadBackendDeps() {
  const backendPkg = path.join(__dirname, '..', 'apps', 'backend', 'package.json');
  const backendRequire = require('module').createRequire(backendPkg);
  const mongoose = backendRequire('mongoose');
  const modelsPath = path.join(
    __dirname, '..', 'apps', 'backend', 'src', 'modules', 'scoring', 'models'
  );
  // Require only the models index (not the scoring index.js)
  const { Report, LightPoint } = require(modelsPath);
  return { mongoose, Report, LightPoint };
}

// ---------------------------------------------------------------------------
// Geometry helpers (pure, no external deps)
// ---------------------------------------------------------------------------

/**
 * Haversine distance between two [lng, lat] points, in metres.
 * Local copy so this file can be required without the scoring module's
 * require chain (makes the test import cheap and avoids circular deps).
 *
 * @param {[number, number]} coord1
 * @param {[number, number]} coord2
 * @returns {number} distance in metres
 */
function haversineMeters(coord1, coord2) {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  if (lng1 === lng2 && lat1 === lat2) return 0;
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fills a circular zone with a regular grid of [lng, lat] points.
 * Grid spacing is stepM metres. Converts metres to degrees using the
 * flat-earth approximation at the zone latitude:
 *   dLat = stepM / 111320
 *   dLng = stepM / (111320 * cos(lat_rad))
 *
 * @param {[number, number]} center  [lng, lat]
 * @param {number} radiusM           radius in metres
 * @param {number} stepM             grid spacing in metres
 * @returns {[number, number][]}     [lng, lat] points within the circle
 */
function gridInCircle(center, radiusM, stepM) {
  const [cLng, cLat] = center;
  const dLat = stepM / 111320;
  const dLng = stepM / (111320 * Math.cos((cLat * Math.PI) / 180));

  const stepsLat = Math.ceil(radiusM / stepM);
  const stepsLng = Math.ceil(radiusM / stepM);

  const points = [];
  for (let i = -stepsLat; i <= stepsLat; i++) {
    for (let j = -stepsLng; j <= stepsLng; j++) {
      const lat = cLat + i * dLat;
      const lng = cLng + j * dLng;
      if (haversineMeters(center, [lng, lat]) <= radiusM) {
        points.push([lng, lat]);
      }
    }
  }
  return points;
}

// ---------------------------------------------------------------------------
// buildSeedData – pure, deterministic, no I/O
// ---------------------------------------------------------------------------

/**
 * Builds the full set of seed documents for the Surat demo.
 * No Math.random, no Date.now. Pass `now` explicitly for determinism.
 *
 * @param {Date} [now=new Date()] - Reference timestamp.
 * @returns {{ reports: object[], lightPoints: object[] }}
 */
function buildSeedData(now) {
  if (!(now instanceof Date)) now = new Date();

  // ── Light Points ──────────────────────────────────────────────────────────

  const lightPoints = [];

  // GREEN: SVNIT – 40 m grid, intensity 8, active
  for (const coord of gridInCircle(ZONES.svnit.center, ZONES.svnit.radiusM, 40)) {
    lightPoints.push({
      location: { type: 'Point', coordinates: coord },
      intensity: 8,
      status: 'active',
      seedTag: SEED_TAG
    });
  }

  // GREEN: Umra/Athwa – 40 m grid, intensity 8, active
  for (const coord of gridInCircle(ZONES.umra.center, ZONES.umra.radiusM, 40)) {
    lightPoints.push({
      location: { type: 'Point', coordinates: coord },
      intensity: 8,
      status: 'active',
      seedTag: SEED_TAG
    });
  }

  // YELLOW: Vesu (VR Mall) – 90 m grid, intensity 5, dim
  for (const coord of gridInCircle(ZONES.vesu.center, ZONES.vesu.radiusM, 90)) {
    lightPoints.push({
      location: { type: 'Point', coordinates: coord },
      intensity: 5,
      status: 'dim',
      seedTag: SEED_TAG
    });
  }

  // RED: Adajan canal and Railway east exit – NO light points.

  // ── Reports ───────────────────────────────────────────────────────────────

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const MS_PER_HOUR = 60 * 60 * 1000;

  /**
   * Build one report document.
   *
   * @param {number}  n           1-based index (used to make IDs unique)
   * @param {object}  opts
   * @param {string}  opts.type
   * @param {[number,number]} opts.coordinates  [lng, lat]
   * @param {number}  opts.ageDays
   * @param {number}  opts.confirmCount
   * @param {string}  opts.note
   */
  function makeReport(n, { type, coordinates, ageDays, confirmCount, note }) {
    const createdAt = new Date(now.getTime() - ageDays * MS_PER_DAY);
    // updatedAt = createdAt (timestamps: true adds updatedAt; native insertMany
    // stores exactly what we give it so we set both)
    const updatedAt = new Date(createdAt.getTime());
    const reporterId = `seed:reporter-${n}`;

    // Confirmations: distinct userIds that are NOT the reporterId.
    // Each confirmation timestamp is 1 h after createdAt so it is always
    // chronologically after createdAt and always <= now (ageDays >= 1).
    const confirmations = [];
    for (let k = 0; k < confirmCount; k++) {
      confirmations.push({
        userId: `seed:user-${n}-${k + 1}`,
        at: new Date(createdAt.getTime() + MS_PER_HOUR)
      });
    }

    return {
      location: { type: 'Point', coordinates },
      type,
      note,
      reporterId,
      confirmations,
      createdAt,
      updatedAt,
      seedTag: SEED_TAG
    };
  }

  const reports = [
    // 1 – RED: Adajan Gam canal, 5 conf → active
    makeReport(1, {
      type: 'dark_street',
      coordinates: [72.7912, 21.1975],
      ageDays: 2,
      confirmCount: 5,
      note: 'Streetlights off for past 4 nights. Pitch black stretch near Adajan Gam canal.'
    }),
    // 2 – RED: Adajan canal, 3 conf → active
    makeReport(2, {
      type: 'harassment',
      coordinates: [72.7895, 21.1989],
      ageDays: 1,
      confirmCount: 3,
      note: 'Group loitering and catcalling near the desolate junction after 9:30 PM.'
    }),
    // 3 – RED: Adajan canal, 4 conf → active
    makeReport(3, {
      type: 'isolated_path',
      coordinates: [72.7930, 21.1960],
      ageDays: 3,
      confirmCount: 4,
      note: 'Narrow alleyway with blind corners and no commercial shops open late.'
    }),
    // 4 – RED: Railway east exit, 6 conf → active
    makeReport(4, {
      type: 'dark_street',
      coordinates: [72.8385, 21.2030],
      ageDays: 4,
      confirmCount: 6,
      note: 'Under-bridge road near Railway Station east exit has broken floodlights.'
    }),
    // 5 – RED: Railway east exit, 4 conf → active
    makeReport(5, {
      type: 'suspicious',
      coordinates: [72.8420, 21.2065],
      ageDays: 2,
      confirmCount: 4,
      note: 'Unregistered autos blocking pedestrian footpath, harassing travelers.'
    }),
    // 6 – RED: Adajan canal, older (shows half-life decay), 3 conf → active
    makeReport(6, {
      type: 'harassment',
      coordinates: [72.7905, 21.1980],
      ageDays: 12,
      confirmCount: 3,
      note: 'Repeated catcalling reported near the canal path last week.'
    }),
    // 7 – YELLOW: Vesu inner road, exactly minimum 2 conf → active
    makeReport(7, {
      type: 'dark_street',
      coordinates: [72.7600, 21.1460],
      ageDays: 5,
      confirmCount: 2,
      note: 'Several streetlights out on the inner road.'
    }),
    // 8 – YELLOW/PENDING: Vesu mall entrance, 1 conf → PENDING (must NOT count in scoring)
    makeReport(8, {
      type: 'suspicious',
      coordinates: [72.7570, 21.1450],
      ageDays: 1,
      confirmCount: 1,
      note: 'Person following pedestrians near the mall entrance.'
    })
  ];

  return { reports, lightPoints };
}

// ---------------------------------------------------------------------------
// resetSeedData
// ---------------------------------------------------------------------------

/**
 * Deletes ALL documents tagged with SEED_TAG from the Report and LightPoint
 * collections using the native collection API.
 *
 * Safety guarantees:
 *   - Only deletes where { seedTag: SEED_TAG } — never an unfiltered delete.
 *   - Never touches the landmarks collection.
 *
 * @param {{ Report: import('mongoose').Model, LightPoint: import('mongoose').Model }} models
 * @returns {Promise<{ deletedReports: number, deletedLightPoints: number }>}
 */
async function resetSeedData({ Report, LightPoint }) {
  const filter = { seedTag: SEED_TAG };
  const [rRes, lpRes] = await Promise.all([
    Report.collection.deleteMany(filter),
    LightPoint.collection.deleteMany(filter)
  ]);
  return {
    deletedReports: rRes.deletedCount,
    deletedLightPoints: lpRes.deletedCount
  };
}

// ---------------------------------------------------------------------------
// applySeedData
// ---------------------------------------------------------------------------

/**
 * Ensures 2dsphere indexes exist, then bulk-inserts seed documents in
 * chunks of 500 using the native collection API (bypasses Mongoose
 * validation so createdAt, updatedAt, and nested confirmations are stored
 * exactly as built by buildSeedData).
 *
 * @param {{ Report: import('mongoose').Model, LightPoint: import('mongoose').Model }} models
 * @param {{ reports: object[], lightPoints: object[] }} data
 * @returns {Promise<{ insertedReports: number, insertedLightPoints: number }>}
 */
async function applySeedData({ Report, LightPoint }, data) {
  // Ensure 2dsphere indexes exist before running geospatial inserts
  await Report.init();
  await LightPoint.init();

  const CHUNK = 500;

  async function insertChunked(collection, docs) {
    let inserted = 0;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const chunk = docs.slice(i, i + CHUNK);
      const res = await collection.insertMany(chunk, { ordered: false });
      inserted += res.insertedCount;
    }
    return inserted;
  }

  const [insertedReports, insertedLightPoints] = await Promise.all([
    insertChunked(Report.collection, data.reports),
    insertChunked(LightPoint.collection, data.lightPoints)
  ]);

  return { insertedReports, insertedLightPoints };
}

// ---------------------------------------------------------------------------
// seedAll
// ---------------------------------------------------------------------------

/**
 * Orchestrates reset → build → apply with dry-run and reset-only options.
 *
 * @param {{ Report: import('mongoose').Model, LightPoint: import('mongoose').Model }} models
 * @param {{ now?: Date, dryRun?: boolean, resetOnly?: boolean }} [options]
 * @returns {Promise<{
 *   deletedReports: number,
 *   deletedLightPoints: number,
 *   insertedReports: number,
 *   insertedLightPoints: number,
 *   dryRun: boolean,
 *   resetOnly: boolean
 * }>}
 */
async function seedAll(models, { now = new Date(), dryRun = false, resetOnly = false } = {}) {
  if (dryRun) {
    const data = buildSeedData(now);
    return {
      deletedReports: 0,
      deletedLightPoints: 0,
      insertedReports: data.reports.length,
      insertedLightPoints: data.lightPoints.length,
      dryRun: true,
      resetOnly: false
    };
  }

  const deleteResult = await resetSeedData(models);

  if (resetOnly) {
    return {
      ...deleteResult,
      insertedReports: 0,
      insertedLightPoints: 0,
      dryRun: false,
      resetOnly: true
    };
  }

  const data = buildSeedData(now);
  const insertResult = await applySeedData(models, data);

  return {
    ...deleteResult,
    ...insertResult,
    dryRun: false,
    resetOnly: false
  };
}

// ---------------------------------------------------------------------------
// Exports (always present so tests can require cheaply)
// ---------------------------------------------------------------------------

module.exports = {
  SEED_TAG,
  buildSeedData,
  resetSeedData,
  applySeedData,
  seedAll
};

// ---------------------------------------------------------------------------
// CLI entry point (runs ONLY when invoked directly)
// ---------------------------------------------------------------------------

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const resetOnly = args.includes('--reset-only');

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error(
        '[seed-surat] ERROR: MONGODB_URI environment variable is required.\n' +
        '  Set it to your MongoDB connection string before running this script.\n' +
        "  Get it from Dharmik's .env on Render — never paste it into a chat or commit it."
      );
      process.exit(1);
    }

    // Mask credentials in the printed URI (everything between :// and @)
    const maskedUri = uri.replace(/\/\/([^@]*)@/, '//***@');
    console.log(`[seed-surat] Connecting to: ${maskedUri}`);

    const { mongoose, Report, LightPoint } = loadBackendDeps();

    try {
      await mongoose.connect(uri);
      console.log('[seed-surat] Connected.');

      const summary = await seedAll(
        { Report, LightPoint },
        { now: new Date(), dryRun, resetOnly }
      );

      if (summary.dryRun) {
        console.log('[seed-surat] DRY RUN — no changes made.');
        console.log(
          `  Would delete : ${summary.deletedReports} reports, ` +
          `${summary.deletedLightPoints} light points`
        );
        console.log(
          `  Would insert : ${summary.insertedReports} reports, ` +
          `${summary.insertedLightPoints} light points`
        );
      } else if (summary.resetOnly) {
        console.log('[seed-surat] RESET ONLY — tagged documents removed.');
        console.log(
          `  Deleted : ${summary.deletedReports} reports, ` +
          `${summary.deletedLightPoints} light points`
        );
      } else {
        console.log('[seed-surat] Seed complete.');
        console.log(
          `  Deleted (old) : ${summary.deletedReports} reports, ` +
          `${summary.deletedLightPoints} light points`
        );
        console.log(
          `  Inserted (new): ${summary.insertedReports} reports, ` +
          `${summary.insertedLightPoints} light points`
        );
      }
    } catch (err) {
      console.error('[seed-surat] ERROR:', err.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('[seed-surat] Disconnected.');
    }
  })();
}
