import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapProvider } from '../../src/context/MapContext';
import { MapScreen } from '../../src/screens/MapScreen';

export default function MapTabScreen() {
  return (
    <MapProvider>
      <View style={styles.container}>
        <MapScreen />
      </View>
    </MapProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});

