import * as SecureStore from 'expo-secure-store';

// A fake incoming call, so you can leave an uncomfortable situation ("I have to take this").
//
// Two parts:
//  - the screen (screens/FakeCallScreen.tsx) that looks like a phone call
//  - a notification (Notifee) that rings with a full-screen intent, so the call also shows on the lock
//    screen or when the app is closed. If Notifee is missing (an old build), only the in-app path
//    works and it still rings with vibration.

export type FakeCallPhase = 'idle' | 'ringing' | 'incall';

export interface FakeCallProfile {
  name: string;
  number: string;
}

const PROFILE_KEY = 'safesafar.fakecall.profile.v1';
const NOTIF_ID = 'safesafar-fakecall';
const CHANNEL_ID = 'safesafar-fakecall-v1';
const DEFAULT_PROFILE: FakeCallProfile = { name: 'Mom', number: '+91 98765 43210' };

// ---- tiny store, works with useSyncExternalStore ----
let phase: FakeCallPhase = 'idle';
const listeners = new Set<() => void>();
const setPhase = (p: FakeCallPhase) => {
  if (phase === p) return;
  phase = p;
  listeners.forEach((l) => l());
};
export const fakeCallStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot: (): FakeCallPhase => phase,
};

// ---- who is "calling" ----
let profile: FakeCallProfile = { ...DEFAULT_PROFILE };
export const getFakeCallProfile = (): FakeCallProfile => profile;

export async function loadFakeCallProfile(): Promise<FakeCallProfile> {
  try {
    const raw = await SecureStore.getItemAsync(PROFILE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<FakeCallProfile>;
      if (typeof v.name === 'string' && typeof v.number === 'string') profile = { name: v.name, number: v.number };
    }
  } catch {
    // keep the default
  }
  return profile;
}

export async function setFakeCallProfile(p: FakeCallProfile): Promise<void> {
  const name = p.name.trim() || DEFAULT_PROFILE.name;
  const number = p.number.trim();
  profile = { name, number };
  try {
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // not saved, but it still works for this session
  }
}

// ---- Notifee (optional) ----
type Notifee = typeof import('@notifee/react-native');
let notifeeMod: Notifee | null | undefined;

function nf(): Notifee | null {
  if (notifeeMod !== undefined) return notifeeMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@notifee/react-native') as Notifee;
    notifeeMod = m && m.default ? m : null;
  } catch {
    notifeeMod = null;
  }
  return notifeeMod;
}

export const isFakeCallNotificationAvailable = (): boolean => nf() !== null;

async function ensureChannel(n: Notifee): Promise<string> {
  const { AndroidImportance, AndroidVisibility } = n;
  return n.default.createChannel({
    id: CHANNEL_ID,
    name: 'Incoming call',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
    vibration: true,
    vibrationPattern: [500, 1000, 500, 1000],
    bypassDnd: true,
  });
}

/** Asks for notification permission, and says whether exact alarms are allowed (needed for the timer). */
export async function ensureFakeCallPermissions(): Promise<{ notifications: boolean; exactAlarm: boolean }> {
  const n = nf();
  if (!n) return { notifications: false, exactAlarm: false };
  try {
    const s = await n.default.requestPermission();
    const settings = await n.default.getNotificationSettings();
    const alarm = (settings.android as { alarm?: number } | undefined)?.alarm;
    return {
      notifications: s.authorizationStatus >= n.AuthorizationStatus.AUTHORIZED,
      exactAlarm: alarm === undefined || alarm === 1,
    };
  } catch {
    return { notifications: false, exactAlarm: false };
  }
}

/** Opens the system screen where the user allows exact alarms (Android 12+). */
export async function openExactAlarmSettings(): Promise<void> {
  try {
    await nf()?.default.openAlarmPermissionSettings();
  } catch {
    // nothing to do
  }
}

function notificationFor(n: Notifee, channelId: string) {
  const { AndroidCategory, AndroidImportance, AndroidVisibility } = n;
  return {
    id: NOTIF_ID,
    title: profile.name,
    body: 'Incoming call',
    data: { kind: 'fakecall' },
    android: {
      channelId,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      ongoing: true,
      autoCancel: false,
      loopSound: true,
      fullScreenAction: { id: 'default' },
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  };
}

let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Rings after `delaySec` seconds (0 = now). Works with the screen locked or the app closed when
 * Notifee is available. Returns how it was scheduled.
 */
export async function scheduleFakeCall(delaySec: number): Promise<'notification' | 'in-app'> {
  cancelFakeCall(false);
  const n = nf();
  const ms = Math.max(0, delaySec) * 1000;

  if (n) {
    try {
      const channelId = await ensureChannel(n);
      const notif = notificationFor(n, channelId);
      if (ms === 0) {
        await n.default.displayNotification(notif);
        setPhase('ringing');
      } else {
        await n.default.createTriggerNotification(notif, {
          type: n.TriggerType.TIMESTAMP,
          timestamp: Date.now() + ms,
          alarmManager: { allowWhileIdle: true },
        });
        // when the app is open the screen is raised by the delivered event (initFakeCall), but a
        // timer here covers the case where that event does not arrive
        timer = setTimeout(() => setPhase('ringing'), ms + 500);
      }
      return 'notification';
    } catch {
      // fall through to the in-app path
    }
  }

  if (ms === 0) setPhase('ringing');
  else timer = setTimeout(() => setPhase('ringing'), ms);
  return 'in-app';
}

export function cancelFakeCall(resetScreen = true): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
  const n = nf();
  if (n) {
    void n.default.cancelTriggerNotification(NOTIF_ID).catch(() => undefined);
    void n.default.cancelNotification(NOTIF_ID).catch(() => undefined);
  }
  if (resetScreen) setPhase('idle');
}

export function acceptFakeCall(): void {
  const n = nf();
  if (n) void n.default.cancelNotification(NOTIF_ID).catch(() => undefined); // stop the ringing
  setPhase('incall');
}

export function endFakeCall(): void {
  cancelFakeCall(true);
}

let initialised = false;

/**
 * Call once when the app starts. Raises the call screen when the ring notification is delivered,
 * tapped, or when it was the full-screen intent that launched the app.
 */
export async function initFakeCall(): Promise<void> {
  await loadFakeCallProfile();
  const n = nf();
  if (!n || initialised) return;
  initialised = true;
  const { EventType } = n;
  const isFake = (d?: { notification?: { id?: string; data?: Record<string, unknown> } }) =>
    d?.notification?.id === NOTIF_ID || d?.notification?.data?.kind === 'fakecall';

  n.default.onForegroundEvent(({ type, detail }) => {
    if (!isFake(detail)) return;
    if (type === EventType.DELIVERED || type === EventType.PRESS) setPhase('ringing');
    if (type === EventType.DISMISSED) setPhase('idle');
  });

  try {
    const initial = await n.default.getInitialNotification();
    if (initial && isFake(initial)) setPhase('ringing');
  } catch {
    // ignore
  }
}

/**
 * Notifee wants a background handler registered at the app's entry point, otherwise it warns.
 * Calling this at the top level of the root file is enough; it does nothing else.
 */
export function registerFakeCallBackground(): void {
  const n = nf();
  if (!n) return;
  n.default.onBackgroundEvent(async () => undefined);
}
