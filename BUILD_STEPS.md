# The one build: call chain + fake call + voice trigger (Android)

Apply the zips in this order if you have not already: kristal-day5-callchain, kristal-day6-fakecall,
kristal-day7-backend, then THIS one (kristal-day8-voice). Later zips overwrite earlier files, which is fine.

## 1. Download the speech model (one time, about 40 MB)
Open https://alphacephei.com/vosk/models and download  vosk-model-small-en-us-0.15.zip
Unzip it. Rename the unzipped folder to exactly:  model-en-en
Put it at:  apps\mobile\assets\model-en-en     (inside it you should see: am, conf, graph, ivector)
It must be committed to git (EAS only builds committed files). It is big but under GitHub's limits.

## 2. Install the libraries (PowerShell, in apps\mobile)
    npm install ./modules/safesafar-telephony
    npm install @notifee/react-native react-native-vosk

## 3. app.json
Inside "expo", add to the "plugins" array (keep what is there):
    ["react-native-vosk", { "models": ["assets/model-en-en"] }],
    "./plugins/withLockScreenActivity",
    "./plugins/withVoiceForegroundService"
Inside "android" > "permissions" add (keep what is there):
    "READ_PHONE_STATE", "READ_CALL_LOG", "USE_FULL_SCREEN_INTENT", "SCHEDULE_EXACT_ALARM", "VIBRATE", "WAKE_LOCK"
(the voice plugin adds the microphone and service permissions by itself)

## 4. app\_layout.tsx
At the very top of the file, after the other imports, add (use the same import path emergency-dev.tsx uses):
    import { registerEmergencyBackground } from '<path to features/emergency>';
    registerEmergencyBackground();
If you already added registerFakeCallBackground() earlier, replace it with this (the old name still works).

## 5. Commit and build
    git add -A
    git commit -m "feat(emergency): voice trigger, call chain, fake call native setup"
    git push
    npx eas-cli build --profile development --platform android
Install the new APK over the old one. If it says "app not installed", uninstall once, then install.

## 6. Check the lockfile worked
    npm ci --dry-run
(should finish without errors; if EAS says the lockfile is out of sync, commit package-lock.json)

## 7. Test on the phone (dev screen)
- Grant permissions (Phone, Call logs, Microphone, Notifications).
- Voice: turn on "Voice trigger", lock the screen, say "help me, help me". An SOS should start.
- Fake call: "Fake call in 15 s", lock the phone. Long-press the name = silent SOS.
- Call chain: save 2 contacts, trigger SOS, reject on contact 1, expect contact 2 to ring.
- "I'm safe" asks for the real PIN; 5 wrong tries lock it.
- Server: see the backend README / my earlier message.
