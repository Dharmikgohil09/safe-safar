import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useMapState } from '../context/MapContext';
import { RouteOption } from '../types';
import { getRouteColor, getSafetyTier } from '../models/RouteOption';
import { formatDistance, formatDuration } from '../utils/geo';
import { SafetyBadge } from './SafetyBadge';
import { RouteDetailModal } from './RouteDetailModal';
import { openRouteInGoogleMaps } from '../services/googleMapsService';

export const RouteSelectionPanel: React.FC = () => {
  const { routes, selectedRoute, selectRoute, userLocation, destination } = useMapState();
  const [inspectingRoute, setInspectingRoute] = useState<RouteOption | null>(null);

  if (routes.length === 0) {
    return null;
  }

  const handleOpenGoogleMaps = (route: RouteOption) => {
    selectRoute(route);
    openRouteInGoogleMaps({
      route,
      origin: userLocation,
      destination,
      travelMode: 'walking',
    });
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>ROUTE ALTERNATIVES</Text>
        <Text style={styles.subtitle}>{routes.length} options evaluated</Text>
      </View>

      {/* Cards Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      >
        {routes.map((route) => {
          const isSelected = selectedRoute?.routeId === route.routeId;
          const tier = getSafetyTier(route.safetyScore);
          const color = getRouteColor(tier);

          return (
            <TouchableOpacity
              key={route.routeId}
              style={[
                styles.card,
                {
                  borderColor: isSelected ? color : '#E0E0E0',
                  borderWidth: isSelected ? 2.5 : 1,
                  shadowColor: isSelected ? color : '#000',
                  shadowOpacity: isSelected ? 0.3 : 0.08,
                },
              ]}
              onPress={() => selectRoute(route)}
              activeOpacity={0.85}
            >
              {/* Card Header: Score + Metrics */}
              <View style={styles.cardTopRow}>
                <SafetyBadge score={route.safetyScore} tier={tier} isCompact />
                <View style={styles.metricsGroup}>
                  <Text style={styles.walkIcon}>🚶</Text>
                  <Text style={styles.durationText}>{formatDuration(route.durationSeconds)}</Text>
                  <Text style={styles.distanceText}>({formatDistance(route.distanceMeters)})</Text>
                </View>
              </View>

              {/* Route Name */}
              <Text style={styles.routeName} numberOfLines={1}>
                {route.name}
              </Text>

              {/* Explanation preview */}
              <Text style={styles.explanationPreview} numberOfLines={2}>
                {route.explanation}
              </Text>

              {/* Card Footer: View Safety Factors & Google Maps button */}
              <View style={styles.cardFooterRow}>
                <TouchableOpacity
                  style={styles.inspectButton}
                  onPress={() => {
                    selectRoute(route);
                    setInspectingRoute(route);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View Safety Factors"
                >
                  <Text style={[styles.inspectText, { color }]}>Safety Factors</Text>
                  <Text style={[styles.arrowIcon, { color }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gmapsCardButton,
                    isSelected && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => handleOpenGoogleMaps(route)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${route.name} in Google Maps`}
                  activeOpacity={0.8}
                >
                  <Text style={styles.gmapsCardIcon}>🗺️</Text>
                  <Text
                    style={[
                      styles.gmapsCardText,
                      isSelected && styles.gmapsCardTextSelected,
                    ]}
                  >
                    Google Maps
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Route Quick Launch Banner */}
      {selectedRoute && (
        <View style={styles.selectedRouteBarContainer}>
          <TouchableOpacity
            style={[
              styles.selectedRouteGmapsButton,
              { backgroundColor: getRouteColor(getSafetyTier(selectedRoute.safetyScore)) },
            ]}
            onPress={() => handleOpenGoogleMaps(selectedRoute)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Open selected safe route ${selectedRoute.name} in Google Maps`}
          >
            <Text style={styles.selectedRouteGmapsIcon}>🗺️</Text>
            <Text style={styles.selectedRouteGmapsText}>
              Open in Google Maps
            </Text>
            <Text style={styles.selectedRouteGmapsSubtext} numberOfLines={1}>
              • {selectedRoute.name}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Route Detail Modal */}
      <RouteDetailModal
        route={inspectingRoute}
        visible={inspectingRoute !== null}
        onClose={() => setInspectingRoute(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#212121',
  },
  subtitle: {
    fontSize: 11,
    color: '#757575',
    fontWeight: '600',
  },
  carouselContent: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  card: {
    width: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginRight: 12,
    justifyContent: 'space-between',
    minHeight: 155,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walkIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  durationText: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#212121',
  },
  distanceText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  routeName: {
    fontWeight: '800',
    fontSize: 13.5,
    color: '#212121',
    marginVertical: 4,
  },
  explanationPreview: {
    color: '#616161',
    fontSize: 11.5,
    lineHeight: 15,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 4,
  },
  inspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  inspectText: {
    fontWeight: 'bold',
    fontSize: 11.5,
  },
  arrowIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  gmapsCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  gmapsCardIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  gmapsCardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#424242',
  },
  gmapsCardTextSelected: {
    color: '#FFFFFF',
  },
  selectedRouteBarContainer: {
    paddingHorizontal: 14,
    marginTop: 8,
  },
  selectedRouteGmapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  selectedRouteGmapsIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  selectedRouteGmapsText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  selectedRouteGmapsSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 6,
    maxWidth: 150,
  },
});
