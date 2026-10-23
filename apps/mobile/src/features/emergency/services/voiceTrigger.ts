import { PermissionsAndroid, Vibration } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { registerDefaultChannels } from '../channels/defaults';
import { sosEngine } from '../engine/sosEngine';
import { PhraseMatcher } from './phraseMatcher';

// Always-on voice trigger: say the phrase (default "help me" twice) and an SOS starts.
//
// How it works: Vosk (offline speech recognition, no account or internet) listens for ONLY the
// phrase. A Notifee foreground service shows a "SafeSafar is listening" notification, which is what
// lets Android keep the microphone running with the screen off.
//
// Limits to know:
//  - It must be switched on while the app is open (Android 14 does not let an app start the
//    microphone from the background). It then keeps running with the screen off or the app minimised.
//  - If Android kills the app, or the phone restarts, open the app once to start listening again.
//  - Speech recognition is not perfect: it can miss the phrase, and it can hear it by mistake.

const ENABLED_KEY = 'safesafar.voice.enabled.v1';
const MODEL = 'model-en-en'; // folder name in assets/, see the zip's README
const NOTIF_ID = 'safesafar-listening';
const CHANNEL_ID = 'safesafar-listening-v1';

type VoskApi = {
  loadModel(path: string): Promise<unknown>;
  start(options?: { grammar?: string[]; timeout?: number }): Promise<unknown>;
  stop(): unknown;
  unload(): unknown;
  onResult(cb: (e: string) => void): { remove(): void };
  onError(cb: (e: unknown) => void): { remove(): void };
  onTimeout(cb: () => void): { remove(): void };
};

type Notifee = typeof import('@notifee/react-native');

function loadVosk(): VoskApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('react-native-vosk') as Partial<VoskApi> & { default?: Partial<VoskApi> };
    const api = (m.loadModel ? m : m.default) as VoskApi | undefined;
    return api && typeof api.loadModel === 'function' && typeof api.start === 'function' ? api : null;
  } catch {
    return null;
  }
}

function loadNotifee(): Notifee | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@notifee/react-native') as Notifee;
    return m && m.default ? m : null;
  } catch {
    return null;
  }
}

export const isVoiceTriggerAvailable = (): boolean => loadVosk() !== null;

// ---- state, observable so the UI can show it ----
export type VoiceState = 'off' | 'starting' | 'listening' | 'error';
let state: VoiceState = 'off';
let lastError = '';
let lastHeard = '';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const setState = (s: VoiceState, err = '') => {
  state = s;
  lastError = err;
  emit();
};
export const voiceStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot: (): VoiceState => state,
};
export const getVoiceError = (): string => lastError;
export const getLastHeard = (): string => lastHeard;

const matcher = new PhraseMatcher();

/** How many times the phrase must be heard. 1 = most sensitive, 2 = fewer false alarms (default). */
export function setVoiceSensitivity(hitsRequired: 1 | 2 | 3): void {
  matcher.setOptions({ hitsRequired });
}
export function setVoicePhrases(phrases: string[]): void {
  const clean = phrases.map((p) => p.trim()).filter(Boolean);
  if (clean.length) matcher.setOptions({ phrases: clean });
}

// ---- foreground service (keeps the microphone alive with the screen off) ----
async function startForeground(n: Notifee): Promise<void> {
  const channelId = await n.default.createChannel({
    id: CHANNEL_ID,
    name: 'Voice trigger',
    importance: n.AndroidImportance.LOW,
  });
  await n.default.displayNotification({
    id: NOTIF_ID,
    title: 'SafeSafar is listening',
    body: 'Say your help phrase to send an SOS',
    android: {
      channelId,
      asForegroundService: true,
      ongoing: true,
      foregroundServiceTypes: [n.AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE],
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  });
}

async function stopForeground(n: Notifee | null): Promise<void> {
  try {
    await n?.default.stopForegroundService();
    await n?.default.cancelNotification(NOTIF_ID);
  } catch {
    // already stopped
  }
}

/**
 * Notifee needs a runner function for the foreground service, registered once at app start. It just
 * has to stay alive; stopping the service resolves it. Called from registerEmergencyBackground().
 */
export function registerVoiceForegroundService(): void {
  const n = loadNotifee();
  if (!n) return;
  n.default.registerForegroundService(() => new Promise<void>(() => undefined));
}

// ---- listening ----
let subs: { remove(): void }[] = [];
let restartTimer: ReturnType<typeof setTimeout> | undefined;
let wanted = false;

function fireSos(): void {
  Vibration.vibrate(400); // so the person knows it heard them
  registerDefaultChannels();
  const s = sosEngine.getSnapshot().state;
  if (s === 'idle' || s === 'resolved') sosEngine.trigger('voice', { immediate: true });
}

async function begin(vosk: VoskApi): Promise<void> {
  subs.forEach((s) => s.remove());
  subs = [
    vosk.onResult((raw) => {
      if (matcher.feed(raw, Date.now())) fireSos();
      try {
        const t = (JSON.parse(raw) as { text?: string }).text;
        if (t) lastHeard = t;
      } catch {
        lastHeard = String(raw);
      }
      emit();
    }),
    vosk.onError((e) => scheduleRestart(vosk, `recogniser error: ${String(e)}`)),
    vosk.onTimeout(() => scheduleRestart(vosk, 'timeout')),
  ];
  // grammar = only the phrases, plus [unk] so other speech is ignored instead of forced into a phrase
  const phrases = matcher.getPhrases();
  await vosk.start({ grammar: [...phrases, '[unk]'] });
}

function scheduleRestart(vosk: VoskApi, why: string): void {
  if (!wanted) return;
  if (restartTimer) clearTimeout(restartTimer);
  setState('starting', why);
  restartTimer = setTimeout(() => {
    if (!wanted) return;
    try {
      vosk.stop();
    } catch {
      // not running
    }
    begin(vosk).then(
      () => setState('listening'),
      (e) => scheduleRestart(vosk, `restart failed: ${String(e)}`),
    );
  }, 2000);
}

export async function startVoiceTrigger(): Promise<{ ok: boolean; reason?: string }> {
  const vosk = loadVosk();
  if (!vosk) {
    setState('error', 'voice engine missing: this needs the new build');
    return { ok: false, reason: lastError };
  }
  if (state === 'listening' || state === 'starting') return { ok: true };

  const mic = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (mic !== PermissionsAndroid.RESULTS.GRANTED) {
    setState('error', 'microphone permission not granted');
    return { ok: false, reason: lastError };
  }

  setState('starting');
  wanted = true;
  try {
    const n = loadNotifee();
    if (n) {
      await n.default.requestPermission(); // Android 13+: the "listening" notification must be allowed
      await startForeground(n);
    }
    await vosk.loadModel(MODEL);
    await begin(vosk);
    await SecureStore.setItemAsync(ENABLED_KEY, '1').catch(() => undefined);
    setState('listening');
    return { ok: true };
  } catch (e) {
    wanted = false;
    await stopForeground(loadNotifee());
    setState('error', `could not start: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, reason: lastError };
  }
}

export async function stopVoiceTrigger(): Promise<void> {
  wanted = false;
  if (restartTimer) clearTimeout(restartTimer);
  subs.forEach((s) => s.remove());
  subs = [];
  const vosk = loadVosk();
  try {
    vosk?.stop();
  } catch {
    // not running
  }
  await stopForeground(loadNotifee());
  await SecureStore.deleteItemAsync(ENABLED_KEY).catch(() => undefined);
  matcher.reset();
  setState('off');
}

/** Call when the app starts: turns listening back on if the user had it on. */
export async function initVoiceTrigger(): Promise<void> {
  try {
    if ((await SecureStore.getItemAsync(ENABLED_KEY)) === '1') await startVoiceTrigger();
  } catch {
    // leave it off
  }
}
