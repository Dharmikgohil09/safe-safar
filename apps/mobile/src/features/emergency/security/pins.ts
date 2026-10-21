import * as SecureStore from 'expo-secure-store';
import { asciiBytes, fromHex, sha256, toHex } from './sha256';

// The real PIN ends an SOS. The duress PIN looks like it ends it, but keeps the SOS going silently.
//
// Neither PIN is stored in plain text: each is salted and hashed (1000 rounds). The real protection
// is expo-secure-store, which keeps the values encrypted with the Android Keystore. A 4-digit PIN
// only has 10,000 possibilities, so the hash alone could not stop someone who copied the stored value.

const REAL_KEY = 'safesafar.pin.real.v1';
const DURESS_KEY = 'safesafar.pin.duress.v1';
const ITERATIONS = 1000;

interface Stored {
  salt: string; // hex
  hash: string; // hex
  it: number;
}

export type PinCheck = 'real' | 'duress' | 'wrong';

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(out);
  } else {
    // A salt only has to be unique, not secret, so this fallback is fine.
    for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

function derive(pin: string, saltHex: string, iterations: number): string {
  const salt = fromHex(saltHex);
  const p = asciiBytes(pin);
  const buf = new Uint8Array(32 + salt.length + p.length);
  buf.set(salt, 32);
  buf.set(p, 32 + salt.length);
  let h: Uint8Array = sha256(buf.subarray(32)); // round 1: salt + pin
  for (let i = 1; i < iterations; i++) {
    buf.set(h, 0);
    h = sha256(buf); // later rounds: previous hash + salt + pin
  }
  return toHex(h);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function load(key: string): Promise<Stored | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Stored;
    return typeof v.salt === 'string' && typeof v.hash === 'string' && typeof v.it === 'number' ? v : null;
  } catch {
    return null;
  }
}

async function save(key: string, pin: string): Promise<void> {
  const salt = toHex(randomBytes(16));
  const stored: Stored = { salt, hash: derive(pin, salt, ITERATIONS), it: ITERATIONS };
  await SecureStore.setItemAsync(key, JSON.stringify(stored));
}

/** Returns an error message, or null when the PIN is acceptable: 4 to 6 digits. */
export function validatePinFormat(pin: string): string | null {
  return /^\d{4,6}$/.test(pin) ? null : 'PIN must be 4 to 6 digits';
}

export async function setPins(
  realPin: string,
  duressPin: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const bad = validatePinFormat(realPin) ?? validatePinFormat(duressPin);
  if (bad) return { ok: false, error: bad };
  if (realPin === duressPin) return { ok: false, error: 'The two PINs must be different' };
  await save(REAL_KEY, realPin);
  await save(DURESS_KEY, duressPin);
  return { ok: true };
}

export async function hasPins(): Promise<boolean> {
  const [r, d] = await Promise.all([load(REAL_KEY), load(DURESS_KEY)]);
  return r !== null && d !== null;
}

export async function clearPins(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(REAL_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(DURESS_KEY).catch(() => undefined),
  ]);
}

/** Both PINs are always checked, so the time taken does not reveal which one was close. */
export async function verifyPin(pin: string): Promise<PinCheck> {
  const [real, duress] = await Promise.all([load(REAL_KEY), load(DURESS_KEY)]);
  if (!real || !duress || validatePinFormat(pin) !== null) return 'wrong';
  const realMatch = safeEqual(derive(pin, real.salt, real.it), real.hash);
  const duressMatch = safeEqual(derive(pin, duress.salt, duress.it), duress.hash);
  if (realMatch) return 'real';
  if (duressMatch) return 'duress';
  return 'wrong';
}
