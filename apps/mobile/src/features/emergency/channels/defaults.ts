import { sosEngine } from '../engine/sosEngine';
import { callChannel } from './call';
import { smsChannel } from './sms';

/**
 * Registers the channels every SOS uses. Safe to call any number of times.
 * Triggers (shake, PIN screen, ...) call this themselves, so an SOS can never start
 * with nothing registered to send it.
 */
export function registerDefaultChannels(): void {
  sosEngine.registerChannel(smsChannel);
  sosEngine.registerChannel(callChannel);
}
