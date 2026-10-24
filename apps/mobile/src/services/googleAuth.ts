import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

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
    console.log('[GoogleAuth] Native GoogleSignin configured with Web Client ID:', webClientId.substring(0, 15) + '...');
  }
  isNativeGoogleSignin = Boolean(GoogleSignin);
} catch {
  isNativeGoogleSignin = false;
  console.log('[GoogleAuth] Native GoogleSignin module unavailable in current environment (running via Expo Go / fallback).');
}

/**
 * Computes deep link scheme:
 * - If running in Expo Go: exp://<hostUri>/--/auth-callback
 * - If running in standalone APK: safesafar://auth-callback
 */
export function getAppRedirectUrl(): string {
  try {
    const linkingUrl = Linking.createURL('auth-callback');
    if (linkingUrl) {
      return linkingUrl;
    }
  } catch {
    // Fallback if Linking.createURL is unavailable
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return `exp://${hostUri}/--/auth-callback`;
  }
  if (Constants.appOwnership === 'expo' || (Constants as any).executionEnvironment === 'storeClient') {
    return 'exp://10.67.64.75:8081/--/auth-callback';
  }
  return 'safesafar://auth-callback';
}

/**
 * Universal Google Sign-In:
 * 1. Native Google Play Services (Dev Client or Standalone APK)
 *    - Calls hasPlayServices()
 *    - Calls signOut() first to force account selection across all device accounts
 *    - Calls signIn() and reads response.data.idToken
 * 2. Browser Auth Session Fallback (Expo Go & Web)
 *    - Opens WebBrowser with prompt=select_account
 *    - Listens for returnUrl with 60s timeout
 */
export async function promptGoogleSignIn(): Promise<{ idToken: string; nonce?: string }> {
  // ==========================================
  // FLOW 1: Native Google Sign-In (Preferred)
  // ==========================================
  if (isNativeGoogleSignin && GoogleSignin) {
    try {
      console.log('[GoogleAuth] Running Native Google Sign-In flow...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Always signOut() first so Google Play account chooser shows all device accounts
      try {
        await GoogleSignin.signOut();
      } catch {
        // Safe to ignore if no account was signed in
      }

      const signInResult = await GoogleSignin.signIn();
      console.log('[GoogleAuth] Native signIn completed with status:', (signInResult as any)?.type || 'success');

      if ((signInResult as any)?.type === 'cancelled') {
        const cancelErr: any = new Error('Sign-in cancelled by user');
        cancelErr.code = statusCodes?.SIGN_IN_CANCELLED || 'SIGN_IN_CANCELLED';
        throw cancelErr;
      }

      // v13+ provides result.data.idToken, older versions provide result.idToken
      const idToken =
        (signInResult as any)?.data?.idToken ||
        (signInResult as any)?.idToken ||
        (signInResult as any)?.data?.id_token;

      if (idToken) {
        console.log('[GoogleAuth] Native token retrieved successfully (length: %d)', idToken.length);
        return { idToken };
      }

      throw new Error('Native Google sign-in completed but no ID token was returned.');
    } catch (err: any) {
      if (
        err.code === statusCodes?.SIGN_IN_CANCELLED ||
        err.code === 'SIGN_IN_CANCELLED' ||
        err.message?.toLowerCase().includes('cancel')
      ) {
        throw err;
      }
      // If code 10 (DEVELOPER_ERROR) or other critical native errors occur in Dev Client, throw so user knows
      if (err.code === '10' || err.code === 10 || err.message?.includes('DEVELOPER_ERROR')) {
        console.error('[GoogleAuth] Native DEVELOPER_ERROR (code 10). Check SHA-1 in Google Cloud Console:', err.message);
        throw err;
      }
      console.warn('[GoogleAuth] Native sign-in failed or unavailable, trying browser fallback:', err.message);
    }
  }

  // ==========================================
  // FLOW 2: Browser Redirect Fallback (Expo Go / Web)
  // ==========================================
  console.log('[GoogleAuth] Running Browser Redirect flow...');
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  if (!webClientId) {
    throw new Error('Google Client ID is not configured in .env (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)');
  }

  const returnUrl = getAppRedirectUrl();
  const backendUrl = (process.env.EXPO_PUBLIC_API_URL || 'https://safe-safar.onrender.com').replace(/\/+$/, '');
  const redirectUri = `${backendUrl}/api/auth/google/callback`;
  const nonce = Math.random().toString(36).substring(2, 15);

  console.log('[GoogleAuth] Browser flow redirectUri:', redirectUri);
  console.log('[GoogleAuth] Browser flow returnUrl (state):', returnUrl);

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(webClientId)}` +
    `&response_type=id_token%20token` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(returnUrl)}` +
    `&nonce=${encodeURIComponent(nonce)}` +
    `&prompt=select_account`;

  // 60-second timeout promise
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      WebBrowser.dismissAuthSession();
      reject(new Error('Google sign-in timed out after 60 seconds. Please try again.'));
    }, 60000);
  });

  // Secondary deep-link listener in case WebBrowser does not resolve automatically on Android
  let deepLinkSub: any = null;
  let interceptedUrl: string | null = null;

  const urlListenerPromise = new Promise<string>((resolve) => {
    deepLinkSub = Linking.addEventListener('url', (event) => {
      if (event.url && (event.url.includes('id_token') || event.url.includes('error'))) {
        console.log('[GoogleAuth] Deep link intercepted by Linking listener');
        interceptedUrl = event.url;
        WebBrowser.dismissAuthSession();
        resolve(event.url);
      }
    });
  });

  try {
    const authSessionPromise = WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
    const result: any = await Promise.race([authSessionPromise, urlListenerPromise, timeoutPromise]);

    const finalUrl = interceptedUrl || (result && result.url) || '';

    if (finalUrl) {
      const tokenMatch =
        finalUrl.match(/(?:[#?&])id_token=([^&]+)/) ||
        finalUrl.match(/(?:[#?&])access_token=([^&]+)/);

      if (tokenMatch && tokenMatch[1]) {
        const idToken = decodeURIComponent(tokenMatch[1]);
        console.log('[GoogleAuth] Token extracted from redirect URL (length: %d)', idToken.length);
        return { idToken, nonce };
      }

      const errorMatch = finalUrl.match(/(?:[#?&])(?:error|error_description)=([^&]+)/);
      if (errorMatch && errorMatch[1]) {
        throw new Error('Google OAuth error: ' + decodeURIComponent(errorMatch[1]));
      }
    }

    if (result && (result.type === 'cancel' || result.type === 'dismiss')) {
      const cancelErr: any = new Error('Google sign-in was cancelled.');
      cancelErr.code = statusCodes?.SIGN_IN_CANCELLED || 'SIGN_IN_CANCELLED';
      throw cancelErr;
    }

    throw new Error('Google Sign-In completed but no authentication token was returned.');
  } finally {
    clearTimeout(timeoutId);
    if (deepLinkSub && typeof deepLinkSub.remove === 'function') {
      deepLinkSub.remove();
    }
  }
}

export { GoogleSignin, statusCodes, isNativeGoogleSignin };
