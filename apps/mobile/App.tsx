import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MapProvider } from './src/context/MapContext';
import { MapScreen } from './src/screens/MapScreen';

export default function App() {
  return (
    <MapProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />
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
