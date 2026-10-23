// The voice trigger keeps the microphone running through a Notifee foreground service.
// Android 14+ needs that service declared with type "microphone", plus these permissions.
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.POST_NOTIFICATIONS',
];

module.exports = function withVoiceForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const perms = (manifest['uses-permission'] = manifest['uses-permission'] || []);
    for (const name of PERMISSIONS) {
      if (!perms.some((p) => p.$ && p.$['android:name'] === name)) perms.push({ $: { 'android:name': name } });
    }

    const app = manifest.application && manifest.application[0];
    if (!app) throw new Error('withVoiceForegroundService: <application> not found');
    const services = (app.service = app.service || []);
    const NAME = 'app.notifee.core.ForegroundService';
    let svc = services.find((s) => s.$ && s.$['android:name'] === NAME);
    if (!svc) {
      svc = { $: { 'android:name': NAME } };
      services.push(svc);
    }
    svc.$['android:exported'] = 'false';
    svc.$['android:foregroundServiceType'] = 'microphone';
    svc.$['tools:replace'] = 'android:foregroundServiceType';
    return cfg;
  });
};
