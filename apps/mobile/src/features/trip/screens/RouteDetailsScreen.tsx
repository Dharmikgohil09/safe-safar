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
import { mockRoutes, mockSafetyFactors, MockSafetyFactor, MockRouteInsight } from '../mock/mockData';

export default function RouteDetailsScreen() {
  const routeData = mockRoutes[0]; // Primary "Safer Route"
  const [previewStatus, setPreviewStatus] = useState<'ready' | 'loading' | 'empty' | 'error'>('ready');

  const cyclePreviewStatus = () => {
    setPreviewStatus((prev) => {
      if (prev === 'ready') return 'loading';
      if (prev === 'loading') return 'empty';
      if (prev === 'empty') return 'error';
      return 'ready';
    });
  };

  const showMessage = (feature: string) => {
    Alert.alert(feature, 'This feature will be connected during development.');
  };

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
          <Text style={styles.headerTitle}>Route Details</Text>
          <Text style={styles.headerSubtitle}>Safety Breakdown & Analysis</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Main Heading Card */}
        <Card style={styles.mainCard}>
          <View style={styles.headingRow}>
            <View>
              <Text style={styles.mainHeading}>25 min (8.4 km)</Text>
              <Text style={styles.subHeading}>{routeData.summary}</Text>
            </View>
            <View style={styles.saferPill}>
              <MaterialIcons name="verified-user" size={14} color="#FFFFFF" />
              <Text style={styles.saferPillText}>Safer Route</Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreNumber}>94</Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
            <View style={styles.scoreTextGroup}>
              <Text style={styles.scoreTitle}>High Safety Rating</Text>
              <Text style={styles.scoreSubtitle}>
                Verified via municipal lighting & safe pedestrian zones
              </Text>
            </View>
          </View>
        </Card>

        {/* Row of Safety Factor Icons */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Safety Factors</Text>
          <Text style={styles.sectionSubtitle}>5 verified factors evaluated en route</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.factorsScroll}
        >
          {mockSafetyFactors.map((factor: MockSafetyFactor) => (
            <Card key={factor.id} style={styles.factorCard}>
              <View style={styles.factorIconCircle}>
                <MaterialIcons
                  name={factor.icon as any}
                  size={22}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.factorTitle} numberOfLines={1}>
                {factor.title}
              </Text>
              <Text style={styles.factorRating} numberOfLines={2}>
                {factor.ratingText}
              </Text>
            </Card>
          ))}
        </ScrollView>

        {/* Route Map Preview Placeholder Card */}
        <Card style={styles.mapPreviewCard}>
          <View style={styles.mapPreviewHeader}>
            <MaterialIcons name="map" size={18} color={colors.primary} />
            <Text style={styles.mapPreviewTitle}>Route Map Preview</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live Overlay</Text>
            </View>
          </View>

          <View style={styles.mapCanvas}>
            {/* Visual map roads */}
            <View style={styles.roadH} />
            <View style={styles.roadV} />
            <View style={styles.roadDiagonal} />

            {/* Glowing route line */}
            <View style={styles.previewRouteLine} />

            {/* Simulated checkpoint markers */}
            <View style={styles.checkpoint1}>
              <MaterialIcons name="local-police" size={14} color={colors.safe} />
              <Text style={styles.checkpointText}>Outpost 1</Text>
            </View>
            <View style={styles.checkpoint2}>
              <MaterialIcons name="local-hospital" size={14} color={colors.safe} />
              <Text style={styles.checkpointText}>Civil Shelter</Text>
            </View>
          </View>

          <Text style={styles.mapPreviewFooter}>
            Full turn-by-turn navigation available upon start.
          </Text>
        </Card>

        {/* Safety Insights List from mockData */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionTitle}>Safety Insights</Text>
            {__DEV__ && (
              <TouchableOpacity
                onPress={cyclePreviewStatus}
                style={styles.previewChip}
                accessibilityRole="button"
                accessibilityLabel="Preview states"
              >
                <Text style={styles.previewChipText}>Preview: {previewStatus}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>
            Tap any insight for verified corridor intelligence
          </Text>
        </View>

        {previewStatus === 'loading' ? (
          <StateView
            kind="loading"
            title="Analyzing route intelligence"
            message="Aggregating crowd reports, camera coverage, and lighting data..."
          />
        ) : previewStatus === 'empty' ? (
          <StateView
            kind="empty"
            title="No insights available"
            message="No specific incident reports or advisories for this route segment."
          />
        ) : previewStatus === 'error' ? (
          <StateView
            kind="error"
            title="Failed to load safety insights"
            message="Could not connect to the route intelligence feed. Please retry."
            actionLabel="Retry"
            onAction={() => setPreviewStatus('ready')}
          />
        ) : (
          <View style={styles.insightsList}>
            {routeData.insights.map((insight: MockRouteInsight) => {
            const isWarning = insight.type === 'warning';
            const isInfo = insight.type === 'info';

            const iconColor = isWarning
              ? colors.danger
              : isInfo
              ? colors.primary
              : colors.safe;

            const iconBg = isWarning
              ? 'rgba(200, 63, 67, 0.1)'
              : isInfo
              ? colors.primarySoft
              : 'rgba(20, 107, 75, 0.1)';

            return (
              <TouchableOpacity
                key={insight.id}
                activeOpacity={0.7}
                onPress={() => showMessage(insight.text)}
                accessibilityRole="button"
                accessibilityLabel={insight.text}
              >
                <Card style={styles.insightCard}>
                  <View style={[styles.insightIconCircle, { backgroundColor: iconBg }]}>
                    <MaterialIcons
                      name={insight.icon as any}
                      size={20}
                      color={iconColor}
                    />
                  </View>
                  <Text style={styles.insightText}>{insight.text}</Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textMuted}
                  />
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
        )}

        {/* Start Guided Navigation Button */}
        <View style={styles.actionContainer}>
          <PrimaryButton
            variant="accent"
            label="Start Guided Navigation"
            onPress={() => showMessage('Start Guided Navigation')}
            icon={<MaterialIcons name="navigation" size={20} color={colors.primaryDark} />}
            style={styles.navButton}
          />
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

  /* Main Card */
  mainCard: {
    padding: 18,
    marginBottom: 16,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  mainHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subHeading: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saferPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.safe,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  saferPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: 12,
    gap: 12,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(20, 107, 75, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.safe,
  },
  scoreOutOf: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.safe,
    marginLeft: 2,
  },
  scoreTextGroup: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scoreSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Section Header */
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Safety Factors Horizontal Scroll */
  factorsScroll: {
    gap: 10,
    paddingBottom: 6,
    marginBottom: 16,
  },
  factorCard: {
    width: 135,
    padding: 12,
    alignItems: 'center',
    textAlign: 'center',
  },
  factorIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  factorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  factorRating: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },

  /* Route Map Preview Placeholder */
  mapPreviewCard: {
    padding: 14,
    marginBottom: 16,
  },
  mapPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mapPreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 6,
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(20, 107, 75, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.safe,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.safe,
  },
  mapCanvas: {
    height: 150,
    backgroundColor: '#E2E8F0',
    borderRadius: radius.card,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  roadH: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#CBD5E1',
  },
  roadV: {
    position: 'absolute',
    left: 120,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: '#CBD5E1',
  },
  roadDiagonal: {
    position: 'absolute',
    left: 20,
    top: 40,
    width: 220,
    height: 6,
    backgroundColor: '#CBD5E1',
    transform: [{ rotate: '30deg' }],
  },
  previewRouteLine: {
    position: 'absolute',
    left: 40,
    top: 80,
    width: 200,
    height: 6,
    backgroundColor: colors.safe,
    borderRadius: 3,
    transform: [{ rotate: '-25deg' }],
  },
  checkpoint1: {
    position: 'absolute',
    left: 70,
    top: 45,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    elevation: 2,
  },
  checkpoint2: {
    position: 'absolute',
    right: 40,
    bottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    elevation: 2,
  },
  checkpointText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mapPreviewFooter: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },

  /* Safety Insights */
  insightsList: {
    gap: 8,
    marginBottom: 20,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  insightIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 18,
  },

  /* Action */
  actionContainer: {
    marginBottom: 10,
  },
  navButton: {
    height: 50,
  },
  previewChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  previewChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
});
