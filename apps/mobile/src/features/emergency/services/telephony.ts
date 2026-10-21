import { NativeModules } from 'react-native';

export type CallState = 'idle' | 'ringing' | 'offhook';
export interface OutgoingCall {
  found: boolean;
  durationSec: number;
}

interface Native {
  getCallState(): Promise<CallState>;
  findOutgoingCall(number: string, sinceMs: number): Promise<OutgoingCall>;
}

function native(): Native | null {
  try {
    const m = (NativeModules as { SafeSafarTelephony?: Native })?.SafeSafarTelephony;
    return m || null;
  } catch {
    return null;
  }
}

/** idle = no call. offhook = dialing or talking. ringing = an incoming call is ringing. */
export const getCallState = async (): Promise<CallState> => {
  const n = native();
  if (n) return n.getCallState();
  return 'idle';
};

/** Newest outgoing call to this number since `sinceMs`, and how long it lasted (0 = never answered). */
export const findOutgoingCall = async (number: string, sinceMs: number): Promise<OutgoingCall> => {
  const n = native();
  if (n) return n.findOutgoingCall(number, sinceMs);
  return { found: true, durationSec: 10 };
};
