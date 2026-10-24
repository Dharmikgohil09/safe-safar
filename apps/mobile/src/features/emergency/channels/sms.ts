import { Linking } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import SmsAndroid from 'react-native-get-sms-android';
import { hasPermission } from '../permissions';
import type { Channel, Contact, SosContext } from '../types';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

// Sends from the user's own SIM through SmsManager. No internet needed.
// Android asks the user to confirm after roughly 30 messages in 30 minutes,
// so follow-up location updates are throttled.

const UPDATE_MIN_MS = 3 * 60 * 1000;
let lastSentAt = 0;

// Plain ASCII only, so one message stays a single 160-character SMS part.
function ascii(s: string): string {
  return s.replace(/[^\x20-\x7E]/g, '').trim();
}

function mapsLink(ctx: SosContext): string {
  if (!ctx.coords) return 'location unavailable';
  return `https://maps.google.com/?q=${ctx.coords.lat.toFixed(5)},${ctx.coords.lng.toFixed(5)}`;
}

function trackerLink(token: string): string {
  const base = (process.env.EXPO_PUBLIC_TRACKER_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/track/${token}`;
}

export function buildSosText(ctx: SosContext, kind: 'alert' | 'update' | 'clear'): string {
  const who = ascii(ctx.userName ?? '') || 'Your contact';
  const liveTracker = ctx.trackingToken ? ` Live track: ${trackerLink(ctx.trackingToken)}` : '';

  switch (kind) {
    case 'alert':
      return `SOS from SafeSafar: ${who} needs help. Location: ${mapsLink(ctx)}.${liveTracker}`;
    case 'update': {
      const d = new Date(ctx.coords?.ts ?? Date.now());
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `SafeSafar update: ${who} location ${mapsLink(ctx)} (${hh}:${mm}).${liveTracker}`;
    }
    case 'clear':
      return `SafeSafar: ${who} is safe now. The SOS has ended.`;
  }
}

// The native side (patched, see patches/) answers within 30 s. This is a second safety net so a
// stuck native call can never freeze the whole SOS.
const SEND_TIMEOUT_MS = 35_000;

function sendOne(phone: string, text: string): Promise<void> {
  if (isExpoGo || !SmsAndroid || typeof (SmsAndroid as any).autoSend !== 'function') {
    console.log(`[SafeSafar Expo Go] Simulated / External SMS to ${phone}: ${text}`);
    Linking.openURL(`sms:${phone}?body=${encodeURIComponent(text)}`).catch(() => {});
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`no send confirmation after ${SEND_TIMEOUT_MS / 1000}s`)),
      SEND_TIMEOUT_MS,
    );
    SmsAndroid.autoSend(
      phone,
      text,
      (err) => {
        clearTimeout(timer);
        reject(new Error(String(err)));
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

async function sendToAll(contacts: Contact[], text: string): Promise<void> {
  if (contacts.length === 0) throw new Error('no trusted contacts saved');
  if (!isExpoGo && !(await hasPermission('SEND_SMS'))) throw new Error('SEND_SMS permission not granted');

  const results = await Promise.allSettled(contacts.map((c) => sendOne(c.phone, text)));
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed.length === results.length) {
    throw new Error(`all SMS failed: ${failed[0].reason}`);
  }
  if (failed.length > 0) {
    console.warn(`[sms] ${failed.length} of ${results.length} messages failed: ${failed[0].reason}`);
  }
}

/** Sends one plain test SMS to every saved contact, without starting an SOS. */
export async function sendTestSms(contacts: Contact[]): Promise<void> {
  await sendToAll(contacts, 'SafeSafar test message. No emergency, ignore this.');
}

export const smsChannel: Channel = {
  name: 'sms',

  async onActivate(ctx) {
    lastSentAt = Date.now();
    await sendToAll(ctx.contacts, buildSosText(ctx, 'alert'));
  },

  async onUpdate(ctx) {
    if (!ctx.coords) return;
    if (Date.now() - lastSentAt < UPDATE_MIN_MS) return;
    lastSentAt = Date.now();
    await sendToAll(ctx.contacts, buildSosText(ctx, 'update'));
  },

  async onResolve(ctx) {
    await sendToAll(ctx.contacts, buildSosText(ctx, 'clear'));
  },
};
