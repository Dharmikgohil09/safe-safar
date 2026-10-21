import type { Contact } from '../types';
import type { CallState, OutgoingCall } from './telephony';

// The call chain: ring contact 1; if nobody answers, ring contact 2, and so on until someone does.
//
// Android does not let an app see "ringing" vs "answered" during an outgoing call. So we use what
// it does expose:
//  - call state: offhook while dialing or talking, idle once the call is over
//  - the call log: written when the call ends, with a duration (0 seconds = never answered)
// Rules:
//  1. A call that is still going after `ringWindowMs` is treated as answered (carriers stop ringing
//     around 25-30 s, so a longer call means a person or a voicemail picked up). The chain stops.
//  2. A call that ends sooner is answered only if the call log shows a duration above 0.
//  3. We never dial while another call is in progress. We wait, and stop if it does not end.

export type ChainResult = 'answered' | 'unanswered' | 'failed';

export interface ChainDeps {
  dial(phone: string): Promise<void>;
  getCallState(): Promise<CallState>;
  findOutgoingCall(number: string, sinceMs: number): Promise<OutgoingCall>;
  sleep(ms: number): Promise<void>;
  now(): number;
  /** True once the SOS has ended: the chain must stop calling. */
  shouldStop(): boolean;
  log(line: string): void;
}

export interface ChainOptions {
  maxContacts: number;
  ringWindowMs: number; // longer than this and the call counts as answered
  startWaitMs: number; // how long to wait for the call to show up as started
  pollMs: number;
  betweenCallsMs: number;
  busyWaitMs: number; // how long to wait for a call already in progress to end
  logLookups: number; // tries to find the call log entry (it can lag a moment)
}

export const DEFAULT_CHAIN: ChainOptions = {
  maxContacts: 5,
  ringWindowMs: 28_000,
  startWaitMs: 8_000,
  pollMs: 1_000,
  betweenCallsMs: 2_000,
  busyWaitMs: 60_000,
  logLookups: 3,
};

export interface ChainOutcome {
  results: { contact: Contact; result: ChainResult }[];
  stoppedBecause: 'answered' | 'sos-ended' | 'exhausted' | 'busy';
}

async function waitForIdle(deps: ChainDeps, opts: ChainOptions): Promise<boolean> {
  const until = deps.now() + opts.busyWaitMs;
  while (deps.now() < until) {
    if (deps.shouldStop()) return false;
    if ((await deps.getCallState().catch(() => 'idle' as CallState)) === 'idle') return true;
    await deps.sleep(opts.pollMs);
  }
  return false;
}

/** Dials one contact and works out what happened. */
async function callOne(c: Contact, deps: ChainDeps, o: ChainOptions, dialed: () => void): Promise<ChainResult> {
  const t0 = deps.now();
  try {
    await deps.dial(c.phone);
  } catch (e) {
    deps.log(`could not dial ${c.name}: ${e instanceof Error ? e.message : String(e)}`);
    dialed();
    return 'failed';
  }
  dialed(); // the call has been placed: callers waiting on the first dial can carry on

  // 1. wait for the call to show up as started
  let started = false;
  while (deps.now() - t0 < o.startWaitMs) {
    if (deps.shouldStop()) return 'unanswered';
    if ((await deps.getCallState().catch(() => 'idle' as CallState)) !== 'idle') {
      started = true;
      break;
    }
    await deps.sleep(o.pollMs);
  }
  if (!started) {
    deps.log(`call to ${c.name} never started`);
    return 'failed';
  }

  // 2. wait for it to end, or for the ring window to pass
  while (deps.now() - t0 < o.ringWindowMs) {
    if (deps.shouldStop()) return 'unanswered';
    if ((await deps.getCallState().catch(() => 'offhook' as CallState)) === 'idle') {
      return endedResult(c, t0, deps, o);
    }
    await deps.sleep(o.pollMs);
  }
  deps.log(`${c.name}: still connected after ${Math.round(o.ringWindowMs / 1000)} s, counting as answered`);
  return 'answered';
}

async function endedResult(c: Contact, t0: number, deps: ChainDeps, o: ChainOptions): Promise<ChainResult> {
  for (let i = 0; i < o.logLookups; i++) {
    try {
      const r = await deps.findOutgoingCall(c.phone, t0 - 2_000);
      if (r.found) {
        deps.log(`${c.name}: call lasted ${r.durationSec} s`);
        return r.durationSec > 0 ? 'answered' : 'unanswered';
      }
    } catch (e) {
      // call log not readable: we cannot tell, so carry on to the next contact (safer than stopping)
      deps.log(`call log unreadable (${e instanceof Error ? e.message : String(e)}), assuming unanswered`);
      return 'unanswered';
    }
    await deps.sleep(500);
  }
  deps.log(`${c.name}: call ended and no log entry found, assuming unanswered`);
  return 'unanswered';
}

export async function runCallChain(
  contacts: Contact[],
  deps: ChainDeps,
  options: Partial<ChainOptions> = {},
  onFirstDial?: () => void,
): Promise<ChainOutcome> {
  const o = { ...DEFAULT_CHAIN, ...options };
  const results: ChainOutcome['results'] = [];
  const done = (stoppedBecause: ChainOutcome['stoppedBecause']): ChainOutcome => ({ results, stoppedBecause });
  let first = true;
  const fireFirst = () => {
    if (first) {
      first = false;
      onFirstDial?.();
    }
  };

  try {
    for (const c of contacts.slice(0, o.maxContacts)) {
      if (deps.shouldStop()) return done('sos-ended');
      if (!(await waitForIdle(deps, o))) return done(deps.shouldStop() ? 'sos-ended' : 'busy');
      deps.log(`calling ${c.name}`);
      const result = await callOne(c, deps, o, fireFirst);
      results.push({ contact: c, result });
      deps.log(`${c.name}: ${result}`);
      if (result === 'answered') return done('answered');
      if (deps.shouldStop()) return done('sos-ended');
      await deps.sleep(o.betweenCallsMs);
    }
    return done('exhausted');
  } finally {
    fireFirst(); // never leave the caller waiting
  }
}
