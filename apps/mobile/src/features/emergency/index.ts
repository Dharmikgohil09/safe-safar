// Public API of the emergency feature. Other people import ONLY from this file.

export { registerDefaultChannels } from './channels/defaults';

export { sosEngine } from './engine/sosEngine';
export { sendTestSms } from './channels/sms';
export { setCallChainListener } from './channels/call';
export { requestEmergencyPermissions } from './permissions';
export type { EmergencyPermissions } from './permissions';
export { setContacts, getContacts, setUserName, normalizePhone } from './storage/contacts';

// Triggers
export { setShakeTriggerEnabled, isShakeTriggerEnabled, setShakeDebugListener } from './triggers/shakeTrigger';
export { HoldToTriggerButton } from './components/HoldToTriggerButton';

// Duress PIN and decoy
export { setPins, hasPins, clearPins, validatePinFormat } from './security/pins';
export { submitPin, getPinLockoutRemainingMs } from './security/pinFlow';
export type { PinOutcome } from './security/pinFlow';
export { DecoyCalculator } from './screens/DecoyCalculator';
export { PinPad } from './components/PinPad';

export type {
  Contact,
  Coords,
  Channel,
  SosContext,
  SosSnapshot,
  SosSource,
  SosState,
} from './types';
