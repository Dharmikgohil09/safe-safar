import type { EmergencyPermissions } from '../../emergency';

export interface OnboardingStep {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  icon: string;
  highlights: {
    icon: string;
    title: string;
    description: string;
  }[];
}

export interface PermissionStatusState {
  location: boolean;
  background: boolean;
  sms: boolean;
  call: boolean;
  mic: boolean;
}

export type { EmergencyPermissions };
