import { registerFakeCallBackground as registerFakeCall } from './fakeCall';
import { registerVoiceForegroundService } from './voiceTrigger';

/**
 * Call once, at the top level of the app's root file (app/_layout.tsx), before anything renders.
 * Registers what Notifee needs while the app is in the background: the fake call events and the
 * voice trigger's foreground service.
 */
export function registerEmergencyBackground(): void {
  registerFakeCall();
  registerVoiceForegroundService();
}
