# SafeSafar Mobile Application (React Native / Expo)

This is the SafeSafar mobile app workspace built using [Expo](https://expo.dev) and React Native.

## Get Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

## Directory Structure

```text
apps/mobile/
  app/                    # Expo Router file-based navigation & tab screens
  assets/                 # Images, icons, and splash screens
  components/             # UI components and themes
  src/
    components/ui/        # Reusable UI components (Buttons, Cards, Drawer, StateView)
    features/
      emergency/          # SOS engine and emergency triggers
      trip/               # Trip screens (Contacts, Walk Me Home, Report, Live Location)
    lib/                  # Shared API client and utility helpers
    theme/                # Colors, spacing, and typography tokens
```

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router documentation](https://docs.expo.dev/router/introduction/)
