import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

let GoogleSignin: any = null;
let statusCodes: any = {};
let isNativeGoogleSignin = false;

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
  isNativeGoogleSignin = Boolean(GoogleSignin);
} catch {
  isNativeGoogleSignin = false;
}

/**
 * Universal Google Sign-In:
 * 1. Uses native Google Play Services if running in a standalone / dev client APK
 * 2. Uses WebBrowser auth session with HTTPS redirect if running in Expo Go or Web
 */
export async function promptGoogleSignIn(): Promise<{ idToken: string }> {
  // 1. Try native GoogleSignin if supported (custom dev client or standalone APK)
  if (isNativeGoogleSignin && GoogleSignin) {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken || (signInResult as any).idToken;
      if (idToken) {
        return { idToken };
      }
    } catch (err: any) {
      if (err.code === statusCodes?.SIGN_IN_CANCELLED) {
        throw err;
      }
      console.warn('[GoogleAuth] Native sign-in failed, trying web session fallback:', err.message);
    }
  }

  // 2. WebBrowser fallback (Expo Go & Web)
  // Google OAuth strictly forbids custom URI schemes (safesafar://) for Web Client IDs.
  // It requires a valid https:// redirect URI.
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  if (!webClientId) {
    throw new Error('Google Client ID is not configured in .env');
  }

  const redirectUri = 'https://auth.expo.io/@dharmikgohil09/safesafar';
  const nonce = Math.random().toString(36).substring(2, 15);
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(webClientId)}` +
    `&response_type=id_token%20token` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&nonce=${encodeURIComponent(nonce)}` +
    `&prompt=select_account`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type === 'success' && result.url) {
    const rawFragment = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1] || '';
    const params = new URLSearchParams(rawFragment);
    const idToken = params.get('id_token') || params.get('access_token');
    if (idToken) {
      return { idToken };
    }
    throw new Error('Google Sign-In completed but no token was returned.');
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    const cancelErr = new Error('Google sign-in was cancelled.');
    (cancelErr as any).code = 'SIGN_IN_CANCELLED';
    throw cancelErr;
  }

  throw new Error('Google Sign-In was not completed.');
}

export { GoogleSignin, statusCodes, isNativeGoogleSignin };
