import {
  AdminSessionRecord,
  AdminSosRecord,
  AdminSummaryStats,
  CommunityReport,
} from '../types/community';
import { MOCK_COMMUNITY_REPORTS } from './communityReportsService';

/**
 * SafeSafar Read-Only Admin Data Service (DEMO DATA)
 * ==================================================
 * Provides aggregated session records, SOS events, and community incident reports.
 * All summary metrics are dynamically computed from the underlying data models.
 * Personal information (full phone numbers, residential addresses) is safely masked.
 */

const NOW = Date.now();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Demonstration session dataset based on tracker mock scenarios
const MOCK_ADMIN_SESSIONS: AdminSessionRecord[] = [
  {
    tokenMasked: 'safe-live-***-2026',
    rawToken: 'safesafar-live-session-2026',
    userNameMasked: 'Ananya S.',
    status: 'active',
    sosState: 'normal',
    destinationName: 'Lodhi Colony, Central Delhi',
    startedAt: NOW - 25 * MINUTE,
    lastUpdated: NOW - 12 * 1000,
    batteryLevel: 78,
    approximateLocation: 'Janpath Road, Central Delhi',
  },
  {
    tokenMasked: 'sos-act-***-9841',
    rawToken: 'sos-active',
    userNameMasked: 'Ananya S.',
    status: 'sos',
    sosState: 'active',
    destinationName: 'Lodhi Estate Home Block 4',
    startedAt: NOW - 40 * MINUTE,
    lastUpdated: NOW - 8 * 1000,
    batteryLevel: 42,
    approximateLocation: 'C-Hexagon India Gate Sector',
  },
  {
    tokenMasked: 'sos-res-***-3312',
    rawToken: 'sos-resolved',
    userNameMasked: 'Ananya S.',
    status: 'resolved',
    sosState: 'resolved',
    destinationName: 'Lodhi Estate Home Block 4',
    startedAt: NOW - 55 * MINUTE,
    lastUpdated: NOW - 45 * 1000,
    batteryLevel: 71,
    approximateLocation: 'Lodhi Colony Approach Road',
  },
  {
    tokenMasked: 'no-dest-***-1102',
    rawToken: 'no-destination',
    userNameMasked: 'Ananya S.',
    status: 'active',
    sosState: 'normal',
    destinationName: 'No destination specified',
    startedAt: NOW - 15 * MINUTE,
    lastUpdated: NOW - 18 * 1000,
    batteryLevel: 80,
    approximateLocation: 'Connaught Circus Inner Ring',
  },
  {
    tokenMasked: 'exp-tok-***-7714',
    rawToken: 'expired-token',
    userNameMasked: 'Priya V.',
    status: 'expired',
    sosState: 'normal',
    destinationName: 'Hauz Khas Village Metro Area',
    startedAt: NOW - 3 * HOUR,
    lastUpdated: NOW - 2 * HOUR,
    batteryLevel: 15,
    approximateLocation: 'Aurobindo Marg Corridor',
  },
];

// Demonstration SOS event logs
const MOCK_ADMIN_SOS_EVENTS: AdminSosRecord[] = [
  {
    id: 'sos-evt-101',
    sessionTokenMasked: 'sos-act-***-9841',
    rawToken: 'sos-active',
    userNameMasked: 'Ananya S.',
    sosState: 'active',
    status: 'Active Alert',
    triggeredAt: NOW - 14 * MINUTE,
    approximateLocation: 'C-Hexagon India Gate Sector',
    destinationName: 'Lodhi Estate Home Block 4',
    batteryLevel: 42,
    emergencyContactStatus: 'SMS Dispatched & Contact Notified',
  },
  {
    id: 'sos-evt-102',
    sessionTokenMasked: 'sos-res-***-3312',
    rawToken: 'sos-resolved',
    userNameMasked: 'Ananya S.',
    sosState: 'resolved',
    status: 'Resolved by User',
    triggeredAt: NOW - 52 * MINUTE,
    approximateLocation: 'Lodhi Colony Approach Road',
    destinationName: 'Lodhi Estate Home Block 4',
    batteryLevel: 71,
    emergencyContactStatus: 'All-Clear Signal Sent',
  },
  {
    id: 'sos-evt-103',
    sessionTokenMasked: 'sos-his-***-5521',
    rawToken: 'historical-sos-sample',
    userNameMasked: 'Kavita M.',
    sosState: 'resolved',
    status: 'Resolved Safely',
    triggeredAt: NOW - 18 * HOUR,
    approximateLocation: 'Rajiv Chowk Underpass Sector 2',
    destinationName: 'Barakhamba Road Hub',
    batteryLevel: 65,
    emergencyContactStatus: 'Assistance Confirmed by Family',
  },
];

/**
 * Computes dynamic KPI summary stats directly from the source collections.
 */
export async function getAdminSummaryStats(): Promise<AdminSummaryStats> {
  const activeSos = MOCK_ADMIN_SOS_EVENTS.filter((e) => e.sosState === 'active').length;
  const resolvedSos = MOCK_ADMIN_SOS_EVENTS.filter((e) => e.sosState === 'resolved').length;

  return {
    totalSessions: MOCK_ADMIN_SESSIONS.length,
    activeSosCount: activeSos,
    resolvedSosCount: resolvedSos,
    communityReportsCount: MOCK_COMMUNITY_REPORTS.length,
  };
}

/**
 * Fetches tracking session records with search and status filters.
 */
export async function getAdminSessions(
  searchQuery?: string,
  statusFilter?: string
): Promise<AdminSessionRecord[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));

  let items = [...MOCK_ADMIN_SESSIONS];

  if (statusFilter && statusFilter !== 'all') {
    items = items.filter((s) => s.status === statusFilter || s.sosState === statusFilter);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    items = items.filter(
      (s) =>
        s.tokenMasked.toLowerCase().includes(q) ||
        s.rawToken.toLowerCase().includes(q) ||
        s.userNameMasked.toLowerCase().includes(q) ||
        s.destinationName.toLowerCase().includes(q) ||
        s.approximateLocation.toLowerCase().includes(q)
    );
  }

  return items;
}

/**
 * Fetches SOS events with search and state filters.
 */
export async function getAdminSosEvents(
  searchQuery?: string,
  sosStateFilter?: string
): Promise<AdminSosRecord[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));

  let items = [...MOCK_ADMIN_SOS_EVENTS];

  if (sosStateFilter && sosStateFilter !== 'all') {
    items = items.filter((e) => e.sosState === sosStateFilter);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    items = items.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        e.sessionTokenMasked.toLowerCase().includes(q) ||
        e.userNameMasked.toLowerCase().includes(q) ||
        e.approximateLocation.toLowerCase().includes(q) ||
        e.emergencyContactStatus.toLowerCase().includes(q)
    );
  }

  return items;
}

/**
 * Fetches community safety reports for the admin view.
 */
export async function getAdminCommunityReports(
  searchQuery?: string,
  categoryFilter?: string
): Promise<CommunityReport[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));

  let items = [...MOCK_COMMUNITY_REPORTS];

  if (categoryFilter && categoryFilter !== 'all') {
    items = items.filter((r) => r.category === categoryFilter);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    items = items.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.approximateLocation.toLowerCase().includes(q) ||
        r.categoryLabel.toLowerCase().includes(q) ||
        r.severity.toLowerCase().includes(q)
    );
  }

  return items;
}
