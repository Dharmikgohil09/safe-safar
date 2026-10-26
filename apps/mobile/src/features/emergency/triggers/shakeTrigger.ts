import { Accelerometer } from 'expo-sensors';
import { Vibration } from 'react-native';
import { registerDefaultChannels } from '../channels/defaults';
import { sosEngine } from '../engine/sosEngine';
import { ShakeDetector } from '../services/shake';

// 20 samples per second: plenty for a shake, and under Android 12's 200 Hz limit above
// which an extra permission would be needed.
const SAMPLE_MS = 50;

// Works while the app is open. With the screen off or the app in the background Android stops
// delivering sensor data, so that needs the foreground service planned for the voice trigger.

let subscription: { remove(): void } | null = null;
let debugListener: ((magnitude: number) => void) | null = null;

export function isShakeTriggerEnabled(): boolean {
  return subscription !== null;
}

/** Optional: receives every sample's strength in g, to tune the threshold on a real phone. */
export function setShakeDebugListener(fn: ((magnitude: number) => void) | null): void {
  debugListener = fn;
}

/**
 * A shake starts the normal SOS with its 5-second cancellable countdown, so an accidental
 * shake in a bag costs nothing.
 */
export function setShakeTriggerEnabled(enabled: boolean): void {
  if (enabled === isShakeTriggerEnabled()) return;

  if (!enabled) {
    subscription?.remove();
    subscription = null;
    return;
  }

  registerDefaultChannels();
  const detector = new ShakeDetector();
  Accelerometer.setUpdateInterval(SAMPLE_MS);
  subscription = Accelerometer.addListener(({ x, y, z }) => {
    debugListener?.(ShakeDetector.magnitude(x, y, z));
    if (detector.feed(x, y, z, Date.now())) {
      Vibration.vibrate(150);
      sosEngine.trigger('shake');
    }
  });
}
