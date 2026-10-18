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

function native(): Native {
  const m = (NativeModules as { SafeSafarTelephony?: Native }).SafeSafarTelephony;
  if (!m) throw new Error('SafeSafarTelephony native module missing: this needs a fresh EAS build');
  return m;
}

/** idle = no call. offhook = dialing or talking. ringing = an incoming call is ringing. */
export const getCallState = (): Promise<CallState> => native().getCallState();

/** Newest outgoing call to this number since `sinceMs`, and how long it lasted (0 = never answered). */
export const findOutgoingCall = (number: string, sinceMs: number): Promise<OutgoingCall> =>
  native().findOutgoingCall(number, sinceMs);
