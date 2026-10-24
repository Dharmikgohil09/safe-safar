import { Linking, Platform, Alert } from 'react-native';
import {
  buildGoogleMapsDirectionsUrl,
  GoogleMapsDirectionsParams,
} from '../utils/googleMapsUrl';

export interface OpenRouteResult {
  success: boolean;
  url: string;
  error?: string;
}

/**
 * Opens the selected SafeSafar route in Google Maps.
 *
 * Platform behaviors:
 * - Web/Laptop: Opens Google Maps in a new browser tab with rel="noopener noreferrer".
 * - Mobile (Android/iOS): Uses React Native Linking to launch the native Google Maps app
 *   or falls back to the default web browser.
 * - Handles missing endpoints and URL opening errors gracefully with user-friendly alerts.
 */
export async function openRouteInGoogleMaps(
  params: GoogleMapsDirectionsParams,
  customOpener?: (url: string) => Promise<boolean>
): Promise<OpenRouteResult> {
  const url = buildGoogleMapsDirectionsUrl(params);

  if (!url) {
    const errorMsg = 'Could not open Google Maps: missing origin or destination coordinates.';
    if (Platform.OS !== 'web') {
      Alert.alert('Route Unavailable', errorMsg, [{ text: 'OK' }]);
    }
    return { success: false, url: '', error: errorMsg };
  }

  try {
    if (customOpener) {
      const ok = await customOpener(url);
      return { success: ok, url };
    }

    // Web / Laptop Browser: Open in a secure new tab
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return { success: true, url };
    }

    // Mobile Device (Android / iOS): Opens native Google Maps app or browser fallback
    await Linking.openURL(url);
    return { success: true, url };
  } catch (error: any) {
    const errorMsg = error?.message || 'Failed to open Google Maps.';
    console.warn('[GoogleMapsService] Open URL error:', errorMsg);

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Unable to Open Maps',
        'Could not launch Google Maps. Please verify that Google Maps or a web browser is available.',
        [{ text: 'OK' }]
      );
    }

    return { success: false, url, error: errorMsg };
  }
}
