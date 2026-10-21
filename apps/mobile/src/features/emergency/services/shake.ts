export interface ShakeOptions {
  /** Acceleration (in g) that counts as one spike. A phone lying still reads about 1 g. */
  threshold: number;
  /** How many spikes make a shake. */
  spikes: number;
  /** All the spikes must happen within this many ms. */
  windowMs: number;
  /** Spikes closer together than this count once (one jolt spans several samples). */
  minGapMs: number;
  /** After a shake is reported, ignore new ones for this long. */
  cooldownMs: number;
}

export const DEFAULT_SHAKE: ShakeOptions = {
  threshold: 2.4,
  spikes: 3,
  windowMs: 2000,
  minGapMs: 150,
  cooldownMs: 6000,
};

/**
 * Pure shake-gesture logic with no phone APIs, so it can be tested and tuned on its own.
 * Feed it accelerometer samples; it says when a shake gesture is complete.
 */
export class ShakeDetector {
  private spikes: number[] = [];
  private lastSpikeAt = -Infinity;
  private lastFiredAt = -Infinity;
  private readonly o: ShakeOptions;

  constructor(opts: Partial<ShakeOptions> = {}) {
    this.o = { ...DEFAULT_SHAKE, ...opts };
  }

  static magnitude(x: number, y: number, z: number): number {
    return Math.sqrt(x * x + y * y + z * z);
  }

  /** One accelerometer sample in g, with the time it was taken. True when a shake just completed. */
  feed(x: number, y: number, z: number, now: number): boolean {
    const mag = ShakeDetector.magnitude(x, y, z);

    if (mag >= this.o.threshold && now - this.lastSpikeAt >= this.o.minGapMs) {
      this.spikes.push(now);
      this.lastSpikeAt = now;
    }

    this.spikes = this.spikes.filter((t) => now - t <= this.o.windowMs);

    if (this.spikes.length >= this.o.spikes && now - this.lastFiredAt >= this.o.cooldownMs) {
      this.spikes = [];
      this.lastFiredAt = now;
      return true;
    }
    return false;
  }

  reset(): void {
    this.spikes = [];
    this.lastSpikeAt = -Infinity;
  }
}
