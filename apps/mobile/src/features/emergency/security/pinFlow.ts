import { registerDefaultChannels } from '../channels/defaults';
import { sosEngine } from '../engine/sosEngine';
import { lockoutRemainingMs, recordFailure, recordSuccess } from './lockout';
import { hasPins, verifyPin } from './pins';

export type PinOutcome = 'real' | 'duress' | 'wrong' | 'not-set' | 'locked';

/** Seconds-level info for screens that want to say how long the lock lasts. */
export { lockoutRemainingMs as getPinLockoutRemainingMs } from './lockout';

/**
 * What happens when a PIN is entered (on the end-SOS pad, or on the decoy calculator):
 *
 *  real PIN   -> the SOS ends normally and the contacts get the all-clear.
 *  duress PIN -> the screen can show "all safe", but the SOS keeps running silently:
 *                - SOS already active: left alone, no all-clear is sent
 *                - countdown running:  cancelled and replaced by a silent SOS (SMS only, no call
 *                                      that would put a dialer on screen)
 *                - nothing running:    a silent SOS starts
 *  wrong PIN  -> nothing happens, and the try is counted towards the lockout.
 *  locked     -> too many wrong tries: no PIN is checked at all until the lock runs out.
 *
 * The caller decides what the screen shows. For a duress PIN it must look like the real one.
 */
export async function submitPin(pin: string): Promise<PinOutcome> {
  if (!(await hasPins())) return 'not-set';
  if ((await lockoutRemainingMs()) > 0) return 'locked';

  const check = await verifyPin(pin);

  if (check === 'wrong') {
    await recordFailure();
    return 'wrong';
  }

  await recordSuccess();

  if (check === 'real') {
    void sosEngine.resolve(); // do not wait: the all-clear SMS can take a while to send
    return 'real';
  }

  registerDefaultChannels();
  const state = sosEngine.getSnapshot().state;
  if (state === 'countdown') sosEngine.cancelCountdown();
  if (state !== 'active') sosEngine.trigger('duress');
  return 'duress';
}
