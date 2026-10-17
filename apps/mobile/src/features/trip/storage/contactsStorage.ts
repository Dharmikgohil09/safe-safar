import { Platform } from 'react-native';
import {
  getContacts as getEmergencyContacts,
  normalizePhone,
  setContacts as setEmergencyContacts,
  type Contact,
} from '../../emergency';

const CONTACTS_KEY = 'safesafar.contacts.v1';

/**
 * Platform-aware contact retrieval:
 * On native Android / iOS, uses Kristal's SecureStore cache.
 * In web preview, uses browser localStorage with the exact same key and data format.
 */
export async function getTripContacts(): Promise<Contact[]> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(CONTACTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Contact[]) : [];
      }
    } catch {
      return [];
    }
    return [];
  }

  return getEmergencyContacts();
}

/**
 * Platform-aware contact persistence:
 * On native Android / iOS, writes to Kristal's SecureStore cache.
 * In web preview, writes to browser localStorage with the exact same key and data format.
 */
export async function saveTripContacts(contacts: Contact[]): Promise<Contact[]> {
  const clean: Contact[] = [];
  for (const c of contacts) {
    const phone = normalizePhone(c.phone);
    if (phone) clean.push({ ...c, phone });
  }

  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(clean));
        return clean;
      }
      throw new Error('Local storage is unavailable in this environment.');
    } catch (err) {
      throw err;
    }
  }

  return setEmergencyContacts(clean);
}
