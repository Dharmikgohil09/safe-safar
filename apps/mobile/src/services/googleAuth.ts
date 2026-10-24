let GoogleSignin: any = null;
let statusCodes: any = {};
let isGoogleSigninSupported = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const gModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = gModule.GoogleSignin;
  statusCodes = gModule.statusCodes || {};

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  if (webClientId && GoogleSignin && typeof GoogleSignin.configure === 'function') {
    GoogleSignin.configure({
      webClientId,
      offlineAccess: false,
    });
  }
  isGoogleSigninSupported = Boolean(GoogleSignin);
} catch {
  // Gracefully handle Expo Go where native module 'RNGoogleSignin' is not compiled in
  isGoogleSigninSupported = false;
  GoogleSignin = {
    hasPlayServices: async () => false,
    signIn: async () => {
      throw new Error(
        'Google Sign-In is only supported in custom standalone/development builds (npx expo run:android). In Expo Go, please sign in with your email/phone and 4-digit PIN.'
      );
    },
    signOut: async () => {},
    configure: () => {},
  };
}

export { GoogleSignin, statusCodes, isGoogleSigninSupported };
