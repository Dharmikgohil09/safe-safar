import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '../../theme';

export interface ShieldLogoProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function ShieldLogo({
  size = 56,
  color = colors.primary,
  style,
}: ShieldLogoProps) {
  const containerSize = Math.round(size * 1.35);
  const iconSize = Math.round(size * 0.72);

  return (
    <View
      style={[
        styles.circle,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="SafeSafar shield logo"
    >
      <MaterialIcons name="security" size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
