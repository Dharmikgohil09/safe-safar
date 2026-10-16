// Public API of the emergency feature. Other people import ONLY from this file.

import { sosEngine } from './engine/sosEngine';
import { smsChannel } from './channels/sms';
import { callChannel } from './channels/call';

/** Call once at app start (Harshil's root layout). Safe to call more than once. */
export function registerDefaultChannels(): void {
  sosEngine.registerChannel(smsChannel);
  sosEngine.registerChannel(callChannel);
}

export { sosEngine } from './engine/sosEngine';
export { sendTestSms } from './channels/sms';
export { requestEmergencyPermissions } from './permissions';
export type { EmergencyPermissions } from './permissions';
export { setContacts, getContacts, setUserName, normalizePhone } from './storage/contacts';
export type {
  Contact,
  Coords,
  Channel,
  SosContext,
  SosSnapshot,
  SosSource,
  SosState,
} from './types';