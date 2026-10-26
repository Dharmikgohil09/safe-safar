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

export const RouteSelectionPanel: React.FC = () => {
  const { routes, selectedRoute, selectRoute } = useMapState();
  const [inspectingRoute, setInspectingRoute] = useState<RouteOption | null>(null);

  if (routes.length === 0) {
    return null;
  }

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

              {/* Inspect Button */}
              <TouchableOpacity
                style={styles.inspectButton}
                onPress={() => {
                  selectRoute(route);
                  setInspectingRoute(route);
                }}
              >
                <Text style={[styles.inspectText, { color }]}>View Safety Factors</Text>
                <Text style={[styles.arrowIcon, { color }]}>›</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginRight: 12,
    justifyContent: 'space-between',
    minHeight: 145,
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
  inspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 6,
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
});
