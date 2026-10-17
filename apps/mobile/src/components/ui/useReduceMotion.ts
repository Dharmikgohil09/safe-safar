import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook to detect and observe the user's system "Reduce Motion" accessibility setting.
 * Returns true if the user prefers reduced motion, false otherwise.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) {
          setReduceMotion(enabled);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
