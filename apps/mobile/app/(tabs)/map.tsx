import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapScreen } from '../../src/screens/MapScreen';

// MapProvider lives in (tabs)/_layout.tsx so Home can start a route search too.
export default function MapTabScreen() {
  return (
    <View style={styles.container}>
      <MapScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
