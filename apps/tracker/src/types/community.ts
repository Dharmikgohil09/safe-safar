import { Destination, SosState, TrackingSession } from './tracker';

export type ReportCategory =
  | 'poor-lighting'
  | 'harassment'
  | 'isolated-area'
  | 'other';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CommunityReport {
  id: string;
  category: ReportCategory;
  categoryLabel: string;
  severity: ReportSeverity;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  approximateLocation: string;
  reportedAt: number; // epoch ms
  status: 'investigating' | 'verified' | 'resolved';
}

export interface CommunityReportFilter {
  category?: ReportCategory | 'all';
  severity?: ReportSeverity | 'all';
  timePeriod?: 'all' | '24h' | '7d' | '30d';
  searchQuery?: string;
}

export interface AdminSummaryStats {
  totalSessions: number;
  activeSosCount: number;
  resolvedSosCount: number;
  communityReportsCount: number;
}

export interface AdminSosRecord {
  id: string;
  sessionTokenMasked: string;
  rawToken: string;
  userNameMasked: string;
  sosState: SosState;
  status: string;
  triggeredAt: number;
  approximateLocation: string;
  destinationName: string;
  batteryLevel?: number | null;
  emergencyContactStatus: string;
}

export interface AdminSessionRecord {
  tokenMasked: string;
  rawToken: string;
  userNameMasked: string;
  status: 'active' | 'completed' | 'sos' | 'expired' | 'resolved';
  sosState: SosState;
  destinationName: string;
  startedAt: number;
  lastUpdated?: number | null;
  batteryLevel?: number | null;
  approximateLocation: string;
}
