import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { normalizePhone } from '../../../emergency';
import type { AuthCredentials, AuthResponse, AuthUser, RegisterCredentials } from '../types';

const TOKEN_KEY = 'safesafar.auth_token.v1';
const USER_KEY = 'safesafar.auth_user.v1';

let webSessionToken: string | null = null;
let webSessionUser: AuthUser | null = null;

class AuthService {
  private apiUrl: string = (process.env.EXPO_PUBLIC_API_URL || 'https://safe-safar.onrender.com').replace(/\/+$/, '');

  public isUsingMock(): boolean {
    return false;
  }

  /**
   * Log in user using phone/identifier and numeric PIN
   */
  public async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const rawPhone = credentials.phone || credentials.identifier || '';
    const cleanPhone = normalizePhone(rawPhone) || rawPhone;
    if (!cleanPhone) {
      return { success: false, error: 'Please enter a valid phone number or email.' };
    }

    if (!credentials.pin || credentials.pin.length < 4) {
      return { success: false, error: 'PIN must be at least 4 digits.' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanPhone, password: credentials.pin }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Invalid credentials.',
          isUnverified: data.code === 'EMAIL_NOT_VERIFIED',
          email: data.email,
        };
      }

      await this.persistSession(data.accessToken || data.token, data.user);
      return { success: true, accessToken: data.accessToken || data.token, user: data.user, isMock: false };
    } catch {
      return {
        success: false,
        error: 'Unable to connect to authentication server. Please check your connection.',
      };
    }
  }

  /**
   * Register a new user with name, email, phone, and PIN
   */
  public async register(data: RegisterCredentials): Promise<AuthResponse> {
    const cleanName = data.name.trim();
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Full name must be at least 2 characters.' };
    }

    const cleanPhone = normalizePhone(data.phone);
    if (!cleanPhone) {
      return { success: false, error: 'Please enter a valid 10-digit Indian phone number.' };
    }

    if (!data.email || !data.email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!data.pin || data.pin.length < 4) {
      return { success: false, error: 'PIN must be at least 4 digits.' };
    }

    if (data.pin !== data.confirmPin) {
      return { success: false, error: 'PIN confirmation does not match.' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: data.email.trim().toLowerCase(),
          phone: cleanPhone,
          password: data.pin,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        return { success: false, error: resData.error || resData.message || 'Registration failed.' };
      }

      return { success: true, email: resData.email, isMock: false };
    } catch {
      return {
        success: false,
        error: 'Unable to connect to authentication server. Please check your connection.',
      };
    }
  }

  /**
   * Persist session securely on native or in session cache on web
   */
  private async persistSession(token: string, user: AuthUser): Promise<void> {
    if (Platform.OS === 'web') {
      webSessionToken = token;
      webSessionUser = user;
      return;
    }

    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch {
      // In dev-client fallback
    }
  }

  /**
   * Retrieve active session user
   */
  public async getSession(): Promise<{ token: string | null; user: AuthUser | null }> {
    if (Platform.OS === 'web') {
      return { token: webSessionToken, user: webSessionUser };
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userRaw = await SecureStore.getItemAsync(USER_KEY);
      const user = userRaw ? JSON.parse(userRaw) : null;
      return { token, user };
    } catch {
      return { token: null, user: null };
    }
  }

  /**
   * Log out active session
   */
  public async logout(): Promise<void> {
    if (Platform.OS === 'web') {
      webSessionToken = null;
      webSessionUser = null;
      return;
    }

    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // Clean delete
    }
  }
}

export const authService = new AuthService();
