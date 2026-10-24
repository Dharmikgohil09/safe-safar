import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const ACCESS_TOKEN_KEY = 'safesafar.access_token.v2';
export const REFRESH_TOKEN_KEY = 'safesafar.refresh_token.v2';
export const USER_KEY = 'safesafar.user.v2';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://safe-safar.onrender.com').replace(/\/+$/, '');

// Create Axios instance
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 35000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper functions for secure token storage
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (err) {
    console.warn('[SecureStore] Failed to save tokens:', err);
  }
}

export async function clearAuthTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (err) {
    console.warn('[SecureStore] Failed to clear tokens:', err);
  }
}

export async function saveAuthUser(user: any): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('[SecureStore] Failed to save user:', err);
  }
}

export async function getAuthUser(): Promise<any | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Request Interceptor: Attach Access Token and Debug Log
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
    console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-Refresh on 401 & Network Error Handling
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const targetUrl = `${error.config?.baseURL || ''}${error.config?.url || ''}`;

    // Handle offline / sleeping Render server (no response received)
    if (!error.response) {
      const friendlyMsg = `Cannot reach server at ${targetUrl || 'SafeSafar API'}. If the server was idle, wait 30-40 seconds and try again.`;
      console.warn(`[API Network Error] ${friendlyMsg} (${error.message})`);
      error.message = friendlyMsg;
      return Promise.reject(error);
    }

    console.warn(`[API Error] ${error.response.status} ${error.config?.url}:`, error.response.data);

    // Don't loop on refresh/login endpoints
    if (
      error.response.status !== 401 ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Direct axios call to avoid interceptor recursion
      const refreshResponse = await axios.post(`${BASE_URL}/api/auth/refresh`, {
        refreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;

      await saveAuthTokens(newAccessToken, newRefreshToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      processQueue(null, newAccessToken);
      return api(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      await clearAuthTokens();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
