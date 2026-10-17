import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Card } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';

export default function SosScreen() {
  const showMessage = (feature: string) => {
    Alert.alert(feature, 'This feature will be connected during development.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

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
          <Text style={styles.headerTitle}>Emergency SOS</Text>
          <Text style={styles.headerSubtitle}>24/7 Rapid Emergency Response</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Subtitle notice */}
        <View style={styles.noticeContainer}>
          <MaterialIcons name="security" size={18} color={colors.accent} />
          <Text style={styles.noticeText}>
            Emergency services and trusted guardians on standby
          </Text>
        </View>

        {/* SOS Center Circle */}
        <View style={styles.sosCenterWrapper}>
          <View style={styles.sosOuterRing}>
            <View style={styles.sosMiddleRing}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => showMessage('SOS preview')}
                style={styles.sosButton}
                accessibilityRole="button"
                accessibilityLabel="SOS Emergency Button, hold for 3 seconds"
              >
                <MaterialIcons name="warning" size={32} color="#FFFFFF" />
                <Text style={styles.sosText}>SOS</Text>
                <Text style={styles.sosHoldText}>Hold for 3 seconds</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Visual Slide to Trigger SOS bar */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => showMessage('SOS preview')}
          style={styles.sliderTrack}
          accessibilityRole="button"
          accessibilityLabel="Slide to Trigger SOS"
        >
          <View style={styles.sliderThumb}>
            <MaterialIcons name="double-arrow" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.sliderLabel}>Slide to Trigger SOS</Text>
        </TouchableOpacity>

        {/* "This will:" List Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>This will:</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <MaterialIcons name="near-me" size={16} color={colors.danger} />
              </View>
              <Text style={styles.infoRowText}>
                Transmit your exact live GPS location to all 3 trusted emergency guardians.
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <MaterialIcons name="local-police" size={16} color={colors.danger} />
              </View>
              <Text style={styles.infoRowText}>
                Dispatch priority emergency ping to nearest police PCR patrol & check-posts.
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <MaterialIcons name="volume-up" size={16} color={colors.danger} />
              </View>
              <Text style={styles.infoRowText}>
                Optionally emit high-decibel audible alarm and emergency screen strobe.
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <MaterialIcons name="emergency-share" size={16} color={colors.danger} />
              </View>
              <Text style={styles.infoRowText}>
                Keep location broadcast active until explicitly cancelled with your PIN.
              </Text>
            </View>
          </View>
        </Card>

        {/* Direct Helplines */}
        <View style={styles.helplinesRow}>
          <TouchableOpacity
            style={styles.helplineButton}
            onPress={() => showMessage('Call National Emergency 112')}
            accessibilityRole="button"
            accessibilityLabel="Call National Emergency 112"
          >
            <MaterialIcons name="phone" size={16} color="#FFFFFF" />
            <Text style={styles.helplineText}>Dial 112 (National SOS)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helplineButton}
            onPress={() => showMessage('Call Women Helpline 1091')}
            accessibilityRole="button"
            accessibilityLabel="Call Women Helpline 1091"
          >
            <MaterialIcons name="phone" size={16} color="#FFFFFF" />
            <Text style={styles.helplineText}>Dial 1091 (Women Help)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  header: {
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    alignItems: 'center',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginBottom: 24,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FDE68A',
  },

  /* SOS Circle Area */
  sosCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  sosOuterRing: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(200, 63, 67, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosMiddleRing: {
    width: 195,
    height: 195,
    borderRadius: 97.5,
    backgroundColor: 'rgba(200, 63, 67, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  sosText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 2,
  },
  sosHoldText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },

  /* Slide to Trigger Bar (Visual only) */
  sliderTrack: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginTop: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  sliderThumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  sliderLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  /* "This will:" Card */
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(51, 65, 85, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200, 63, 67, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoRowText: {
    flex: 1,
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },

  /* Helplines */
  helplinesRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  helplineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.card,
  },
  helplineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
