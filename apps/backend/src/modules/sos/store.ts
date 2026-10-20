import type { Device, SosRecord, Store } from './types';

/** In-memory store for development and tests. A MongoDB store only has to implement the same interface. */
export class MemoryStore implements Store {
  private devices = new Map<string, Device>();
  private chats = new Map<string, Set<string>>();
  private sos = new Map<string, SosRecord>();

  async getDeviceByUser(userId: string) {
    return this.devices.get(userId) ?? null;
  }
  async saveDevice(d: Device) {
    this.devices.set(d.userId, d);
  }
  async getDeviceByLinkCode(code: string) {
    for (const d of this.devices.values()) if (d.linkCode === code) return d;
    return null;
  }
  async addChat(userId: string, chatId: string) {
    const s = this.chats.get(userId) ?? new Set<string>();
    s.add(chatId);
    this.chats.set(userId, s);
  }
  async getChats(userId: string) {
    return [...(this.chats.get(userId) ?? [])];
  }
  async getSos(sosId: string) {
    return this.sos.get(sosId) ?? null;
  }
  async getSosByToken(token: string) {
    for (const r of this.sos.values()) if (r.trackingToken === token) return r;
    return null;
  }
  async saveSos(r: SosRecord) {
    this.sos.set(r.sosId, r);
  }
}
