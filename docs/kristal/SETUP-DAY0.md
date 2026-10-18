# Kristal - Day 0 setup (tonight)

Goal: a dev-client APK on your phone and on GitHub Releases, plus the accounts the later days need.
Work on a branch: `git checkout -b kristal/native-setup`.

## 1. Accounts (15 min, do these first, they have no code)

**Telegram bot**
1. In Telegram open `@BotFather`, send `/newbot`, pick a name and a username ending in `bot`.
2. Save the token. It goes in the backend `.env` as `TELEGRAM_BOT_TOKEN` on Day 3. Never commit it.

**Picovoice (wake word, used on Day 5)**
1. console.picovoice.ai, sign up, copy the **AccessKey**.
2. Porcupine, Train a wake word: English, Platform **Android**, type your phrase, download the `.ppn`.
3. Pick a phrase that is two or three syllables and not a common word, so it does not fire in normal speech.
4. Keep the `.ppn` for Day 5, it will live in `apps/mobile/assets/`.

**Firebase (push, used on Day 3)**
1. console.firebase.google.com, new project, add an **Android app** with package `com.codecraft.safesafar`.
2. Download `google-services.json` (not needed until push is wired).
3. Project settings, Service accounts, generate a private key for the backend. Never commit it.

## 2. Native dependencies

Dharmik / Harshil create the Expo project first. In `apps/mobile`:

```bash
npx expo install expo-dev-client expo-location expo-sensors expo-secure-store expo-av expo-task-manager
npm i react-native-get-sms-android react-native-immediate-phone-call
```

Install **Notifee and Porcupine later (Day 2 evening, in a second PR)**, not tonight:

```bash
npm i @notifee/react-native @picovoice/porcupine-react-native @picovoice/react-native-voice-processor
```

Reason: if either one has a Gradle problem, it must not block the team's first APK.

## 3. app.json changes

Merge these into the existing `expo` block (do not replace the whole file):

```json
{
  "expo": {
    "android": {
      "package": "com.codecraft.safesafar",
      "permissions": [
        "SEND_SMS",
        "CALL_PHONE",
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "FOREGROUND_SERVICE_MICROPHONE",
        "POST_NOTIFICATIONS",
        "USE_FULL_SCREEN_INTENT",
        "VIBRATE"
      ]
    },
    "plugins": [
      "expo-dev-client",
      "expo-secure-store",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "SafeSafar shares your location with your trusted contacts during a trip or SOS.",
          "isAndroidBackgroundLocationEnabled": true,
          "isAndroidForegroundServiceEnabled": true
        }
      ]
    ]
  }
}
```

If the file already has a `plugins` array (Expo Router adds one), add the entries to it instead of creating a second array.

## 4. Build the dev client

```bash
npx expo prebuild --platform android
npx expo run:android          # phone connected with USB debugging on
```

No Android Studio on your laptop? Alternative: `npx eas-cli build --profile development --platform android` (free tier, queued).

When it runs: copy `android/app/build/outputs/apk/debug/app-debug.apk` to GitHub Releases as `dev-client-v1.apk`, and tell the team to install it. After that they only run `npx expo start --dev-client`.

## 5. Drop in the emergency module

Copy `apps/mobile/src/features/emergency/` from this zip into the repo (same path). Then:

1. Ask Harshil for one placeholder route that exports the dev screen:
   `export { default } from '@/features/emergency/screens/SosDevScreen';` (for example `app/emergency-dev.tsx`).
2. Open it on your phone, tap **Grant permissions**, enter your own second number in the contacts box, tap **Save**.
3. Tap **Trigger SOS (5 s countdown)**. You should get the SMS on the second phone, and a call to the first contact.
4. Put the phone in airplane mode and try again. The SMS should still go out.

Commit message style: `feat(emergency): ...`. One PR per piece.
