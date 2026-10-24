import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMapState } from '../context/MapContext';
import { MapViewComponent } from '../components/MapViewComponent';
import { DestinationSearchBar } from '../components/DestinationSearchBar';
import { DeadZoneWarningBanner } from '../components/DeadZoneWarningBanner';
import { RouteSelectionPanel } from '../components/RouteSelectionPanel';
import { MapLayerControls } from '../components/MapLayerControls';

export const MapScreen: React.FC = () => {
  const { deadZoneAlert } = useMapState();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 1. Interactive Map Engine Layer */}
      <MapViewComponent />

      {/* 2. Top Header HUD: Search Bar & Dead Zone Warning Banner */}
      <View style={[styles.topHudSafeArea, { top: insets.top }]} pointerEvents="box-none">
        <View style={styles.topHudContainer} pointerEvents="box-none">
          <DestinationSearchBar />
          <DeadZoneWarningBanner alert={deadZoneAlert} />
        </View>
      </View>

      {/* 3. Right Floating Action Buttons Cluster */}
      <MapLayerControls />

      {/* 4. Bottom Route Alternatives Carousel HUD */}
      <View style={styles.bottomHudSafeArea} pointerEvents="box-none">
        <RouteSelectionPanel />
      </View>
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
