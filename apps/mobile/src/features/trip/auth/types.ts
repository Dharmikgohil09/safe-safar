export interface AuthUser {
  id: string;
  name: string;
  phone: string;
}

export interface AuthCredentials {
  phone: string;
  pin: string;
}

export interface RegisterCredentials {
  name: string;
  phone: string;
  pin: string;
  confirmPin: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
  isMock?: boolean;
}

export interface AuthValidationErrors {
  name?: string;
  phone?: string;
  pin?: string;
  confirmPin?: string;
  general?: string;
}
