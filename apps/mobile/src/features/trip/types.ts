import type { Contact } from '../emergency';

export type { Contact };

export interface ContactFormData {
  id?: string;
  name: string;
  phone: string;
}

export interface FormValidationErrors {
  name?: string;
  phone?: string;
  general?: string;
}

export interface FeedbackNotice {
  type: 'success' | 'error' | 'info';
  message: string;
}
