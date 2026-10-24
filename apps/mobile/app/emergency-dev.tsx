import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import SosDevScreen from '../src/features/emergency/screens/SosDevScreen';

// Hidden: long-press the version text at the bottom of the side menu.
export default function EmergencyDev() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0B10' }}>
      <SosDevScreen />
    </SafeAreaView>
  );
}
