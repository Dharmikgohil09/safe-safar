import { api } from './api';

export type ReportCategory =
  | 'poor_lighting'
  | 'harassment'
  | 'suspicious_activity'
  | 'unsafe_pathway'
  | 'other';

export const REPORT_CATEGORY_MAP: Record<string, ReportCategory> = {
  'Poor lighting': 'poor_lighting',
  'Harassment': 'harassment',
  'Suspicious activity': 'suspicious_activity',
  'Road hazard': 'unsafe_pathway',
  'Other': 'other',
};

export const UI_REPORT_CATEGORIES: Array<{ label: string; value: ReportCategory }> = [
  { label: 'Poor lighting', value: 'poor_lighting' },
  { label: 'Harassment', value: 'harassment' },
  { label: 'Suspicious activity', value: 'suspicious_activity' },
  { label: 'Road hazard', value: 'unsafe_pathway' },
  { label: 'Other', value: 'other' },
];

export interface CreateReportPayload {
  category: ReportCategory;
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
}

export interface ReportItem {
  id: string;
  category: string;
  description: string;
  address?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  status?: string;
  confirmationCount?: number;
  isActive?: boolean;
  createdAt: string;
}

export const reportService = {
  /**
   * Submit an incident or hazard report to MongoDB Atlas via backend API.
   * Sends coordinates in strict GeoJSON [longitude, latitude] order.
   */
  async submitReport(payload: CreateReportPayload): Promise<{ success: boolean; report: ReportItem }> {
    const body = {
      category: payload.category,
      type: payload.category,
      location: {
        type: 'Point',
        coordinates: [payload.longitude, payload.latitude], // [lng, lat]
      },
      latitude: payload.latitude,
      longitude: payload.longitude,
      description: payload.description || '',
      note: payload.description || '',
      address: payload.address || '',
    };

    const res = await api.post('/api/reports', body);
    return res.data;
  },

  /**
   * Fetch nearby verified reports for display or safety scoring.
   */
  async getNearbyReports(lat: number, lng: number, radius = 1000): Promise<ReportItem[]> {
    const res = await api.get('/api/reports/nearby', {
      params: { lat, lng, radius },
    });
    return res.data?.data || res.data?.reports || [];
  },
};
