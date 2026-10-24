import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Card, PrimaryButton, StateView } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';
import { mockRoutes, MockRoute } from '../mock/mockData';

export default function SafeRouteScreen() {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(mockRoutes[0].id);

  const showMessage = (feature: string) => {
    Alert.alert(feature, 'This feature will be connected during development.');
  };

  const selectedRoute =
    mockRoutes.find((r) => r.id === selectedRouteId) || mockRoutes[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Safe Route</Text>
          <Text style={styles.headerSubtitle}>Surat Safe Transit Corridor</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Interactive Map Entry Card */}
        <Card style={styles.mapCard} onPress={() => router.push('/(tabs)/map')}>
          <View style={styles.mapArea}>
            {/* Grid / Street simulated markings */}
            <View style={styles.mapGridLineH1} />
            <View style={styles.mapGridLineH2} />
            <View style={styles.mapGridLineV1} />
            <View style={styles.mapGridLineV2} />

            {/* Route Line 1: Safer Route (Green segments) */}
            <View style={styles.routeLineSafer1} />
            <View style={styles.routeLineSafer2} />
            <View style={styles.routeLineSafer3} />

            {/* Route Line 2: Alternative Route (Orange segments) */}
            <View style={styles.routeLineAlt1} />
            <View style={styles.routeLineAlt2} />

            {/* Map markers: Origin & Destination */}
            <View style={styles.markerOrigin}>
              <View style={styles.markerOriginDot} />
              <Text style={styles.markerLabel}>Start: Athwa</Text>
            </View>

            <View style={styles.markerDest}>
              <MaterialIcons name="place" size={20} color={colors.danger} />
              <Text style={styles.markerLabelDest}>Destination</Text>
            </View>

            {/* Simulated Live Badges */}
            <View style={styles.mapBadgeSafer}>
              <View style={styles.dotGreen} />
              <Text style={styles.mapBadgeText}>Safer: 25 min · 94 Score</Text>
            </View>

            <View style={styles.mapBadgeAlt}>
              <View style={styles.dotOrange} />
              <Text style={styles.mapBadgeText}>Alt: 28 min · 78 Score</Text>
            </View>
          </View>

          <View style={styles.mapCaptionRow}>
            <MaterialIcons name="open-in-new" size={16} color={colors.accent} />
            <Text style={[styles.mapCaptionText, { color: colors.accent, fontWeight: '600' }]}>
              Tap to open live interactive GPS map with safe havens & dead zones
            </Text>
          </View>
        </Card>

        {/* Section Heading */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionTitle}>Available Routes</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Select a route scored by real-time safety metrics
          </Text>
        </View>

        {mockRoutes.length === 0 ? (
          <StateView
            kind="empty"
            title="No routes available"
            message="No verified safe routes found for this transit corridor."
          />
        ) : (
          mockRoutes.map((route: MockRoute, index: number) => {
          const isSelected = route.id === selectedRouteId;
          const isSafer = route.colorType === 'safer';

          return (
            <TouchableOpacity
              key={route.id}
              activeOpacity={0.88}
              onPress={() => setSelectedRouteId(route.id)}
              accessibilityRole="button"
              accessibilityLabel={`${route.name}, ${route.durationText}, ${route.distanceText}`}
            >
              <Card
                style={[
                  styles.routeCard,
                  isSelected && styles.routeCardSelected,
                ]}
                entranceDelay={index * 100}
              >
                {/* Top Row: Dot, Name, Tag & Score */}
                <View style={styles.routeCardTop}>
                  <View style={styles.routeNameGroup}>
                    <View
                      style={[
                        styles.routeDot,
                        isSafer ? styles.dotGreen : styles.dotOrange,
                      ]}
                    />
                    <Text style={styles.routeName}>{route.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.scorePill,
                      isSafer ? styles.scorePillSafer : styles.scorePillAlt,
                    ]}
                  >
                    <MaterialIcons
                      name={isSafer ? 'verified' : 'speed'}
                      size={14}
                      color={isSafer ? colors.safe : colors.moderate}
                    />
                    <Text
                      style={[
                        styles.scoreText,
                        isSafer ? styles.scoreTextSafer : styles.scoreTextAlt,
                      ]}
                    >
                      {route.safetyScore}/100
                    </Text>
                  </View>
                </View>

                {/* Tag */}
                <Text style={styles.routeTag}>{route.tag}</Text>

                {/* Duration & Distance Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
                    <Text style={styles.statTextBold}>{route.durationText}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <MaterialIcons name="straighten" size={16} color={colors.textSecondary} />
                    <Text style={styles.statText}>{route.distanceText}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <MaterialIcons name="wb-incandescent" size={16} color={colors.accent} />
                    <Text style={styles.statText}>
                      {isSafer ? '96% Lit' : '74% Lit'}
                    </Text>
                  </View>
                </View>

                {/* Summary */}
                <Text style={styles.routeSummary}>{route.summary}</Text>

                {/* Details link */}
                <TouchableOpacity
                  onPress={() => router.push('/route-details' as any)}
                  style={styles.detailsLink}
                  accessibilityRole="button"
                  accessibilityLabel="View route safety details"
                >
                  <Text style={styles.detailsLinkText}>View Route Safety Breakdown</Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
                </TouchableOpacity>
              </Card>
            </TouchableOpacity>
          );
        })
        )}

        {/* Action Button */}
        <View style={styles.actionsContainer}>
          <PrimaryButton
            variant="accent"
            label="Start Navigation"
            onPress={() => router.push('/(tabs)/map')}
            icon={<MaterialIcons name="navigation" size={20} color={colors.primaryDark} />}
            style={styles.navButton}
          />

          <TouchableOpacity
            onPress={() => router.push('/route-details' as any)}
            style={styles.fullDetailsButton}
            accessibilityRole="button"
            accessibilityLabel="View full safety report"
          >
            <MaterialIcons name="security" size={18} color={colors.primary} />
            <Text style={styles.fullDetailsText}>
              View {selectedRoute.name} Safety Report
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  backButton: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitleGroup: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },
  headerSpacer: {
    width: 36,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  /* Map Area Placeholder */
  mapCard: {
    padding: 10,
    marginBottom: 16,
  },
  mapArea: {
    height: 190,
    backgroundColor: '#E2E8F0',
    borderRadius: radius.card,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapGridLineH1: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  mapGridLineH2: {
    position: 'absolute',
    top: 130,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  mapGridLineV1: {
    position: 'absolute',
    left: 90,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#CBD5E1',
  },
  mapGridLineV2: {
    position: 'absolute',
    left: 190,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#CBD5E1',
  },

  /* Route 1: Safer Route (Green segments) */
  routeLineSafer1: {
    position: 'absolute',
    left: 30,
    top: 140,
    width: 110,
    height: 6,
    backgroundColor: colors.safe,
    borderRadius: 3,
    transform: [{ rotate: '-25deg' }],
  },
  routeLineSafer2: {
    position: 'absolute',
    left: 115,
    top: 85,
    width: 90,
    height: 6,
    backgroundColor: colors.safe,
    borderRadius: 3,
    transform: [{ rotate: '15deg' }],
  },
  routeLineSafer3: {
    position: 'absolute',
    left: 190,
    top: 60,
    width: 65,
    height: 6,
    backgroundColor: colors.safe,
    borderRadius: 3,
    transform: [{ rotate: '-35deg' }],
  },

  /* Route 2: Alternative Route (Orange segments) */
  routeLineAlt1: {
    position: 'absolute',
    left: 30,
    top: 140,
    width: 130,
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
    transform: [{ rotate: '18deg' }],
  },
  routeLineAlt2: {
    position: 'absolute',
    left: 145,
    top: 135,
    width: 115,
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },

  /* Markers */
  markerOrigin: {
    position: 'absolute',
    left: 14,
    top: 142,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  markerOriginDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  markerDest: {
    position: 'absolute',
    right: 14,
    top: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  markerLabelDest: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },

  /* Badges on Map */
  mapBadgeSafer: {
    position: 'absolute',
    left: 65,
    top: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapBadgeAlt: {
    position: 'absolute',
    left: 110,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mapCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  mapCaptionText: {
    fontSize: 11,
    color: colors.textMuted,
  },

  /* Section Title */
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Route Cards */
  routeCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeCardSelected: {
    borderColor: colors.accent,
    backgroundColor: '#FFFFFF',
  },
  routeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotGreen: {
    backgroundColor: colors.safe,
  },
  dotOrange: {
    backgroundColor: colors.accent,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  routeTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    marginLeft: 20,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  scorePillSafer: {
    backgroundColor: 'rgba(20, 107, 75, 0.1)',
  },
  scorePillAlt: {
    backgroundColor: 'rgba(212, 160, 23, 0.12)',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scoreTextSafer: {
    color: colors.safe,
  },
  scoreTextAlt: {
    color: colors.moderate,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTextBold: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  routeSummary: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 16,
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailsLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Action Buttons */
  actionsContainer: {
    marginTop: 8,
    gap: 10,
  },
  navButton: {
    height: 50,
  },
  fullDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.card,
    backgroundColor: colors.primarySoft,
  },
  fullDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
