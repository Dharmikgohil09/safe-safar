import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius } from '../../theme';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'accent' | 'primary';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'accent',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: PrimaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isInteractive = !disabled && !loading;

  const handlePressIn = () => {
    if (!isInteractive) return;
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    if (!isInteractive) return;
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const isAccent = variant === 'accent';

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !isInteractive }}
      testID={testID}
      style={{ width: '100%' }}
    >
      <Animated.View
        style={[
          styles.buttonBase,
          isAccent ? styles.buttonAccent : styles.buttonPrimary,
          disabled && styles.buttonDisabled,
          style,
          {
            transform: [{ scale }],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={isAccent ? colors.primaryDark : '#FFFFFF'}
          />
        ) : (
          <View style={styles.contentRow}>
            {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
            <Text
              style={[
                styles.textBase,
                isAccent ? styles.textAccent : styles.textPrimary,
                disabled && styles.textDisabled,
                textStyle,
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: radius.pill,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonAccent: {
    backgroundColor: colors.accent,
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
      },
    }),
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(51, 65, 85, 0.2)',
      },
    }),
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  textBase: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textAccent: {
    color: colors.primaryDark,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textDisabled: {
    color: colors.textMuted,
  },
});
