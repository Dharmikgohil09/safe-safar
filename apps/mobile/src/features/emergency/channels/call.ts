import { Linking } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as ImmediateCall from 'react-native-immediate-phone-call';
import { runCallChain } from '../services/callChain';
import type { ChainOutcome } from '../services/callChain';
import { findOutgoingCall, getCallState } from '../services/telephony';
import { hasPermission } from '../permissions';
import { SILENT_SOURCES } from '../types';
import type { Channel, Contact } from '../types';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

// Calls the trusted contacts one after another until somebody answers (see services/callChain.ts).
// Needs CALL_PHONE to dial. READ_PHONE_STATE and READ_CALL_LOG let it tell "answered" from "not
// answered"; without them it falls back to calling only the first contact.

type Listener = (line: string) => void;
let listener: Listener | null = null;

/** The dev screen uses this to show what the chain is doing. */
export function setCallChainListener(fn: Listener | null): void {
  listener = fn;
}

let stopRequested = false;
let running = false;

function resolveDialer(): (phone: string) => void {
  try {
    const ns = ImmediateCall as any;
    const fn = ns?.immediatePhoneCall ?? ns?.default?.immediatePhoneCall;
    if (typeof fn === 'function') {
      return fn;
    }
  } catch (_) {}

  // Expo Go safe fallback
  return (phone: string) => {
    console.log(`[SafeSafar Expo Go] Calling via system dialer: ${phone}`);
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };
}

export async function callContact(contact: Contact): Promise<void> {
  if (!isExpoGo && !(await hasPermission('CALL_PHONE'))) throw new Error('CALL_PHONE permission not granted');
  resolveDialer()(contact.phone);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function canDetectAnswer(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const [state, log] = await Promise.all([hasPermission('READ_PHONE_STATE'), hasPermission('READ_CALL_LOG')]);
    if (!state || !log) return false;
    await getCallState(); // throws if the native module is missing (old build)
    return true;
  } catch {
    return false;
  }
}

export const callChannel: Channel = {
  name: 'call',

  async onActivate(ctx) {
    // A real call puts the dialer on screen, which would break the fake-call and
    // duress disguise. Silent sources get SMS only.
    if (SILENT_SOURCES.includes(ctx.source)) return;
    if (ctx.contacts.length === 0) throw new Error('no trusted contacts saved');
    if (running) return;

    if (!(await canDetectAnswer())) {
      listener?.('chain: cannot tell if calls are answered here, calling only the first contact');
      await callContact(ctx.contacts[0]);
      return;
    }

    stopRequested = false;
    running = true;
    const first: { err: Error | null } = { err: null };
    // Resolve as soon as the first call has been tried, so the SOS response time is not held up
    // by waiting for the rest of the chain.
    let release: () => void = () => undefined;
    const firstDone = new Promise<void>((r) => (release = r));

    void runCallChain(
      ctx.contacts,
      {
        dial: async (phone) => {
          try {
            await callContact({ id: '', name: '', phone });
          } catch (e) {
            first.err = first.err ?? (e instanceof Error ? e : new Error(String(e)));
            throw e;
          }
        },
        getCallState,
        findOutgoingCall,
        sleep,
        now: () => Date.now(),
        shouldStop: () => stopRequested,
        log: (l) => listener?.(`chain: ${l}`),
      },
      {},
      release,
    )
      .then((o: ChainOutcome) => listener?.(`chain finished: ${o.stoppedBecause}`))
      .catch((e) => listener?.(`chain error: ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => {
        running = false;
      });

    await firstDone;
    if (first.err) throw first.err; // shows as the call channel failing, same as before
  },

  async onResolve() {
    stopRequested = true; // no more dials once the SOS has ended
  },
};
