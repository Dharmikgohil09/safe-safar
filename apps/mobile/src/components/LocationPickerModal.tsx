import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  FlatList,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { LatLng } from '../types';
import { getTileUrl } from '../config/mapConfig';
import { geocodingService, PlaceSearchResult } from '../services/geocodingService';
import { colors, radius, spacing, typography } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Web Mercator tile math
function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * Math.pow(2, zoom);
}

function tile2lon(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

function tile2lat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

interface LocationPickerModalProps {
  visible: boolean;
  initialLocation?: LatLng | null;
  onClose: () => void;
  onConfirm: (location: { latitude: number; longitude: number; address: string }) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialLocation,
  onClose,
  onConfirm,
}) => {
  const defaultFallback: LatLng = { latitude: 21.1648, longitude: 72.7848 }; // SVNIT Surat default

  const [centerCoords, setCenterCoords] = useState<LatLng>(initialLocation || defaultFallback);
  const [zoomLevel, setZoomLevel] = useState<number>(16);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Gesture tracking refs
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomLevelRef = useRef<number>(16);
  const centerCoordsRef = useRef<LatLng>(centerCoords);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    centerCoordsRef.current = centerCoords;
  }, [centerCoords]);

  // Sync initial location when modal opens
  useEffect(() => {
    if (visible) {
      const loc = initialLocation || defaultFallback;
      setCenterCoords(loc);
      centerCoordsRef.current = loc;
      setPanOffset({ x: 0, y: 0 });
      panOffsetRef.current = { x: 0, y: 0 };
      setZoomLevel(16);
      zoomLevelRef.current = 16;
      triggerReverseGeocode(loc);
    }
  }, [visible, initialLocation]);

  // Reverse geocode with debounce
  const triggerReverseGeocode = useCallback((coords: LatLng) => {
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }
    setIsGeocoding(true);
    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await geocodingService.reverseGeocode(coords);
        if (res && (res.address || res.name)) {
          setResolvedAddress(res.address || res.name);
        } else {
          setResolvedAddress(`Pinned location (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`);
        }
      } catch {
        setResolvedAddress(`Pinned location (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`);
      } finally {
        setIsGeocoding(false);
      }
    }, 500);
  }, []);

  // Compute map center in lat/lng from pan offset
  const commitPanToCenter = useCallback(() => {
    const curPan = panOffsetRef.current;
    if (curPan.x === 0 && curPan.y === 0) return;

    const curCenter = centerCoordsRef.current;
    const curZoom = zoomLevelRef.current;

    const centerTileX = lon2tile(curCenter.longitude, curZoom);
    const centerTileY = lat2tile(curCenter.latitude, curZoom);

    // Pan offset is in screen pixels (1 tile = 256px)
    const newTileX = centerTileX - curPan.x / 256;
    const newTileY = centerTileY - curPan.y / 256;

    const newCenter: LatLng = {
      latitude: tile2lat(newTileY, curZoom),
      longitude: tile2lon(newTileX, curZoom),
    };

    setPanOffset({ x: 0, y: 0 });
    panOffsetRef.current = { x: 0, y: 0 };
    setCenterCoords(newCenter);
    centerCoordsRef.current = newCenter;
    triggerReverseGeocode(newCenter);
  }, [triggerReverseGeocode]);

  // Pan gesture responder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
        onPanResponderGrant: () => {
          dragStartRef.current = { x: panOffsetRef.current.x, y: panOffsetRef.current.y };
        },
        onPanResponderMove: (_, g) => {
          const nextPan = {
            x: dragStartRef.current.x + g.dx,
            y: dragStartRef.current.y + g.dy,
          };
          panOffsetRef.current = nextPan;
          setPanOffset(nextPan);
        },
        onPanResponderRelease: () => {
          commitPanToCenter();
        },
      }),
    [commitPanToCenter]
  );

  // Search places with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await geocodingService.searchPlaces(text, centerCoordsRef.current);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  // Select place from search
  const handleSelectPlace = (place: PlaceSearchResult) => {
    setSearchQuery('');
    setSearchResults([]);
    setPanOffset({ x: 0, y: 0 });
    panOffsetRef.current = { x: 0, y: 0 };
    setCenterCoords(place.coordinates);
    centerCoordsRef.current = place.coordinates;
    setResolvedAddress(place.address || place.name);
    setZoomLevel(16);
    zoomLevelRef.current = 16;
  };

  // Locate current GPS
  const handleUseCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission is required to detect your GPS position.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: LatLng = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setPanOffset({ x: 0, y: 0 });
      panOffsetRef.current = { x: 0, y: 0 };
      setCenterCoords(coords);
      centerCoordsRef.current = coords;
      setZoomLevel(16);
      zoomLevelRef.current = 16;
      triggerReverseGeocode(coords);
    } catch (err: any) {
      alert(`Could not get GPS location: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsLocating(false);
    }
  };

  // Zoom buttons
  const handleZoomIn = () => {
    if (zoomLevel < 18) {
      setZoomLevel((z) => {
        const nz = z + 1;
        zoomLevelRef.current = nz;
        return nz;
      });
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 10) {
      setZoomLevel((z) => {
        const nz = z - 1;
        zoomLevelRef.current = nz;
        return nz;
      });
    }
  };

  // Tiles grid calculation
  const tiles = useMemo(() => {
    const centerTileX = lon2tile(centerCoords.longitude, zoomLevel);
    const centerTileY = lat2tile(centerCoords.latitude, zoomLevel);

    const viewCenterTileX = centerTileX - panOffset.x / 256;
    const viewCenterTileY = centerTileY - panOffset.y / 256;

    const tilesAcross = Math.ceil(SCREEN_WIDTH / 256) + 3;
    const tilesDown = Math.ceil(SCREEN_HEIGHT / 256) + 3;

    const minTileX = Math.floor(viewCenterTileX - tilesAcross / 2);
    const maxTileX = Math.ceil(viewCenterTileX + tilesAcross / 2);
    const minTileY = Math.floor(viewCenterTileY - tilesDown / 2);
    const maxTileY = Math.ceil(viewCenterTileY + tilesDown / 2);

    const maxCoord = Math.pow(2, zoomLevel);
    const items: Array<{ key: string; left: number; top: number; url: string }> = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= maxCoord) continue;
        const normalizedX = ((tx % maxCoord) + maxCoord) % maxCoord;
        const left = SCREEN_WIDTH / 2 + (tx - centerTileX) * 256 + panOffset.x;
        const top = SCREEN_HEIGHT / 2 + (ty - centerTileY) * 256 + panOffset.y;

        items.push({
          key: `${zoomLevel}_${normalizedX}_${ty}_${tx}`,
          left,
          top,
          url: getTileUrl('street', zoomLevel, normalizedX, ty),
        });
      }
    }
    return items;
  }, [centerCoords, zoomLevel, panOffset]);

  const handleConfirm = () => {
    const addr =
      resolvedAddress.trim() ||
      `Pinned location (${centerCoords.latitude.toFixed(5)}, ${centerCoords.longitude.toFixed(5)})`;
    onConfirm({
      latitude: centerCoords.latitude,
      longitude: centerCoords.longitude,
      address: addr,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Full-screen Tile Map Container */}
        <View style={styles.mapContainer} {...panResponder.panHandlers}>
          {tiles.map((t) => (
            <Image
              key={t.key}
              source={{ uri: t.url }}
              style={[
                styles.tile,
                {
                  left: t.left,
                  top: t.top,
                },
              ]}
              resizeMode="cover"
            />
          ))}

          {/* Fixed Center Pin */}
          <View pointerEvents="none" style={styles.centerPinContainer}>
            <View style={styles.pinWrapper}>
              <MaterialIcons name="location-on" size={44} color="#EA580C" />
              <View style={styles.pinPulseDot} />
            </View>
          </View>
        </View>

        {/* Top Floating Header & Search Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close picker"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search address or landmark..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCorrect={false}
              returnKeyType="search"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.accent} style={styles.searchSpinner} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearSearchBtn}>
                <MaterialIcons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Search Results Dropdown List */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsOverlay}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleSelectPlace(item)}
                >
                  <MaterialIcons name="place" size={20} color={colors.accent} style={styles.resultIcon} />
                  <View style={styles.resultTextGroup}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Floating Zoom and GPS Controls */}
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={handleUseCurrentLocation}
            disabled={isLocating}
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="my-location" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>

          <View style={styles.zoomButtonGroup}>
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
              <MaterialIcons name="add" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
              <MaterialIcons name="remove" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Location Confirm Sheet */}
        <View style={styles.bottomCard}>
          <View style={styles.bottomHandleBar} />

          <View style={styles.locationHeaderRow}>
            <MaterialIcons name="place" size={24} color="#EA580C" />
            <View style={styles.locationInfoCol}>
              <Text style={styles.selectedAddressLabel}>SELECTED PINNED LOCATION</Text>
              {isGeocoding ? (
                <View style={styles.geocodingRow}>
                  <ActivityIndicator size="small" color="#EA580C" />
                  <Text style={styles.geocodingText}>Resolving address...</Text>
                </View>
              ) : (
                <Text style={styles.selectedAddressText} numberOfLines={2}>
                  {resolvedAddress ||
                    `Pinned location (${centerCoords.latitude.toFixed(5)}, ${centerCoords.longitude.toFixed(5)})`}
                </Text>
              )}
              <Text style={styles.coordinatesBadge}>
                {centerCoords.latitude.toFixed(6)}, {centerCoords.longitude.toFixed(6)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  tile: {
    position: 'absolute',
    width: 256,
    height: 256,
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -22,
    marginTop: -44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
    marginTop: -4,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    marginRight: 10,
  },
  searchContainer: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  searchSpinner: {
    marginLeft: 6,
  },
  clearSearchBtn: {
    padding: 4,
  },
  searchResultsOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 72,
    left: 16,
    right: 16,
    maxHeight: 260,
    backgroundColor: colors.surface,
    borderRadius: 14,
    zIndex: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultIcon: {
    marginRight: 10,
  },
  resultTextGroup: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    bottom: 220,
    zIndex: 15,
    alignItems: 'center',
  },
  fabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 12,
  },
  zoomButtonGroup: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  bottomHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationInfoCol: {
    flex: 1,
    marginLeft: 10,
  },
  selectedAddressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  geocodingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  geocodingText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  coordinatesBadge: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  confirmButton: {
    backgroundColor: '#EA580C',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
