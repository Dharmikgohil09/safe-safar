import { CommunityReport, CommunityReportFilter, ReportCategory, ReportSeverity } from '../types/community';

/**
 * SafeSafar Community Safety Reports Data Service (DEMO DATA)
 * ============================================================
 * NOTE: All reports in this mock dataset are illustrative samples
 * created specifically for the IEEE demonstration and testing.
 * They do NOT represent real-world emergency incidents or verified police logs.
 */

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const MOCK_COMMUNITY_REPORTS: CommunityReport[] = [
  {
    id: 'rep-001',
    category: 'poor-lighting',
    categoryLabel: 'Poor Lighting',
    severity: 'medium',
    title: 'Streetlights out along service road',
    description:
      'Multiple sodium vapor streetlights are completely non-functional along a 200m stretch. Footpath is dark after 7:30 PM.',
    latitude: 28.6328,
    longitude: 77.2195,
    approximateLocation: 'Connaught Circus Outer Circle, near M-Block',
    reportedAt: NOW - 3 * HOUR,
    status: 'investigating',
  },
  {
    id: 'rep-002',
    category: 'harassment',
    categoryLabel: 'Harassment',
    severity: 'high',
    title: 'Verbal catcalling near bus shelter',
    description:
      'Group loitering around the DTC bus shelter passing unwelcome remarks to commuters waiting for buses in the evening.',
    latitude: 28.6255,
    longitude: 77.2212,
    approximateLocation: 'Janpath Road, Bus Stop near Tolstoy Marg Crossing',
    reportedAt: NOW - 8 * HOUR,
    status: 'verified',
  },
  {
    id: 'rep-003',
    category: 'isolated-area',
    categoryLabel: 'Isolated / Unsafe Area',
    severity: 'critical',
    title: 'Deserted subway passage with zero security',
    description:
      'Underground pedestrian walkway has broken CCTV cameras and no guard presence after sunset. Commuters forced to take risky road crossings.',
    latitude: 28.6185,
    longitude: 77.2282,
    approximateLocation: 'C-Hexagon Pedestrian Underpass, India Gate Sector',
    reportedAt: NOW - 18 * HOUR,
    status: 'verified',
  },
  {
    id: 'rep-004',
    category: 'poor-lighting',
    categoryLabel: 'Poor Lighting',
    severity: 'low',
    title: 'Dim lighting near park perimeter',
    description:
      'Foliage blocking municipal lamp posts. Walkway is partially obscured for evening runners.',
    latitude: 28.5912,
    longitude: 77.2205,
    approximateLocation: 'Lodhi Garden Gate 4 Perimeter Walkway',
    reportedAt: NOW - 2 * DAY,
    status: 'investigating',
  },
  {
    id: 'rep-005',
    category: 'other',
    categoryLabel: 'Other Safety Concern',
    severity: 'medium',
    title: 'Abandoned vehicle obstructing sidewalk',
    description:
      'Unregistered stationary vehicle blocking pedestrian footpath, forcing walkers directly onto fast-moving roadway.',
    latitude: 28.6045,
    longitude: 77.2268,
    approximateLocation: 'Pandara Road near Market Complex',
    reportedAt: NOW - 4 * DAY,
    status: 'investigating',
  },
  {
    id: 'rep-006',
    category: 'harassment',
    categoryLabel: 'Harassment',
    severity: 'critical',
    title: 'Aggressive following reported',
    description:
      'A lone female commuter reported being shadowed by two individuals for 300 meters towards the metro gate.',
    latitude: 28.6365,
    longitude: 77.2155,
    approximateLocation: 'Rajiv Chowk Metro Gate 7 Vicinity',
    reportedAt: NOW - 6 * DAY,
    status: 'verified',
  },
  {
    id: 'rep-007',
    category: 'isolated-area',
    categoryLabel: 'Isolated / Unsafe Area',
    severity: 'high',
    title: 'Unmanned construction perimeter',
    description:
      'Construction barrier lacks warning lights or night patrol. Very isolated lane with blind corners.',
    latitude: 28.6142,
    longitude: 77.2345,
    approximateLocation: 'Tilak Marg Lane towards Supreme Court side',
    reportedAt: NOW - 12 * DAY,
    status: 'investigating',
  },
  {
    id: 'rep-008',
    category: 'poor-lighting',
    categoryLabel: 'Poor Lighting',
    severity: 'medium',
    title: 'Flickering lights near auto stand',
    description:
      'High mast light inoperative, causing visibility issues for passengers boarding public transport.',
    latitude: 28.5835,
    longitude: 77.2165,
    approximateLocation: 'JLN Stadium Metro Interchange, Gate 2',
    reportedAt: NOW - 18 * DAY,
    status: 'resolved',
  },
];

/**
 * Fetches community reports with client-side filtering.
 * Returns a Promise to mimic asynchronous fetching with loading states.
 */
export async function getCommunityReports(
  filter?: CommunityReportFilter
): Promise<CommunityReport[]> {
  // Simulate brief realistic async delay (120ms) for clean loading indicator test
  await new Promise((resolve) => setTimeout(resolve, 120));

  let results = [...MOCK_COMMUNITY_REPORTS];

  if (!filter) return results;

  // 1. Category Filter
  if (filter.category && filter.category !== 'all') {
    results = results.filter((r) => r.category === filter.category);
  }

  // 2. Severity Filter
  if (filter.severity && filter.severity !== 'all') {
    results = results.filter((r) => r.severity === filter.severity);
  }

  // 3. Time Period Filter
  if (filter.timePeriod && filter.timePeriod !== 'all') {
    const cutoff =
      filter.timePeriod === '24h'
        ? Date.now() - 24 * HOUR
        : filter.timePeriod === '7d'
        ? Date.now() - 7 * DAY
        : filter.timePeriod === '30d'
        ? Date.now() - 30 * DAY
        : 0;
    results = results.filter((r) => r.reportedAt >= cutoff);
  }

  // 4. Text Search Query
  if (filter.searchQuery && filter.searchQuery.trim()) {
    const q = filter.searchQuery.trim().toLowerCase();
    results = results.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.approximateLocation.toLowerCase().includes(q) ||
        r.categoryLabel.toLowerCase().includes(q)
    );
  }

  return results;
}
