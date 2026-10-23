export interface AuthUser {
  id: string;
  name: string;
  phone?: string | null;
  email: string;
  avatar?: string;
  authProvider?: 'local' | 'google';
  isEmailVerified?: boolean;
}

export interface AuthCredentials {
  identifier?: string;
  phone?: string;
  pin: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  phone: string;
  pin: string;
  confirmPin: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  error?: string;
  field?: string;
  isUnverified?: boolean;
  email?: string;
  needsProfileCompletion?: boolean;
  isMock?: boolean;
}

export interface AuthValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  pin?: string;
  confirmPin?: string;
  general?: string;
}
