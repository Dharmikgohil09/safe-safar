import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, StatusBar } from 'react-native';
import SosDevScreen from '../../src/features/emergency/screens/SosDevScreen';
import HarshilSosScreen from '../../src/features/trip/screens/SosScreen';

/**
 * Unified SOS Tab Screen
 * Combines Kristal's real Emergency SOS Engine & Decoy Calculator
 * with Harshil's Consumer SOS UI.
 */
export default function UnifiedSosTab() {
  const [activeMode, setActiveMode] = useState<'engine' | 'ui'>('engine');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A24" />
      <SafeAreaView style={styles.tabBarContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeMode === 'engine' && styles.segmentBtnActive]}
            onPress={() => setActiveMode('engine')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeMode === 'engine' && styles.segmentTextActive]}>
              Kristal SOS Engine & Decoy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeMode === 'ui' && styles.segmentBtnActive]}
            onPress={() => setActiveMode('ui')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeMode === 'ui' && styles.segmentTextActive]}>
              Harshil SOS UI
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        {activeMode === 'engine' ? <SosDevScreen /> : <HarshilSosScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  tabBarContainer: {
    backgroundColor: '#1A1A24',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D3D',
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#0B0B10',
    borderRadius: 8,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#E11D48',
  },
  segmentText: {
    color: '#9A9AAE',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
});
