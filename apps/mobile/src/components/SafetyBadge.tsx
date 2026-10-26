import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafetyTier } from '../types';

interface SafetyBadgeProps {
  score: number;
  tier: SafetyTier;
  isCompact?: boolean;
}

export const SafetyBadge: React.FC<SafetyBadgeProps> = ({ score, tier, isCompact = false }) => {
  let bg = '#E8F5E9';
  let textColor = '#2E7D32';
  let label = 'Safest';
  let iconSymbol = '🛡️';

  switch (tier) {
    case 'safe':
      bg = '#E8F5E9';
      textColor = '#2E7D32';
      label = 'Safest';
      iconSymbol = '🛡️';
      break;
    case 'moderate':
      bg = '#FFF8E1';
      textColor = '#F57F17';
      label = 'Moderate';
      iconSymbol = '⚠️';
      break;
    case 'risky':
      bg = '#FFEBEE';
      textColor = '#C62828';
      label = 'High Risk';
      iconSymbol = '🚨';
      break;
  }

  if (isCompact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: bg, borderColor: textColor + '66' }]}>
        <Text style={styles.icon}>{iconSymbol}</Text>
        <Text style={[styles.compactText, { color: textColor }]}>{score}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.fullContainer, { backgroundColor: bg, borderColor: textColor + '88' }]}>
      <Text style={styles.icon}>{iconSymbol}</Text>
      <Text style={[styles.fullScore, { color: textColor }]}>{score}/100</Text>
      <Text style={[styles.fullLabel, { color: textColor }]}>• {label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactText: {
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  fullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    fontSize: 12,
  },
  fullScore: {
    fontWeight: '900',
    fontSize: 13,
    marginLeft: 6,
  },
  fullLabel: {
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
});
