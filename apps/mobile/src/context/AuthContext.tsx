import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api, {
  saveAuthTokens,
  clearAuthTokens,
  saveAuthUser,
  getAuthUser,
  getAccessToken,
  getRefreshToken,
} from '../services/api';
import type { AuthUser, AuthResponse, RegisterCredentials } from '../features/trip/auth/types';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsProfileCompletion: boolean;
  setNeedsProfileCompletion: (val: boolean) => void;
  login: (identifier: string, pin: string) => Promise<AuthResponse>;
  signup: (data: RegisterCredentials) => Promise<AuthResponse>;
  googleLogin: (idToken: string) => Promise<AuthResponse>;
  completeProfile: (phone: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resendVerification: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  checkVerificationStatus: (email: string) => Promise<{ verified: boolean; user?: AuthUser }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState<boolean>(false);

  // Check existing session on app launch
  useEffect(() => {
    async function loadUserSession() {
      try {
        const storedUser = await getAuthUser();
        const accessToken = await getAccessToken();

        if (storedUser && accessToken) {
          setUser(storedUser);
          if (!storedUser.phone) {
            setNeedsProfileCompletion(true);
          }

          // Verify token validity in background with /api/auth/me
          api
            .get('/api/auth/me')
            .then((res) => {
              if (res.data?.success && res.data.user) {
                setUser(res.data.user);
                saveAuthUser(res.data.user);
                setNeedsProfileCompletion(!res.data.user.phone);
              }
            })
            .catch(async () => {
              // Token might be refreshed by api interceptor automatically
            });
        }
      } catch (err) {
        console.warn('[AuthContext] Error loading user session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserSession();
  }, []);

  /**
   * Log in with Email OR Phone + 4-Digit PIN
   */
  const login = async (identifier: string, pin: string): Promise<AuthResponse> => {
    try {
      const res = await api.post('/api/auth/login', {
        identifier,
        password: pin,
      });

      if (res.data?.success) {
        const { accessToken, refreshToken, user: loggedUser } = res.data;
        await saveAuthTokens(accessToken, refreshToken);
        await saveAuthUser(loggedUser);
        setUser(loggedUser);
        setNeedsProfileCompletion(!loggedUser.phone);
        return { success: true, user: loggedUser, accessToken, refreshToken };
      }

      return { success: false, error: res.data?.error || 'Invalid credentials' };
    } catch (err: any) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        return {
          success: false,
          isUnverified: true,
          email: err.response.data.email || identifier,
          error: err.response.data.error || 'Please verify your email before logging in.',
        };
      }
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Login failed. Please check your connection.',
      };
    }
  };

  /**
   * Sign up with name, email, phone, and 4-digit PIN
   */
  const signup = async (data: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const res = await api.post('/api/auth/signup', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.pin,
      });

      if (res.data?.success) {
        return {
          success: true,
          email: res.data.email,
        };
      }

      return {
        success: false,
        error: res.data?.error || 'Signup failed',
        field: res.data?.field,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Signup failed. Please try again.',
        field: err.response?.data?.field,
      };
    }
  };

  /**
   * Google ID Token Sign-In
   */
  const googleLogin = async (idToken: string): Promise<AuthResponse> => {
    try {
      const res = await api.post('/api/auth/google', { idToken });

      if (res.data?.success) {
        const { accessToken, refreshToken, user: gUser, needsProfileCompletion: needsPhone } = res.data;
        await saveAuthTokens(accessToken, refreshToken);
        await saveAuthUser(gUser);
        setUser(gUser);
        setNeedsProfileCompletion(!!needsPhone);
        return {
          success: true,
          user: gUser,
          accessToken,
          refreshToken,
          needsProfileCompletion: !!needsPhone,
        };
      }

      return { success: false, error: res.data?.error || 'Google Sign-In failed' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Google Sign-In failed',
      };
    }
  };

  /**
   * Complete phone profile for Google users
   */
  const completeProfile = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.patch('/api/auth/complete-profile', { phone });
      if (res.data?.success && res.data.user) {
        setUser(res.data.user);
        await saveAuthUser(res.data.user);
        setNeedsProfileCompletion(false);
        return { success: true };
      }
      return { success: false, error: res.data?.error || 'Failed to update phone number' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to update phone number',
      };
    }
  };

  /**
   * Resend Verification Email
   */
  const resendVerification = async (email: string) => {
    try {
      const res = await api.post('/api/auth/resend-verification', { email });
      return {
        success: true,
        message: res.data?.message || 'Verification email resent.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to resend verification email.',
      };
    }
  };

  /**
   * Poll verification status from backend
   */
  const checkVerificationStatus = async (email: string) => {
    try {
      const res = await api.get(`/api/auth/verification-status?email=${encodeURIComponent(email)}`);
      if (res.data?.success && res.data.verified) {
        if (res.data.accessToken && res.data.refreshToken) {
          await saveAuthTokens(res.data.accessToken, res.data.refreshToken);
          await saveAuthUser(res.data.user);
          setUser(res.data.user);
          setNeedsProfileCompletion(!res.data.user.phone);
        }
        return { verified: true, user: res.data.user };
      }
      return { verified: false };
    } catch {
      return { verified: false };
    }
  };

  /**
   * Log out and clear stored tokens
   */
  const logout = async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      await clearAuthTokens();
      setUser(null);
      setNeedsProfileCompletion(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        needsProfileCompletion,
        setNeedsProfileCompletion,
        login,
        signup,
        googleLogin,
        completeProfile,
        logout,
        resendVerification,
        checkVerificationStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
