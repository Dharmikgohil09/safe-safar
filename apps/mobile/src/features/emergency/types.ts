export type SosSource = 'button' | 'shake' | 'voice' | 'fakecall' | 'duress';
export type SosState = 'idle' | 'countdown' | 'active' | 'resolved';

export interface Contact {
  id: string;
  name: string;
  phone: string; // normalised, e.g. +919876543210
}

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
  ts: number;
}

/** Everything a channel needs to do its job. Rebuilt when the location updates. */
export interface SosContext {
  sosId: string;
  source: SosSource;
  startedAt: number;
  contacts: Contact[];
  coords: Coords | null;
  userName?: string;
  trackingToken?: string;
}

/**
 * A way of getting the alert out (sms, call, telegram, backend...).
 * The engine knows nothing about specific channels, so adding one never
 * means editing the engine.
 */
export interface Channel {
  name: string;
  onActivate(ctx: SosContext): Promise<void>;
  onUpdate?(ctx: SosContext): Promise<void>;
  onResolve?(ctx: SosContext): Promise<void>;
}

export interface SosSnapshot {
  state: SosState;
  source?: SosSource;
  sosId?: string;
  countdownEndsAt?: number;
  startedAt?: number;
  coords?: Coords | null;
  /** ms from trigger until each channel finished, or 'failed'. This is the SOS response-time KPI. */
  timings: Record<string, number | 'failed'>;
  /** Error text for each channel that failed, so it can be shown on screen. */
  errors: Record<string, string>;
}

/** Sources that must not show anything on screen or ring on the phone. */
export const SILENT_SOURCES: SosSource[] = ['fakecall', 'duress'];
