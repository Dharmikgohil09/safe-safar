import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, radius, typography } from '../../theme';
import { PrimaryButton } from './PrimaryButton';
import { useReduceMotion } from './useReduceMotion';

export interface StateViewProps {
  kind: 'empty' | 'loading' | 'error';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StateView({
  kind,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: StateViewProps) {
  const reduceMotion = useReduceMotion();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (kind === 'loading' && !reduceMotion) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [kind, reduceMotion, pulseAnim]);

  return (
    <View style={[styles.container, style]}>
      {kind === 'empty' && (
        <View style={styles.iconCircle}>
          <MaterialIcons name="inbox" size={38} color={colors.textMuted} />
        </View>
      )}

      {kind === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
          <Animated.View style={[styles.skeletonBlock, { opacity: pulseAnim }]}>
            <View style={[styles.skeletonBar, styles.skeletonBarTop]} />
            <View style={[styles.skeletonBar, styles.skeletonBarMiddle]} />
            <View style={[styles.skeletonBar, styles.skeletonBarBottom]} />
          </Animated.View>
        </View>
      )}

      {kind === 'error' && (
        <View style={[styles.iconCircle, styles.errorIconCircle]}>
          <MaterialIcons name="error-outline" size={38} color={colors.danger} />
        </View>
      )}

      <Text style={[styles.title, kind === 'error' && styles.errorTitle]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {actionLabel && onAction && (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          variant={kind === 'error' ? 'primary' : 'accent'}
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: radius.card,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorIconCircle: {
    backgroundColor: '#FEE2E2',
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  spinner: {
    marginBottom: 14,
  },
  skeletonBlock: {
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  skeletonBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
  },
  skeletonBarTop: {
    width: '85%',
  },
  skeletonBarMiddle: {
    width: '100%',
  },
  skeletonBarBottom: {
    width: '60%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  errorTitle: {
    color: colors.danger,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  actionButton: {
    marginTop: 4,
    minWidth: 140,
  },
});
