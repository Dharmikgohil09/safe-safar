import * as SecureStore from 'expo-secure-store';
import type { Contact } from '../types';

// SOS must work with no internet, so contacts are read from this local cache,
// never from the API. Harshil's contacts screen writes here via setContacts().

const CONTACTS_KEY = 'safesafar.contacts.v1';
const NAME_KEY = 'safesafar.username.v1';

/** Keeps digits and a leading +. A bare 10-digit Indian mobile number gets +91. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  if (trimmed.startsWith('+')) return digits.length >= 8 ? `+${digits}` : null;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}

export async function setContacts(contacts: Contact[]): Promise<Contact[]> {
  const clean: Contact[] = [];
  for (const c of contacts) {
    const phone = normalizePhone(c.phone);
    if (phone) clean.push({ ...c, phone });
  }
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(clean));
  return clean;
}

export async function getContacts(): Promise<Contact[]> {
  try {
    const raw = await SecureStore.getItemAsync(CONTACTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Contact[]) : [];
  } catch {
    return [];
  }
}

export async function setUserName(name: string): Promise<void> {
  await SecureStore.setItemAsync(NAME_KEY, name.trim());
}

export async function getUserName(): Promise<string | undefined> {
  try {
    return (await SecureStore.getItemAsync(NAME_KEY)) ?? undefined;
  } catch {
    return undefined;
  }
}
