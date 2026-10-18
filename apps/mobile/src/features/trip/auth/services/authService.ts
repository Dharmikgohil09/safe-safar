import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { normalizePhone } from '../../../emergency';
import type { AuthCredentials, AuthResponse, AuthUser, RegisterCredentials } from '../types';

const TOKEN_KEY = 'safesafar.auth_token.v1';
const USER_KEY = 'safesafar.auth_user.v1';

// In-memory mock user store for developer preview when backend is not yet deployed
const MOCK_REGISTERED_USERS: Map<string, { user: AuthUser; pin: string }> = new Map([
  [
    '+919876543210',
    {
      user: { id: 'user-demo-1', name: 'Aarav Mehta', phone: '+919876543210' },
      pin: '1234',
    },
  ],
  [
    '+919988776655',
    {
      user: { id: 'user-demo-2', name: 'Priya Sharma', phone: '+919988776655' },
      pin: '5678',
    },
  ],
]);

// Web session cache (never storing raw PINs)
let webSessionToken: string | null = null;
let webSessionUser: AuthUser | null = null;

class AuthService {
  private apiUrl: string | null = process.env.EXPO_PUBLIC_API_URL || null;

  /**
   * Check if real backend is configured and reachable
   */
  public isUsingMock(): boolean {
    return !this.apiUrl;
  }

  /**
   * Log in user using phone and numeric PIN
   */
  public async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const cleanPhone = normalizePhone(credentials.phone);
    if (!cleanPhone) {
      return { success: false, error: 'Please enter a valid phone number.' };
    }

    if (!credentials.pin || credentials.pin.length < 4) {
      return { success: false, error: 'PIN must be at least 4 digits.' };
    }

    // If real backend API URL is configured, call POST /auth/login
    if (this.apiUrl) {
      try {
        const response = await fetch(`${this.apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, pin: credentials.pin }),
        });

        const data = await response.json();
        if (!response.ok) {
          return { success: false, error: data.message || 'Invalid credentials.' };
        }

        await this.persistSession(data.token, data.user);
        return { success: true, token: data.token, user: data.user, isMock: false };
      } catch {
        return {
          success: false,
          error: 'Unable to connect to authentication server. Please check your connection.',
        };
      }
    }

    // Mock Adapter (Development Preview)
    // Simulate brief network latency for realistic UI feedback
    await new Promise((resolve) => setTimeout(resolve, 600));

    const mockAccount = MOCK_REGISTERED_USERS.get(cleanPhone);
    if (!mockAccount || mockAccount.pin !== credentials.pin) {
      return {
        success: false,
        error: 'Incorrect phone number or PIN. (Demo: Try 9876543210 with PIN: 1234)',
        isMock: true,
      };
    }

    const syntheticToken = `mock-jwt-${Date.now()}-${mockAccount.user.id}`;
    await this.persistSession(syntheticToken, mockAccount.user);

    return {
      success: true,
      token: syntheticToken,
      user: mockAccount.user,
      isMock: true,
    };
  }

  /**
   * Register a new user with name, phone, and PIN
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

    if (!data.pin || data.pin.length < 4) {
      return { success: false, error: 'PIN must be at least 4 digits.' };
    }

    if (data.pin !== data.confirmPin) {
      return { success: false, error: 'PIN confirmation does not match.' };
    }

    // If real backend API URL is configured, call POST /auth/register
    if (this.apiUrl) {
      try {
        const response = await fetch(`${this.apiUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanName, phone: cleanPhone, pin: data.pin }),
        });

        const resData = await response.json();
        if (!response.ok) {
          return { success: false, error: resData.message || 'Registration failed.' };
        }

        await this.persistSession(resData.token, resData.user);
        return { success: true, token: resData.token, user: resData.user, isMock: false };
      } catch {
        return {
          success: false,
          error: 'Unable to connect to authentication server. Please check your connection.',
        };
      }
    }

    // Mock Adapter (Development Preview)
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (MOCK_REGISTERED_USERS.has(cleanPhone)) {
      return {
        success: false,
        error: 'An account with this phone number already exists.',
        isMock: true,
      };
    }

    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
    };

    MOCK_REGISTERED_USERS.set(cleanPhone, { user: newUser, pin: data.pin });

    const syntheticToken = `mock-jwt-${Date.now()}-${newUser.id}`;
    await this.persistSession(syntheticToken, newUser);

    return {
      success: true,
      token: syntheticToken,
      user: newUser,
      isMock: true,
    };
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
