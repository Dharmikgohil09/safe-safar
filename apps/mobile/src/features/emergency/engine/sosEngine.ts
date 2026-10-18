import { getBestLocation } from '../services/location';
import { getContacts, getUserName } from '../storage/contacts';
import { SILENT_SOURCES } from '../types';
import type { Channel, SosContext, SosSnapshot, SosSource, SosState } from '../types';

const COUNTDOWN_MS = 5000;
const UPDATE_EVERY_MS = 10_000;

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * idle -> countdown (cancellable) -> active -> resolved
 *
 * Silent sources (fake call, duress PIN) and `immediate: true` skip the countdown.
 * The engine only orchestrates; the actual alerting lives in channels.
 */
class SosEngine {
  private state: SosState = 'idle';
  private ctx?: SosContext;
  private countdownEndsAt?: number;
  private timings: Record<string, number | 'failed'> = {};
  private errors: Record<string, string> = {};
  private channels: Channel[] = [];
  private listeners = new Set<() => void>();
  private countdownTimer?: ReturnType<typeof setTimeout>;
  private updateTimer?: ReturnType<typeof setInterval>;
  private ticking = false;
  private snap: SosSnapshot;

  constructor() {
    this.snap = this.buildSnapshot();
  }

  // ---- subscription (works with React's useSyncExternalStore) ----

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): SosSnapshot => this.snap;

  private buildSnapshot(): SosSnapshot {
    return {
      state: this.state,
      source: this.ctx?.source,
      sosId: this.ctx?.sosId,
      countdownEndsAt: this.countdownEndsAt,
      startedAt: this.ctx?.startedAt,
      coords: this.ctx?.coords,
      timings: { ...this.timings },
      errors: { ...this.errors },
    };
  }

  private emit(): void {
    this.snap = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  // ---- channels ----

  registerChannel(channel: Channel): void {
    if (this.channels.some((c) => c.name === channel.name)) return;
    this.channels.push(channel);
  }

  // ---- public actions ----

  /** Ignored while a countdown or an SOS is already running. */
  trigger(source: SosSource, opts: { immediate?: boolean } = {}): void {
    if (this.state === 'countdown' || this.state === 'active') return;

    if (opts.immediate || SILENT_SOURCES.includes(source)) {
      void this.activate(source);
      return;
    }

    this.state = 'countdown';
    this.countdownEndsAt = Date.now() + COUNTDOWN_MS;
    this.ctx = undefined;
    this.timings = {};
    this.errors = {};
    this.countdownTimer = setTimeout(() => void this.activate(source), COUNTDOWN_MS);
    this.emit();
  }

  cancelCountdown(): void {
    if (this.state !== 'countdown') return;
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    this.countdownTimer = undefined;
    this.countdownEndsAt = undefined;
    this.state = 'idle';
    this.emit();
  }

  /**
   * Ends the SOS. With notify (default) channels send their all-clear.
   * PIN checking is done by the caller (Day 4); the engine just obeys.
   */
  async resolve(opts: { notify?: boolean } = {}): Promise<void> {
    const notify = opts.notify ?? true;

    if (this.state === 'countdown') {
      this.cancelCountdown();
      return;
    }
    if (this.state !== 'active' || !this.ctx) return;

    const ctx = this.ctx;
    this.stopUpdates();
    this.state = 'resolved';
    this.emit();

    if (notify) {
      await Promise.allSettled(this.channels.map((c) => c.onResolve?.(ctx)));
    }
  }

  // ---- internals ----

  private async activate(source: SosSource): Promise<void> {
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    this.countdownTimer = undefined;
    this.countdownEndsAt = undefined;

    const startedAt = Date.now();
    const sosId = newId();
    this.state = 'active';
    this.timings = {};
    this.errors = {};
    this.ctx = { sosId, source, startedAt, contacts: [], coords: null };
    this.emit();

    const [contacts, userName, coords] = await Promise.all([
      getContacts(),
      getUserName(),
      getBestLocation(),
    ]);

    // The user may have resolved while we were waiting for the location.
    if (this.state !== 'active' || this.ctx?.sosId !== sosId) return;

    const ctx: SosContext = { sosId, source, startedAt, contacts, coords, userName };
    this.ctx = ctx;
    this.emit();

    await Promise.allSettled(
      this.channels.map(async (ch) => {
        try {
          await ch.onActivate(ctx);
          this.timings[ch.name] = Date.now() - startedAt;
        } catch (e) {
          this.timings[ch.name] = 'failed';
          this.errors[ch.name] = e instanceof Error ? e.message : String(e);
          console.warn(`[sos] channel ${ch.name} failed:`, e);
        }
        this.emit();
      }),
    );

    if (this.state === 'active' && this.ctx?.sosId === sosId) this.startUpdates();
  }

  private startUpdates(): void {
    this.stopUpdates();
    this.updateTimer = setInterval(() => void this.tick(), UPDATE_EVERY_MS);
  }

  private stopUpdates(): void {
    if (this.updateTimer) clearInterval(this.updateTimer);
    this.updateTimer = undefined;
  }

  private async tick(): Promise<void> {
    if (this.ticking || this.state !== 'active' || !this.ctx) return;
    this.ticking = true;
    try {
      const coords = await getBestLocation(3000);
      if (this.state !== 'active' || !this.ctx) return;
      if (coords) this.ctx = { ...this.ctx, coords };
      const ctx = this.ctx;
      await Promise.allSettled(this.channels.map((c) => c.onUpdate?.(ctx)));
      this.emit();
    } finally {
      this.ticking = false;
    }
  }
}

export const sosEngine = new SosEngine();
