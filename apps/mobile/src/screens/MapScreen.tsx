import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useMapState } from '../context/MapContext';
import { MapViewComponent } from '../components/MapViewComponent';
import { DestinationSearchBar } from '../components/DestinationSearchBar';
import { DeadZoneWarningBanner } from '../components/DeadZoneWarningBanner';
import { RouteSelectionPanel } from '../components/RouteSelectionPanel';
import { MapLayerControls } from '../components/MapLayerControls';

export const MapScreen: React.FC = () => {
  const { deadZoneAlert } = useMapState();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 1. Interactive Map Engine Layer */}
      <MapViewComponent />

      {/* 2. Top Header HUD: Search Bar & Dead Zone Warning Banner */}
      <SafeAreaView style={styles.topHudSafeArea}>
        <View style={styles.topHudContainer}>
          <DestinationSearchBar />
          <DeadZoneWarningBanner alert={deadZoneAlert} />
        </View>
      </SafeAreaView>

      {/* 3. Right Floating Action Buttons Cluster */}
      <MapLayerControls />

      {/* 4. Bottom Route Alternatives Carousel HUD */}
      <SafeAreaView style={styles.bottomHudSafeArea}>
        <RouteSelectionPanel />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topHudSafeArea: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topHudContainer: {
    paddingTop: 8,
  },
  bottomHudSafeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    zIndex: 10,
  },
});
