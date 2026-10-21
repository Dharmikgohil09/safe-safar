import * as ImmediateCall from 'react-native-immediate-phone-call';
import { hasPermission } from '../permissions';
import { SILENT_SOURCES } from '../types';
import type { Channel, Contact } from '../types';

// Dials straight away (CALL_PHONE permission, no dialer tap).
//
// Only the FIRST contact is called for now. Calling the next contact after a
// fixed delay is unsafe: if contact 1 picked up, the second dial would hang up
// that call. A chain needs a call-state listener to know the first call ended
// unanswered. That is a Day 2 task, see callContact() below.

const CONTACTS_TO_CALL = 1;

function resolveDialer(): (phone: string) => void {
  // Depending on how the package exports itself, the function is either a named
  // export or on the default export. Handle both.
  const ns = ImmediateCall as any;
  const fn = ns.immediatePhoneCall ?? ns.default?.immediatePhoneCall;
  if (typeof fn !== 'function') {
    throw new Error('react-native-immediate-phone-call: immediatePhoneCall not found');
  }
  return fn;
}

export async function callContact(contact: Contact): Promise<void> {
  if (!(await hasPermission('CALL_PHONE'))) throw new Error('CALL_PHONE permission not granted');
  resolveDialer()(contact.phone);
}

export const callChannel: Channel = {
  name: 'call',

  async onActivate(ctx) {
    // A real call puts the dialer on screen, which would break the fake-call and
    // duress disguise. Silent sources get SMS only; the call can be sequenced
    // after the disguise screen is dismissed (Day 6).
    if (SILENT_SOURCES.includes(ctx.source)) return;
    if (ctx.contacts.length === 0) throw new Error('no trusted contacts saved');
    for (const c of ctx.contacts.slice(0, CONTACTS_TO_CALL)) {
      await callContact(c);
    }
  },
};
