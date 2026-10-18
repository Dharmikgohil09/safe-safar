import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMapState } from '../context/MapContext';
import { LatLng } from '../types';

interface QuickSpot {
  name: string;
  coords: LatLng;
  tag: string;
}

const QUICK_SPOTS: QuickSpot[] = [
  {
    name: 'Adajan Gam',
    coords: { latitude: 21.1963, longitude: 72.7952 },
    tag: 'Demo End',
  },
  {
    name: 'VR Mall Surat',
    coords: { latitude: 21.1442, longitude: 72.7565 },
    tag: 'Mall & Hub',
  },
  {
    name: 'Surat Railway Stn',
    coords: { latitude: 21.2044, longitude: 72.8407 },
    tag: 'Transit',
  },
  {
    name: 'SVNIT Campus',
    coords: { latitude: 21.1648, longitude: 72.7848 },
    tag: 'Demo Start',
  },
  {
    name: 'Dumas Silent Zone',
    coords: { latitude: 21.0921, longitude: 72.7154 },
    tag: 'Dead Zone Test',
  },
];

export const DestinationSearchBar: React.FC = () => {
  const { destinationName, isOffline, isLoading, calculateRoutes } = useMapState();
  const [inputText, setInputText] = useState(destinationName);

  useEffect(() => {
    setInputText(destinationName);
  }, [destinationName]);

  const handleSearch = () => {
    const targetName = inputText.trim() || 'Adajan Gam';
    calculateRoutes({ latitude: 21.1963, longitude: 72.7952 }, targetName);
  };

  const handleSelectSpot = (spot: QuickSpot) => {
    setInputText(spot.name);
    calculateRoutes(spot.coords, spot.name);
  };

  return (
    <View style={styles.container}>
      {/* Search Input Card */}
      <View style={styles.searchCard}>
        {/* Origin Row */}
        <View style={styles.originRow}>
          <View style={styles.originDot} />
          <Text style={styles.originText} numberOfLines={1}>
            Current Location (SVNIT Dumas Road)
          </Text>
          {isOffline && (
            <View style={styles.offlineChip}>
              <Text style={styles.offlineText}>OFFLINE</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Destination Row */}
        <View style={styles.destRow}>
          <Text style={styles.pinIcon}>📍</Text>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Enter destination in Surat..."
            placeholderTextColor="#8E8E93"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {isLoading ? (
            <ActivityIndicator size="small" color="#1E88E5" style={styles.searchButton} />
          ) : (
            <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Destination Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
        style={styles.chipsContainer}
      >
        {QUICK_SPOTS.map((spot) => {
          const isSelected = destinationName === spot.name;
          return (
            <TouchableOpacity
              key={spot.name}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
              ]}
              onPress={() => handleSelectSpot(spot)}
            >
              <Text style={styles.chipIcon}>🧭</Text>
              <Text
                style={[
                  styles.chipText,
                  isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                ]}
              >
                {spot.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E88E5',
    marginRight: 12,
  },
  originText: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '600',
    flex: 1,
  },
  offlineChip: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF8F00',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginLeft: 36,
    marginRight: 14,
    marginVertical: 4,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  pinIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    paddingVertical: 4,
  },
  searchButton: {
    padding: 6,
  },
  searchIcon: {
    fontSize: 16,
  },
  chipsContainer: {
    marginTop: 8,
  },
  chipsScroll: {
    paddingRight: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chipSelected: {
    backgroundColor: '#1E88E5',
    borderWidth: 1,
    borderColor: '#1E88E5',
  },
  chipUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: '#424242',
  },
});
