import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { RouteOption } from '../types';
import { getRouteColor, getSafetyTier } from '../models/RouteOption';
import { formatDistance, formatDuration } from '../utils/geo';
import { SafetyBadge } from './SafetyBadge';

interface RouteDetailModalProps {
  route: RouteOption | null;
  visible: boolean;
  onClose: () => void;
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({ route, visible, onClose }) => {
  if (!route) return null;

  const tier = getSafetyTier(route.safetyScore);
  const routeColor = getRouteColor(tier);
  const factors = route.safetyFactors;

  const handleStartWalk = () => {
    onClose();
    Alert.alert(
      'Walk Me Home Activated',
      `Trip navigation initiated via ${route.name}. Sharing live telemetry with trusted contacts.`
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Drag Handle */}
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Header: Name + Badge */}
            <View style={styles.headerRow}>
              <View style={styles.titleCol}>
                <Text style={styles.routeName}>{route.name}</Text>
                <Text style={styles.routeMetrics}>
                  {formatDuration(route.durationSeconds)} ({formatDistance(route.distanceMeters)})
                </Text>
              </View>
              <SafetyBadge score={route.safetyScore} tier={tier} />
            </View>

            <View style={styles.divider} />

            {/* Plain Language Explanation Box */}
            <View style={[styles.explanationBox, { backgroundColor: routeColor + '15', borderColor: routeColor + '40' }]}>
              <Text style={styles.shieldIcon}>🛡️</Text>
              <Text style={styles.explanationText}>{route.explanation}</Text>
            </View>

            {/* Metrics Breakdown */}
            <Text style={styles.sectionHeader}>SAFETY METRICS BREAKDOWN</Text>

            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricIcon}>💡</Text>
                <Text style={styles.metricName}>Street Illumination</Text>
                <Text style={[styles.metricScore, { color: '#F57F17' }]}>{factors.lightingScore}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, Math.max(0, factors.lightingScore))}%`, backgroundColor: '#F57F17' },
                  ]}
                />
              </View>
            </View>

            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricIcon}>👮</Text>
                <Text style={styles.metricName}>Police Post Proximity</Text>
                <Text style={[styles.metricScore, { color: '#1E88E5' }]}>{factors.policeProximityScore}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, factors.policeProximityScore))}%`,
                      backgroundColor: '#1E88E5',
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricIcon}>✅</Text>
                <Text style={styles.metricName}>Incident-Free Index</Text>
                <Text style={[styles.metricScore, { color: '#43A047' }]}>{factors.incidentDecayScore}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, factors.incidentDecayScore))}%`,
                      backgroundColor: '#43A047',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Active Hazards */}
            {route.dangerAlerts.length > 0 && (
              <View style={styles.hazardsContainer}>
                <Text style={styles.hazardsHeader}>ACTIVE HAZARDS ALONG ROUTE</Text>
                {route.dangerAlerts.map((alert, idx) => (
                  <View key={idx} style={styles.hazardRow}>
                    <Text style={styles.hazardIcon}>⚠️</Text>
                    <Text style={styles.hazardText}>{alert}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.startWalkButton, { backgroundColor: routeColor }]}
              onPress={handleStartWalk}
              activeOpacity={0.8}
            >
              <Text style={styles.walkIcon}>🚶</Text>
              <Text style={styles.startWalkText}>Start Walk Me Home on this Route</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  titleCol: {
    flex: 1,
    paddingRight: 12,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#212121',
  },
  routeMetrics: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 14,
  },
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  shieldIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  explanationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#212121',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#9E9E9E',
    marginBottom: 12,
  },
  metricItem: {
    marginBottom: 12,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  metricName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    flex: 1,
  },
  metricScore: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  hazardsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  hazardsHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#D32F2F',
    marginBottom: 8,
  },
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  hazardIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  hazardText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#424242',
    flex: 1,
  },
  startWalkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  walkIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  startWalkText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  closeText: {
    color: '#757575',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
