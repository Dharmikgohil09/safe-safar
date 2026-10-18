import { PermissionsAndroid } from 'react-native';
import * as Location from 'expo-location';

export interface EmergencyPermissions {
  location: boolean;
  background: boolean;
  sms: boolean;
  call: boolean;
  mic: boolean;
}

/**
 * Harshil's onboarding screen calls this. Android 11+ only allows background
 * location to be requested AFTER foreground location is granted, as a separate step.
 */
export async function requestEmergencyPermissions(): Promise<EmergencyPermissions> {
  const fg = await Location.requestForegroundPermissionsAsync();
  const bg = fg.granted
    ? await Location.requestBackgroundPermissionsAsync()
    : { granted: false };

  const res = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.SEND_SMS,
    PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  ]);

  const ok = (p: keyof typeof PermissionsAndroid.PERMISSIONS) =>
    res[PermissionsAndroid.PERMISSIONS[p]] === PermissionsAndroid.RESULTS.GRANTED;

  return {
    location: fg.granted,
    background: bg.granted,
    sms: ok('SEND_SMS'),
    call: ok('CALL_PHONE'),
    mic: ok('RECORD_AUDIO'),
  };
}

/** Read-only check, safe to use during an SOS (never shows a dialog). */
export async function hasPermission(
  name: 'SEND_SMS' | 'CALL_PHONE' | 'RECORD_AUDIO' | 'READ_PHONE_STATE' | 'READ_CALL_LOG',
): Promise<boolean> {
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS[name]);
}
