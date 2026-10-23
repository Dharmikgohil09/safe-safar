// Lets the main activity appear over the lock screen and wake the screen.
// The fake call needs this: its full-screen notification launches the app while the phone is locked.
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withLockScreenActivity(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application && cfg.modResults.manifest.application[0];
    const activities = (app && app.activity) || [];
    const main = activities.find((a) => a.$ && a.$['android:name'] === '.MainActivity') || activities[0];
    if (!main) throw new Error('withLockScreenActivity: MainActivity not found in AndroidManifest');
    main.$['android:showWhenLocked'] = 'true';
    main.$['android:turnScreenOn'] = 'true';
    return cfg;
  });
};
