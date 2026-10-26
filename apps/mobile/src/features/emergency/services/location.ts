import * as Location from 'expo-location';
import type { Coords } from '../types';

function toCoords(pos: Location.LocationObject): Coords {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
    ts: pos.timestamp,
  };
}

const RECENT_FIX_MS = 60_000;

/**
 * Fastest usable location, in this order:
 *  1. a fix that is less than a minute old (instant, so the SMS is not delayed)
 *  2. a fresh high-accuracy fix, waiting at most timeoutMs
 *  3. any last known fix, however old
 * Returns null only when the phone has never had a fix.
 * GPS works without internet, so this also works in airplane mode.
 */
export async function getBestLocation(timeoutMs = 5000): Promise<Coords | null> {
  try {
    const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_FIX_MS });
    if (recent) return toCoords(recent);
  } catch {
    // fall through to a fresh fix
  }

  try {
    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (fresh) return toCoords(fresh);
  } catch {
    // fall through to any last known fix
  }

  try {
    const last = await Location.getLastKnownPositionAsync();
    return last ? toCoords(last) : null;
  } catch {
    return null;
  }
}
