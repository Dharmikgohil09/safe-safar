import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'safesafar.onboarding_completed.v1';

export async function isOnboardingCompleted(): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(ONBOARDING_KEY) === 'true';
      }
    } catch {
      return false;
    }
    return false;
  }

  try {
    const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  const strVal = completed ? 'true' : 'false';

  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(ONBOARDING_KEY, strVal);
      }
    } catch {
      // LocalStorage fallback
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, strVal);
  } catch {
    // In dev-client fallback
  }
}

export async function resetOnboarding(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(ONBOARDING_KEY);
      }
    } catch {
      // Clean
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
  } catch {
    // Clean
  }
}
