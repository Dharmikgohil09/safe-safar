import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';

export interface ProgressStepsProps {
  total: number;
  current: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressSteps({ total, current, style }: ProgressStepsProps) {
  const steps = Array.from({ length: total }, (_, i) => i);

  return (
    <View style={[styles.container, style]} accessibilityRole="progressbar">
      {steps.map((idx) => {
        const isActive = idx === current;
        const isCompleted = idx < current;
        const isHighlighted = isActive || isCompleted;

        return (
          <View
            key={idx}
            style={[
              styles.bar,
              isHighlighted ? styles.barActive : styles.barInactive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: colors.primary, // #146B4B
  },
  barInactive: {
    backgroundColor: '#B8D9C7',
  },
});
