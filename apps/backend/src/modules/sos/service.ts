import { randomBytes } from 'node:crypto';
import type { Messenger } from './telegram';
import type { Coords, Device, SosRecord, SosSource, Store } from './types';

const MAX_TRAIL = 500;
const SOURCES: SosSource[] = ['button', 'shake', 'voice', 'fakecall', 'duress'];

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const token = (bytes: number) => randomBytes(bytes).toString('hex');
const mapLink = (c?: Coords) => (c ? `https://maps.google.com/?q=${c.lat},${c.lng}` : 'location not available yet');

export function parseCoords(v: unknown): Coords | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const c = v as Record<string, unknown>;
  const lat = Number(c.lat);
  const lng = Number(c.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  const ts = Number.isFinite(Number(c.ts)) ? Number(c.ts) : Date.now();
  const accuracy = Number.isFinite(Number(c.accuracy)) ? Number(c.accuracy) : undefined;
  return { lat, lng, ts, accuracy };
}

export class SosService {
  constructor(
    private store: Store,
    private messenger: Messenger,
    private publicUrl: string,
    private botName = 'SafeSafarBot',
  ) {}

  // ---- devices ----

  async registerDevice(userName: string): Promise<Device & { botLink: string }> {
    const name = (userName || '').toString().trim().slice(0, 60);
    if (!name) throw new HttpError(400, 'userName is required');
    const d: Device = {
      userId: token(8),
      deviceKey: token(24),
      linkCode: token(3), // 6 hex characters, easy to type
      userName: name,
    };
    await this.store.saveDevice(d);
    return { ...d, botLink: `https://t.me/${this.botName}?start=${d.linkCode}` };
  }

  async authenticate(userId: string | undefined, deviceKey: string | undefined): Promise<Device> {
    const d = userId ? await this.store.getDeviceByUser(userId) : null;
    if (!d || !deviceKey || d.deviceKey !== deviceKey) throw new HttpError(401, 'unknown device');
    return d;
  }

  // ---- Telegram webhook: a contact sends  /start <linkCode>  to the bot ----

  async handleTelegramUpdate(update: unknown): Promise<void> {
    const msg = (update as { message?: { text?: string; chat?: { id?: number | string } } })?.message;
    const text = msg?.text?.trim();
    const chatId = msg?.chat?.id;
    if (!text || chatId === undefined) return;
    const m = /^\/start\s+([0-9a-f]{6})$/i.exec(text);
    if (!m) {
      await this.messenger.send(String(chatId), 'To get SafeSafar alerts, open the link your contact shared with you.');
      return;
    }
    const d = await this.store.getDeviceByLinkCode(m[1].toLowerCase());
    if (!d) {
      await this.messenger.send(String(chatId), 'That link is not valid any more. Ask for a new one.');
      return;
    }
    await this.store.addChat(d.userId, String(chatId));
    await this.messenger.send(String(chatId), `You will now get SafeSafar alerts for ${d.userName}.`);
  }

  // ---- SOS ----

  /** Safe to call again with the same sosId (the phone retries from its offline queue). */
  async start(
    device: Device,
    body: { sosId?: unknown; source?: unknown; coords?: unknown; startedAt?: unknown },
  ): Promise<{ record: SosRecord; trackingUrl: string; created: boolean }> {
    const sosId = typeof body.sosId === 'string' ? body.sosId.slice(0, 64) : '';
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(sosId)) throw new HttpError(400, 'sosId is required (6-64 letters or digits)');
    const source = SOURCES.includes(body.source as SosSource) ? (body.source as SosSource) : 'button';
    const coords = parseCoords(body.coords);

    const existing = await this.store.getSos(sosId);
    if (existing) {
      if (existing.userId !== device.userId) throw new HttpError(403, 'not your SOS');
      if (coords) await this.addCoords(existing, coords);
      return { record: existing, trackingUrl: this.trackingUrl(existing), created: false };
    }

    const startedAt = Number.isFinite(Number(body.startedAt)) ? Number(body.startedAt) : Date.now();
    const record: SosRecord = {
      sosId,
      userId: device.userId,
      userName: device.userName,
      source,
      status: 'active',
      trackingToken: token(16),
      startedAt,
      lastCoords: coords,
      trail: coords ? [coords] : [],
    };
    await this.store.saveSos(record);

    const url = this.trackingUrl(record);
    await this.broadcast(
      device.userId,
      `🚨 ${device.userName} needs help.\nLocation: ${mapLink(coords)}\nLive tracking: ${url}`,
    );
    return { record, trackingUrl: url, created: true };
  }

  private async addCoords(r: SosRecord, c: Coords): Promise<void> {
    // phones can send updates late and out of order: keep the newest as "last"
    if (!r.lastCoords || c.ts >= r.lastCoords.ts) r.lastCoords = c;
    r.trail.push(c);
    r.trail.sort((a, b) => a.ts - b.ts);
    if (r.trail.length > MAX_TRAIL) r.trail = r.trail.slice(-MAX_TRAIL);
    await this.store.saveSos(r);
  }

  async update(device: Device, sosId: string, coordsIn: unknown): Promise<SosRecord> {
    const r = await this.owned(device, sosId);
    const c = parseCoords(coordsIn);
    if (!c) throw new HttpError(400, 'valid coords required');
    if (r.status === 'resolved') return r; // late update after the all-clear: ignore
    await this.addCoords(r, c);
    return r;
  }

  async resolve(device: Device, sosId: string): Promise<SosRecord> {
    const r = await this.owned(device, sosId);
    if (r.status === 'resolved') return r; // already done: do not send the all-clear twice
    r.status = 'resolved';
    r.resolvedAt = Date.now();
    await this.store.saveSos(r);
    await this.broadcast(device.userId, `✅ ${device.userName} is safe. The alert has been ended.`);
    return r;
  }

  async publicView(trackingToken: string) {
    const r = await this.store.getSosByToken(trackingToken);
    if (!r) throw new HttpError(404, 'not found');
    return {
      userName: r.userName,
      status: r.status,
      startedAt: r.startedAt,
      resolvedAt: r.resolvedAt ?? null,
      lastCoords: r.lastCoords ?? null,
      trail: r.trail.slice(-100),
    };
  }

  private trackingUrl(r: SosRecord): string {
    return `${this.publicUrl.replace(/\/$/, '')}/track/${r.trackingToken}`;
  }

  private async owned(device: Device, sosId: string): Promise<SosRecord> {
    const r = await this.store.getSos(sosId);
    if (!r) throw new HttpError(404, 'unknown sosId');
    if (r.userId !== device.userId) throw new HttpError(403, 'not your SOS');
    return r;
  }

  /** One failing chat must not stop the others. */
  private async broadcast(userId: string, text: string): Promise<void> {
    const chats = await this.store.getChats(userId);
    await Promise.allSettled(chats.map((c) => this.messenger.send(c, text)));
  }
}
