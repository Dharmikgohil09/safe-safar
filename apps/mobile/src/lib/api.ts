import * as SecureStore from 'expo-secure-store';

// Must match TOKEN_KEY in apps/mobile/src/features/trip/auth/services/authService.ts
const TOKEN_KEY = 'safesafar.auth_token.v1';

/**
 * Shared API fetch client that automatically attaches the stored JWT token
 * to outbound requests when available.
 *
 * @param path - API endpoint path (e.g. '/trips' or 'trips')
 * @param init - Optional RequestInit configuration to pass to fetch
 */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || null;

  if (!apiUrl) {
    if (typeof Response !== 'undefined') {
      return new Response(
        JSON.stringify({
          message: 'API base URL is not configured (EXPO_PUBLIC_API_URL missing).',
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    throw new Error('API base URL is not configured (EXPO_PUBLIC_API_URL missing).');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  const fullUrl = `${normalizedBase}${normalizedPath}`;

  let token: string | null = null;
  try {
    const { getAccessToken } = require('../services/api');
    token = await getAccessToken();
    if (!token) {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    }
  } catch {
    token = null;
  }

  const mergedHeaders = new Headers(init?.headers);

  if (token) {
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  }

  return fetch(fullUrl, {
    ...init,
    headers: mergedHeaders,
  });
}
