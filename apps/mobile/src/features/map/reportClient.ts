import { IncidentReport, LatLng } from '../../types';
import { MAP_CONFIG } from '../../config/mapConfig';
import { calculateDistanceMeters } from '../../utils/geo';
import { parseIncidentReport } from '../../models/IncidentReport';
import suratReportsJson from '../../../assets/data/surat_reports.json';

const defaultLocalReports: IncidentReport[] = (suratReportsJson as any[]).map(parseIncidentReport);

export interface FetchReportsOptions {
  near?: LatLng;
  radiusMeters?: number;
  token?: string;
}

export interface CreateReportRequest {
  type: 'dark_street' | 'harassment' | 'broken_light' | 'unsafe_group' | 'stray_animals' | 'dead_zone';
  location: {
    coordinates: [number, number]; // [lng, lat]
  };
  description: string;
}

/**
 * Client for fetching community incident reports for the map heatmap layer.
 * Conforms to docs/api.md section 6.1 (Satej's reports endpoint: GET /reports?near=).
 */
export async function fetchCommunityReports(options?: FetchReportsOptions): Promise<IncidentReport[]> {
  const { near, radiusMeters = 5000, token } = options || {};

  // 1. Try Satej's backend GET /reports?near=
  try {
    let url = `${MAP_CONFIG.apiUrl}/reports`;
    if (near) {
      url += `?near=${near.longitude},${near.latitude}&radius=${radiusMeters}`;
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map(parseIncidentReport);
      }
    }
  } catch (_) {
    // Satej's endpoint offline or mock active; proceed to local verified dataset
  }

  // 2. Filter local verified reports if near location is specified
  if (near) {
    return defaultLocalReports.filter((report) => {
      const dist = calculateDistanceMeters(near, report.coordinates);
      return dist <= radiusMeters;
    });
  }

  return defaultLocalReports;
}

/**
 * Filter a given set of reports within radius of a location
 */
export function filterReportsNear(
  reports: IncidentReport[],
  location: LatLng,
  radiusMeters: number = 3000
): IncidentReport[] {
  return reports.filter((r) => calculateDistanceMeters(location, r.coordinates) <= radiusMeters);
}

/**
 * Submit a community incident report to Satej's POST /reports endpoint
 */
export async function submitCommunityReport(
  report: CreateReportRequest,
  token?: string
): Promise<IncidentReport> {
  const url = `${MAP_CONFIG.apiUrl}/reports`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(report),
  });

  if (!res.ok) {
    throw new Error(`Failed to submit report: HTTP ${res.status}`);
  }

  const data = await res.json();
  return parseIncidentReport(data?.data || report);
}
