export const REPORT_TYPES = [
  'Poor lighting',
  'Harassment',
  'Suspicious activity',
  'Road hazard',
  'Other',
] as const;

export type ReportType = typeof REPORT_TYPES[number];

export const DEFAULT_REPORT_TYPE: ReportType = 'Poor lighting';

export const SAMPLE_LOCATION = 'Near SVNIT, Surat';
