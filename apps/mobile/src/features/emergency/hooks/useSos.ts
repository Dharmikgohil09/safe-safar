import { useEffect, useState, useSyncExternalStore } from 'react';
import { sosEngine } from '../engine/sosEngine';
import type { SosSnapshot } from '../types';

/**
 * Live view of the SOS engine for any screen.
 * Re-renders every 250 ms during the countdown so the seconds tick down.
 */
export function useSos(): SosSnapshot & { secondsLeft: number | null } {
  const snap = useSyncExternalStore(sosEngine.subscribe, sosEngine.getSnapshot);
  const [, force] = useState(0);

  useEffect(() => {
    if (snap.state !== 'countdown') return;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [snap.state]);

  const secondsLeft =
    snap.state === 'countdown' && snap.countdownEndsAt
      ? Math.max(0, Math.ceil((snap.countdownEndsAt - Date.now()) / 1000))
      : null;

  return { ...snap, secondsLeft };
}
