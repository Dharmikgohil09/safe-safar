/**
 * apps/backend/src/modules/scoring/tests/seedSurat.test.js
 *
 * Integration + unit tests for scripts/seed-surat.js.
 * Uses mongodb-memory-server; self-contained; follows the same patterns as
 * routeScoring.test.js and routeScoring.timeofday.test.js.
 *
 * The seed script is required from six directories above this file:
 *   tests/ -> scoring/ -> modules/ -> src/ -> backend/ -> apps/ -> (root) -> scripts/
 */

'use strict';

const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { Report, Landmark, LightPoint } = require('../models');
const { scoreRoute } = require('../routeScoring.service');

// Require the seed script from the repo root (6 dirs above tests/)
const seedScript = require(
  path.join(__dirname, '..', '..', '..', '..', '..', '..', 'scripts', 'seed-surat.js')
);
const { SEED_TAG, buildSeedData, resetSeedData, applySeedData, seedAll } = seedScript;

// ─── Zone anchors (mirrors ZONES in seed script) ─────────────────────────────
const SVNIT_CENTER    = [72.7848, 21.1648];
const UMRA_CENTER     = [72.7935, 21.1685];
const VESU_CENTER     = [72.7565, 21.1442];
const ADAJAN_CENTER   = [72.7912, 21.1975];
const RAILWAY_CENTER  = [72.8385, 21.2030];

// Allowed report types (from Report model)
const ALLOWED_TYPES = new Set([
  'dark_street', 'poor_lighting', 'harassment', 'isolated',
  'unsafe_crowd', 'other', 'isolated_path', 'suspicious'
]);

// Rough haversine helper (mirrors geo.js; used in test assertions only)
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixed timestamp (pin to a known UTC time so all tests are deterministic)
// ─────────────────────────────────────────────────────────────────────────────
const FIXED_NOW = new Date('2026-10-21T06:00:00.000Z');

// ─────────────────────────────────────────────────────────────────────────────
describe('Surat Demo Seed (seedSurat.test.js)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Ensure 2dsphere indexes exist (required for geospatial queries in scoreRoute)
    await Report.init();
    await Report.syncIndexes();
    await Landmark.init();
    await Landmark.syncIndexes();
    await LightPoint.init();
    await LightPoint.syncIndexes();
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear everything between tests (except tests that set up their own state)
    await Report.deleteMany({});
    await LightPoint.deleteMany({});
    await Landmark.deleteMany({});
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. buildSeedData – pure function checks
  // ───────────────────────────────────────────────────────────────────────────
  describe('buildSeedData (pure)', () => {
    test('is deterministic: two calls with the same now produce deep-equal output', () => {
      const a = buildSeedData(FIXED_NOW);
      const b = buildSeedData(FIXED_NOW);
      expect(a).toEqual(b);
    });

    test('every document has seedTag equal to SEED_TAG', () => {
      const { reports, lightPoints } = buildSeedData(FIXED_NOW);
      for (const doc of [...reports, ...lightPoints]) {
        expect(doc.seedTag).toBe(SEED_TAG);
      }
    });

    test('all coordinates are within valid lng/lat bounds', () => {
      const { reports, lightPoints } = buildSeedData(FIXED_NOW);
      for (const doc of [...reports, ...lightPoints]) {
        const [lng, lat] = doc.location.coordinates;
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      }
    });

    test('all report types are in the allowed enum', () => {
      const { reports } = buildSeedData(FIXED_NOW);
      for (const r of reports) {
        expect(ALLOWED_TYPES.has(r.type)).toBe(true);
      }
    });

    test('exactly 7 reports have >= 2 distinct non-reporter confirmations (active)', () => {
      const { reports } = buildSeedData(FIXED_NOW);
      const activeCount = reports.filter((r) => {
        const reporterId = r.reporterId;
        const distinct = new Set(
          r.confirmations
            .filter((c) => c.userId !== reporterId)
            .map((c) => c.userId)
        );
        return distinct.size >= 2;
      }).length;
      expect(activeCount).toBe(7);
    });

    test('exactly 1 report has fewer than 2 distinct non-reporter confirmations (pending)', () => {
      const { reports } = buildSeedData(FIXED_NOW);
      const pendingCount = reports.filter((r) => {
        const reporterId = r.reporterId;
        const distinct = new Set(
          r.confirmations
            .filter((c) => c.userId !== reporterId)
            .map((c) => c.userId)
        );
        return distinct.size < 2;
      }).length;
      expect(pendingCount).toBe(1);
    });

    test('no light point is within 300 m of the Adajan canal anchor', () => {
      const { lightPoints } = buildSeedData(FIXED_NOW);
      for (const lp of lightPoints) {
        const d = haversineMeters(lp.location.coordinates, ADAJAN_CENTER);
        expect(d).toBeGreaterThan(300);
      }
    });

    test('no light point is within 300 m of the Railway east exit anchor', () => {
      const { lightPoints } = buildSeedData(FIXED_NOW);
      for (const lp of lightPoints) {
        const d = haversineMeters(lp.location.coordinates, RAILWAY_CENTER);
        expect(d).toBeGreaterThan(300);
      }
    });

    test('light points exist near SVNIT (within 600 m of SVNIT anchor)', () => {
      const { lightPoints } = buildSeedData(FIXED_NOW);
      const near = lightPoints.filter(
        (lp) => haversineMeters(lp.location.coordinates, SVNIT_CENTER) <= 600
      );
      expect(near.length).toBeGreaterThan(0);
    });

    test('light points exist near Vesu/VR Mall (within 600 m of Vesu anchor)', () => {
      const { lightPoints } = buildSeedData(FIXED_NOW);
      const near = lightPoints.filter(
        (lp) => haversineMeters(lp.location.coordinates, VESU_CENTER) <= 600
      );
      expect(near.length).toBeGreaterThan(0);
    });

    test('confirmation userIds are distinct within each report', () => {
      const { reports } = buildSeedData(FIXED_NOW);
      for (const r of reports) {
        const ids = r.confirmations.map((c) => c.userId);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });

    test('all confirmation timestamps are after createdAt and not after FIXED_NOW', () => {
      const { reports } = buildSeedData(FIXED_NOW);
      for (const r of reports) {
        for (const c of r.confirmations) {
          expect(c.at.getTime()).toBeGreaterThan(r.createdAt.getTime());
          expect(c.at.getTime()).toBeLessThanOrEqual(FIXED_NOW.getTime());
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. seedAll – database integration
  // ───────────────────────────────────────────────────────────────────────────
  describe('seedAll (database integration)', () => {
    test('running seedAll twice produces the same document counts (idempotent)', async () => {
      const first = await seedAll({ Report, LightPoint }, { now: FIXED_NOW });
      // Second run: resets the first batch, then inserts again
      const second = await seedAll({ Report, LightPoint }, { now: FIXED_NOW });

      expect(second.insertedReports).toBe(first.insertedReports);
      expect(second.insertedLightPoints).toBe(first.insertedLightPoints);
    });

    test('a pre-existing Report WITHOUT seedTag is preserved after a normal run', async () => {
      // Insert an untagged report before seeding
      await Report.collection.insertOne({
        location: { type: 'Point', coordinates: [72.8311, 21.1702] },
        type: 'dark_street',
        reporterId: 'pre-existing-user',
        confirmations: [],
        createdAt: new Date(),
        updatedAt: new Date()
        // Note: no seedTag field
      });

      await seedAll({ Report, LightPoint }, { now: FIXED_NOW });

      const untagged = await Report.collection.findOne({ reporterId: 'pre-existing-user' });
      expect(untagged).not.toBeNull();
    });

    test('a pre-existing LightPoint WITHOUT seedTag is preserved after a normal run', async () => {
      await LightPoint.collection.insertOne({
        location: { type: 'Point', coordinates: [72.8311, 21.1702] },
        intensity: 7,
        status: 'active'
        // no seedTag
      });

      await seedAll({ Report, LightPoint }, { now: FIXED_NOW });

      const untagged = await LightPoint.collection.findOne({ intensity: 7, seedTag: { $exists: false } });
      expect(untagged).not.toBeNull();
    });

    test('a Landmark document is preserved after a normal run', async () => {
      await Landmark.collection.insertOne({
        name: 'Test Police Post',
        category: 'police',
        location: { type: 'Point', coordinates: [72.83, 21.17] },
        source: 'test'
      });

      await seedAll({ Report, LightPoint }, { now: FIXED_NOW });

      const lm = await Landmark.collection.findOne({ name: 'Test Police Post' });
      expect(lm).not.toBeNull();
    });

    test('resetOnly removes every tagged document and nothing else', async () => {
      // Seed first
      await seedAll({ Report, LightPoint }, { now: FIXED_NOW });

      // Insert an untagged document
      await Report.collection.insertOne({
        location: { type: 'Point', coordinates: [72.83, 21.17] },
        type: 'other',
        reporterId: 'untagged-user',
        confirmations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Insert a Landmark (should never be touched)
      await Landmark.collection.insertOne({
        name: 'Landmark to keep',
        category: 'hospital',
        location: { type: 'Point', coordinates: [72.83, 21.17] },
        source: 'test'
      });

      const result = await seedAll({ Report, LightPoint }, { now: FIXED_NOW, resetOnly: true });

      // Tagged docs gone
      const taggedReports = await Report.collection.countDocuments({ seedTag: SEED_TAG });
      const taggedLPs    = await LightPoint.collection.countDocuments({ seedTag: SEED_TAG });
      expect(taggedReports).toBe(0);
      expect(taggedLPs).toBe(0);

      // Counts returned are positive (we just reset a real seed)
      expect(result.deletedReports).toBeGreaterThan(0);
      expect(result.deletedLightPoints).toBeGreaterThan(0);
      expect(result.insertedReports).toBe(0);
      expect(result.insertedLightPoints).toBe(0);
      expect(result.resetOnly).toBe(true);

      // Untagged report still present
      const untagged = await Report.collection.findOne({ reporterId: 'untagged-user' });
      expect(untagged).not.toBeNull();

      // Landmark still present
      const lm = await Landmark.collection.findOne({ name: 'Landmark to keep' });
      expect(lm).not.toBeNull();
    });

    test('dryRun changes nothing in the database', async () => {
      // Seed first (real)
      await seedAll({ Report, LightPoint }, { now: FIXED_NOW });
      const countBefore = await Report.collection.countDocuments({ seedTag: SEED_TAG });
      const lpCountBefore = await LightPoint.collection.countDocuments({ seedTag: SEED_TAG });

      // DryRun
      const result = await seedAll({ Report, LightPoint }, { now: FIXED_NOW, dryRun: true });

      // Counts still the same
      const countAfter  = await Report.collection.countDocuments({ seedTag: SEED_TAG });
      const lpCountAfter = await LightPoint.collection.countDocuments({ seedTag: SEED_TAG });
      expect(countAfter).toBe(countBefore);
      expect(lpCountAfter).toBe(lpCountBefore);

      // dryRun returns what it WOULD do
      expect(result.dryRun).toBe(true);
      expect(result.insertedReports).toBeGreaterThan(0);
      expect(result.insertedLightPoints).toBeGreaterThan(0);
      expect(result.deletedReports).toBe(0);
      expect(result.deletedLightPoints).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Scoring check – seeded data produces expected zone differences
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scoring check after seeding', () => {
    let greenResult;
    let redResult;

    beforeAll(async () => {
      // Clear and seed fresh (beforeEach already cleared; but beforeAll here
      // runs after the suite-level beforeEach which already cleared everything)
      await Report.deleteMany({});
      await LightPoint.deleteMany({});
      await Landmark.deleteMany({});

      await seedAll({ Report, LightPoint }, { now: FIXED_NOW });

      // Green route: ~300 m straight line inside SVNIT zone
      // Both endpoints are within 500 m of SVNIT center [72.7848, 21.1648]
      const dLng300m = 300 / (111320 * Math.cos((21.1648 * Math.PI) / 180));
      const greenRoute = [
        [SVNIT_CENTER[0] - dLng300m / 2, SVNIT_CENTER[1]],
        [SVNIT_CENTER[0] + dLng300m / 2, SVNIT_CENTER[1]]
      ];

      // Red route: from first report coord to third report coord (both in canal zone)
      // [72.7895, 21.1989] -> [72.7930, 21.1960] — multiple active reports nearby
      const redRoute = [
        [72.7895, 21.1989],
        [72.7930, 21.1960]
      ];

      // timeOfDay = 'day', now = FIXED_NOW
      [greenResult, redResult] = await Promise.all([
        scoreRoute(greenRoute, { now: FIXED_NOW, timeOfDay: 'day' }),
        scoreRoute(redRoute,   { now: FIXED_NOW, timeOfDay: 'day' })
      ]);
    }, 30000);

    test('green zone has higher safetyScore than red zone', () => {
      expect(greenResult.safetyScore).toBeGreaterThan(redResult.safetyScore);
    });

    test('green zone has higher lightingScore than red zone', () => {
      expect(greenResult.safetyFactors.lightingScore).toBeGreaterThan(
        redResult.safetyFactors.lightingScore
      );
    });

    test('red zone has lower incidentDecayScore than green zone', () => {
      expect(redResult.safetyFactors.incidentDecayScore).toBeLessThan(
        greenResult.safetyFactors.incidentDecayScore
      );
    });

    test('red zone route has activeReportCount of at least 2', () => {
      expect(redResult.details.activeReportCount).toBeGreaterThanOrEqual(2);
    });

    test('pending report (1 confirmation) is not counted in activeReportCount', async () => {
      // Report #8 is at [72.7570, 21.1450] with only 1 confirmation.
      // Score a short route directly at that point.
      const pendingRoute = [
        [72.7570, 21.1450],
        [72.7575, 21.1455]
      ];
      const result = await scoreRoute(pendingRoute, { now: FIXED_NOW, timeOfDay: 'day' });
      // The pending report must NOT contribute to activeReportCount
      // (activeReportCount counts reports with >= 2 distinct non-reporter confirmations)
      // Report #7 at [72.7600, 21.1460] is ~330 m away — just outside 100 m radius, safe.
      // So only the pending one is near; it must not count.
      expect(result.details.activeReportCount).toBe(0);
    });
  });
});
