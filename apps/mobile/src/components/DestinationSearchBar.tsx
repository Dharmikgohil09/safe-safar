import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useMapState } from '../context/MapContext';
import { LatLng } from '../types';
import { PlaceSearchResult } from '../services/geocodingService';

interface QuickSpot {
  name: string;
  coords: LatLng;
  tag: string;
  icon: string;
}

const QUICK_SPOTS: QuickSpot[] = [
  {
    name: 'Adajan Gam Circle',
    coords: { latitude: 21.1963, longitude: 72.7952 },
    tag: 'Demo End',
    icon: '📍',
  },
  {
    name: 'SVNIT Campus Dumas Rd',
    coords: { latitude: 21.1648, longitude: 72.7848 },
    tag: 'Demo Start',
    icon: '🎓',
  },
  {
    name: 'VR Mall Surat',
    coords: { latitude: 21.1442, longitude: 72.7565 },
    tag: 'Commercial Hub',
    icon: '🏬',
  },
  {
    name: 'Surat Railway Station',
    coords: { latitude: 21.2044, longitude: 72.8407 },
    tag: 'Transit Hub',
    icon: '🚉',
  },
  {
    name: 'Umra Police Station',
    coords: { latitude: 21.1685, longitude: 72.7935 },
    tag: 'Police Haven',
    icon: '🛡️',
  },
  {
    name: 'Civil Hospital Surat',
    coords: { latitude: 21.1784, longitude: 72.8211 },
    tag: '24/7 Hospital',
    icon: '🏥',
  },
  {
    name: 'Dumas Silent Zone',
    coords: { latitude: 21.0921, longitude: 72.7154 },
    tag: 'Dead Zone Test',
    icon: '📵',
  },
];

export const DestinationSearchBar: React.FC = () => {
  const { destinationName, isOffline, isLoading, calculateRoutes, searchPlaces } = useMapState();
  const [inputText, setInputText] = useState(destinationName);
  const [suggestions, setSuggestions] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    setInputText(destinationName);
  }, [destinationName]);

  // Debounced live place search (Nominatim + Surat database)
  const handleTextChange = (text: string) => {
    setInputText(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text);
        setSuggestions(results);
      } catch (_) {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setInputText(place.name);
    setShowDropdown(false);
    Keyboard.dismiss();
    calculateRoutes(place.coordinates, place.name);
  };

  const handleSelectQuickSpot = (spot: QuickSpot) => {
    setInputText(spot.name);
    setShowDropdown(false);
    Keyboard.dismiss();
    calculateRoutes(spot.coords, spot.name);
  };

  const handleManualSearchSubmit = async () => {
    Keyboard.dismiss();
    setShowDropdown(false);
    if (!inputText.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchPlaces(inputText);
      if (results.length > 0) {
        handleSelectPlace(results[0]);
      } else {
        // Fallback to Adajan Gam default
        calculateRoutes({ latitude: 21.1963, longitude: 72.7952 }, inputText.trim());
      }
    } catch (_) {
      calculateRoutes({ latitude: 21.1963, longitude: 72.7952 }, inputText.trim());
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Input Card */}
      <View style={styles.searchCard}>
        {/* Origin Row */}
        <View style={styles.originRow}>
          <View style={styles.originDot} />
          <Text style={styles.originText} numberOfLines={1}>
            Your Location (SVNIT Dumas Road, Surat)
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
            onChangeText={handleTextChange}
            onFocus={() => {
              if (inputText.length > 0) setShowDropdown(true);
            }}
            placeholder="Search address, landmark in Surat..."
            placeholderTextColor="#8E8E93"
            onSubmitEditing={handleManualSearchSubmit}
            returnKeyType="search"
          />

          {inputText.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}

          {isLoading || isSearching ? (
            <ActivityIndicator size="small" color="#1E88E5" style={styles.searchButton} />
          ) : (
            <TouchableOpacity onPress={handleManualSearchSubmit} style={styles.searchButton}>
              <Text style={styles.searchButtonText}>GO</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Autocomplete Dropdown List */}
      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdownCard}>
          <ScrollView
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {suggestions.map((item) => {
              let icon = '📍';
              if (item.category === 'police') icon = '🛡️';
              else if (item.category === 'hospital') icon = '🏥';
              else if (item.category === 'pharmacy') icon = '💊';
              else if (item.category === 'transit') icon = '🚉';
              else if (item.category === 'landmark') icon = '🏛️';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectPlace(item)}
                >
                  <Text style={styles.itemIcon}>{icon}</Text>
                  <View style={styles.itemTextCol}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.formattedDistance && (
                        <Text style={styles.itemDist}>{item.formattedDistance}</Text>
                      )}
                    </View>
                    <Text style={styles.itemAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Quick Category & Surat Spot Chips */}
      {!showDropdown && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickChipsContent}
          style={styles.quickChipsScroll}
        >
          {QUICK_SPOTS.map((spot) => (
            <TouchableOpacity
              key={spot.name}
              style={styles.chip}
              onPress={() => handleSelectQuickSpot(spot)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipIcon}>{spot.icon}</Text>
              <Text style={styles.chipText}>{spot.name}</Text>
              <View style={styles.chipBadge}>
                <Text style={styles.chipBadgeText}>{spot.tag}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    zIndex: 15,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 10,
  },
  originText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  offlineChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  offlineText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 6,
    marginLeft: 20,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 6,
    marginRight: 4,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  searchButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 6,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  itemDist: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  itemAddress: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  quickChipsScroll: {
    marginTop: 8,
  },
  quickChipsContent: {
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chipIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginRight: 6,
  },
  chipBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chipBadgeText: {
    fontSize: 9,
    color: '#2563EB',
    fontWeight: '800',
  },
});
