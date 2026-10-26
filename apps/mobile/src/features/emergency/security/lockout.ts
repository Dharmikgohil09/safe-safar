import * as SecureStore from 'expo-secure-store';

// Slows down PIN guessing. 5 wrong tries lock the PIN for 30 seconds. After that, every further
// wrong try locks it again for longer: 1, 2, 5, then 10 minutes (and stays at 10).
// A correct PIN (real or duress) clears everything. The state lives in secure storage, so closing
// or restarting the app does not reset it.

const KEY = 'safesafar.pin.lock.v1';

export const FREE_TRIES = 5;
export const LOCK_STEPS_MS = [30_000, 60_000, 120_000, 300_000, 600_000];
const MAX_LOCK_MS = LOCK_STEPS_MS[LOCK_STEPS_MS.length - 1];

interface LockState {
  fails: number;
  level: number;
  lockedUntil: number;
}

const CLEAN: LockState = { fails: 0, level: 0, lockedUntil: 0 };

async function load(): Promise<LockState> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return { ...CLEAN };
    const v = JSON.parse(raw) as LockState;
    if (![v.fails, v.level, v.lockedUntil].every((n) => typeof n === 'number' && Number.isFinite(n))) {
      return { ...CLEAN };
    }
    return v;
  } catch {
    return { ...CLEAN };
  }
}

async function save(s: LockState): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(s));
  } catch {
    // if storage fails, carry on rather than break the PIN screen
  }
}

/** How long until PINs are accepted again. 0 means they are accepted now. */
export async function lockoutRemainingMs(now: number = Date.now()): Promise<number> {
  const s = await load();
  // the cap also covers a phone clock that was moved back to stretch the lock
  return Math.min(Math.max(0, s.lockedUntil - now), MAX_LOCK_MS);
}

/** Call after a wrong PIN. Returns the length of the lockout this try started, or 0 if none. */
export async function recordFailure(now: number = Date.now()): Promise<number> {
  const s = await load();
  s.fails += 1;
  let started = 0;
  if (s.fails >= FREE_TRIES) {
    started = LOCK_STEPS_MS[Math.min(s.level, LOCK_STEPS_MS.length - 1)];
    s.lockedUntil = now + started;
    s.level += 1;
    s.fails = FREE_TRIES - 1; // after a lockout, the very next wrong try locks again
  }
  await save(s);
  return started;
}

/** Call after a correct PIN. */
export async function recordSuccess(): Promise<void> {
  await save({ ...CLEAN });
}
