import * as SecureStore from 'expo-secure-store';
import type { Channel, Coords, SosContext, SosSource } from '../types';

// Tells the SafeSafar backend about the SOS, so contacts get a Telegram alert with live tracking.
//
// It must work with a bad connection: the SOS is saved on the phone first, and sent whenever the
// network allows. Only the NEWEST state is kept (not a list of requests), so the saved data stays
// tiny and an old location is never sent after a newer one. The server accepts the same sosId more
// than once, so a retry never alerts anyone twice.
//
// Not configured (no server address) means this channel does nothing.

const CONFIG_KEY = 'safesafar.backend.config.v1'; // { baseUrl }
const DEVICE_KEY = 'safesafar.backend.device.v1'; // { userId, deviceKey, linkCode, botLink }
const PENDING_KEY = 'safesafar.backend.pending.v1';
const TIMEOUT_MS = 8000;
const RETRY_MS = [5_000, 10_000, 20_000, 40_000, 60_000];

interface Device {
  userId: string;
  deviceKey: string;
  linkCode: string;
  botLink: string;
}
interface Pending {
  sosId: string;
  source: SosSource;
  startedAt: number;
  coords: Coords | null;
  started: boolean; // server knows about this SOS
  sentTs: number; // timestamp of the newest location the server has
  resolved: boolean;
  resolveSent: boolean;
}

type Listener = (line: string) => void;
let listener: Listener | null = null;
export function setBackendListener(fn: Listener | null): void {
  listener = fn;
}
const say = (l: string) => listener?.(`backend: ${l}`);

// fetch can be swapped for tests
let fetchImpl: typeof fetch = (...a) => fetch(...a);
export function __setFetchForTests(f: typeof fetch | null): void {
  fetchImpl = f ?? ((...a) => fetch(...a));
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
async function writeJson(key: string, v: unknown): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(v));
  } catch {
    // storage failed: keep going with what is in memory
  }
}

export async function setBackendUrl(baseUrl: string | null): Promise<void> {
  if (baseUrl === null || !baseUrl.trim()) {
    await SecureStore.deleteItemAsync(CONFIG_KEY).catch(() => undefined);
    return;
  }
  await writeJson(CONFIG_KEY, { baseUrl: baseUrl.trim().replace(/\/$/, '') });
}
export const getBackendUrl = async (): Promise<string | null> => (await readJson<{ baseUrl: string }>(CONFIG_KEY))?.baseUrl ?? null;

/** The Telegram link the user shares with each trusted contact, once they have registered. */
export const getContactInviteLink = async (): Promise<string | null> => (await readJson<Device>(DEVICE_KEY))?.botLink ?? null;

async function http(baseUrl: string, path: string, body: unknown, dev?: Device): Promise<{ status: number; json: any }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(baseUrl + path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(dev ? { 'x-user-id': dev.userId, 'x-device-key': dev.deviceKey } : {}),
      },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  } finally {
    clearTimeout(t);
  }
}

/** Registers this phone once. Needs a connection, so it is best done on the setup screen. */
export async function registerBackendDevice(userName: string): Promise<Device> {
  const baseUrl = await getBackendUrl();
  if (!baseUrl) throw new Error('backend address not set');
  const r = await http(baseUrl, '/devices/register', { userName });
  if (r.status !== 201) throw new Error(`register failed (${r.status})`);
  await writeJson(DEVICE_KEY, r.json);
  return r.json as Device;
}

let busy: Promise<void> = Promise.resolve();
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryStep = 0;

/** Does everything the server is still missing. Runs one at a time. Never throws. */
export function syncBackend(): Promise<void> {
  busy = busy.then(doSync, doSync);
  return busy;
}

async function doSync(): Promise<void> {
  const baseUrl = await getBackendUrl();
  const dev = await readJson<Device>(DEVICE_KEY);
  const p = await readJson<Pending>(PENDING_KEY);
  if (!baseUrl || !dev || !p) return;
  if (p.resolved && p.resolveSent) return;

  try {
    if (!p.started) {
      const r = await http(baseUrl, '/sos', { sosId: p.sosId, source: p.source, startedAt: p.startedAt, coords: p.coords }, dev);
      if (r.status === 401 || r.status === 400 || r.status === 403) return fatal(`server refused the SOS (${r.status})`);
      if (r.status >= 300) throw new Error(`status ${r.status}`);
      p.started = true;
      p.sentTs = p.coords?.ts ?? 0;
      await writeJson(PENDING_KEY, p);
      say('SOS delivered');
    } else if (p.coords && p.coords.ts > p.sentTs) {
      const r = await http(baseUrl, `/sos/${p.sosId}/location`, { coords: p.coords }, dev);
      if (r.status >= 400 && r.status < 500) return fatal(`location refused (${r.status})`);
      if (r.status >= 300) throw new Error(`status ${r.status}`);
      p.sentTs = p.coords.ts;
      await writeJson(PENDING_KEY, p);
    }

    if (p.resolved && !p.resolveSent) {
      const r = await http(baseUrl, `/sos/${p.sosId}/resolve`, {}, dev);
      if (r.status >= 400 && r.status < 500) return fatal(`resolve refused (${r.status})`);
      if (r.status >= 300) throw new Error(`status ${r.status}`);
      p.resolveSent = true;
      await writeJson(PENDING_KEY, p);
      say('all-clear delivered');
    }
    retryStep = 0;
    // a newer location may have arrived while we were sending
    const latest = await readJson<Pending>(PENDING_KEY);
    if (latest && latest.sosId === p.sosId && latest.coords && latest.coords.ts > latest.sentTs) scheduleRetry(1000);
  } catch (e) {
    const wait = RETRY_MS[Math.min(retryStep++, RETRY_MS.length - 1)];
    say(`offline or server busy (${e instanceof Error ? e.message : String(e)}), retrying in ${wait / 1000} s`);
    scheduleRetry(wait);
  }
}

function fatal(msg: string): void {
  say(msg + ', giving up on this one');
}

function scheduleRetry(ms: number): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void syncBackend(), ms);
}

/** Call when the app starts: sends anything left over from a time the phone had no connection. */
export function flushBackendQueue(): Promise<void> {
  retryStep = 0;
  return syncBackend();
}

export const backendChannel: Channel = {
  name: 'backend',

  async onActivate(ctx: SosContext) {
    if (!(await getBackendUrl())) return;
    if (!(await readJson<Device>(DEVICE_KEY))) {
      say('this phone is not registered with the server yet, skipping');
      return;
    }
    const p: Pending = {
      sosId: ctx.sosId,
      source: ctx.source,
      startedAt: ctx.startedAt,
      coords: ctx.coords,
      started: false,
      sentTs: 0,
      resolved: false,
      resolveSent: false,
    };
    await writeJson(PENDING_KEY, p);
    await syncBackend(); // never throws: if it fails it queues itself
  },

  async onUpdate(ctx: SosContext) {
    const p = await readJson<Pending>(PENDING_KEY);
    if (!p || p.sosId !== ctx.sosId || !ctx.coords) return;
    p.coords = ctx.coords;
    await writeJson(PENDING_KEY, p);
    void syncBackend();
  },

  async onResolve(ctx: SosContext) {
    const p = await readJson<Pending>(PENDING_KEY);
    if (!p || p.sosId !== ctx.sosId) return;
    p.resolved = true;
    await writeJson(PENDING_KEY, p);
    await syncBackend();
  },
};
