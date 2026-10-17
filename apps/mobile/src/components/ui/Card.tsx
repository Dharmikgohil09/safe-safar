import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radius } from '../../theme';
import { useReduceMotion } from './useReduceMotion';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  disableEntranceAnimation?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  testID,
  disableEntranceAnimation = false,
}: CardProps) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(
    new Animated.Value(disableEntranceAnimation || reduceMotion ? 1 : 0)
  ).current;
  const translateY = useRef(
    new Animated.Value(disableEntranceAnimation || reduceMotion ? 0 : 12)
  ).current;

  useEffect(() => {
    if (disableEntranceAnimation || reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [reduceMotion, disableEntranceAnimation]);

  const handlePressIn = () => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  if (!onPress) {
    return (
      <Animated.View
        style={[
          styles.card,
          style,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
        testID={testID}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.card,
          style,
          {
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(30, 41, 59, 0.06)',
      },
    }),
  },
});
