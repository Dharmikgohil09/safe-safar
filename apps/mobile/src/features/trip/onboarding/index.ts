// Public API of the onboarding feature.
// Other features import ONLY from this file.

export { default as OnboardingScreen } from './screens/OnboardingScreen';
export {
  isOnboardingCompleted,
  setOnboardingCompleted,
  resetOnboarding,
} from './storage/onboardingStorage';
export * from './types';
