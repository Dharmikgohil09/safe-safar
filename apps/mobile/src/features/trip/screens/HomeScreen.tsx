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
import { Card, DarkHeader, PrimaryButton, ShieldLogo } from '../../../components/ui';
import { colors, radius, typography } from '../../../theme';

export default function HomeScreen() {
  const showMessage = (feature: string) => {
    Alert.alert(feature, 'This feature will be connected during development.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* DarkHeader with brand, tagline, logo, bell, and avatar */}
      <DarkHeader
        title="SafeSafar"
        subtitle="Safer routes. Brighter journeys."
        leftSlot={<ShieldLogo size={24} />}
        rightSlot={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => showMessage('Notifications')}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <MaterialIcons name="notifications-none" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/auth')}
              style={styles.avatarCircle}
              accessibilityRole="button"
              accessibilityLabel="User profile or sign in"
            >
              <Text style={styles.avatarText}>HB</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Slate Greeting Card */}
        <Card style={styles.greetingCard}>
          <View style={styles.greetingContent}>
            <Text style={styles.greetingTitle}>Hi there!</Text>
            <Text style={styles.greetingSubtitle}>Travel safer, every day.</Text>
          </View>
          <View style={styles.shieldBadge}>
            <MaterialIcons name="verified-user" size={22} color={colors.accent} />
          </View>
        </Card>

        {/* Plan a Safe Route Card */}
        <Card style={styles.planRouteCard}>
          <View style={styles.planRouteHeader}>
            <MaterialIcons name="map" size={22} color={colors.primary} />
            <Text style={styles.planRouteTitle}>Plan a Safe Route</Text>
          </View>
          <Text style={styles.planRouteSubtitle}>
            Find streets scored by lighting, landmarks, and real-time safety.
          </Text>

          {/* Presentational input fields */}
          <View style={styles.inputsWrapper}>
            <View style={styles.inputRow}>
              <MaterialIcons name="my-location" size={20} color={colors.accent} />
              <Text style={styles.inputText}>Your Current Location</Text>
            </View>
            <View style={styles.inputDivider} />
            <View style={styles.inputRow}>
              <MaterialIcons name="place" size={20} color={colors.danger} />
              <Text style={styles.inputText}>Choose Destination</Text>
            </View>
          </View>

          <PrimaryButton
            variant="accent"
            label="Find Safe Route"
            onPress={() => showMessage('Plan a Safe Route')}
            icon={<MaterialIcons name="search" size={20} color={colors.primaryDark} />}
            style={styles.findRouteButton}
          />
        </Card>

        {/* Two Tiles Side by Side: Emergency SOS & Share Live Location */}
        <View style={styles.tilesRow}>
          {/* Tile 1: Emergency SOS */}
          <Card
            onPress={() => showMessage('SOS preview')}
            style={styles.sosTile}
            accessibilityLabel="Emergency SOS"
          >
            <View style={styles.sosIconCircle}>
              <MaterialIcons name="warning" size={26} color={colors.sosRed} />
            </View>
            <Text style={styles.tileTitle}>Emergency SOS</Text>
            <Text style={styles.tileSubtitle}>Instant 4-channel alert</Text>
          </Card>

          {/* Tile 2: Share Live Location */}
          <Card
            onPress={() => showMessage('Walk Me Home')}
            style={styles.shareTile}
            accessibilityLabel="Share Live Location"
          >
            <View style={styles.shareIconCircle}>
              <MaterialIcons name="directions-walk" size={26} color={colors.accent} />
            </View>
            <Text style={styles.tileTitle}>Share Live Location</Text>
            <Text style={styles.tileSubtitle}>Walk Me Home tracking</Text>
          </Card>
        </View>

        {/* Section: Explore SafeSafar */}
        <Text style={styles.sectionTitle}>Explore SafeSafar</Text>
        <View style={styles.exploreList}>
          {/* Card 1: Complete your Safety Profile */}
          <Card
            onPress={() => router.push('/onboarding')}
            style={styles.exploreCard}
            accessibilityLabel="Complete your Safety Profile"
          >
            <View style={styles.exploreCardInner}>
              <View style={styles.exploreIconCircle}>
                <MaterialIcons name="shield" size={22} color={colors.primary} />
              </View>
              <View style={styles.exploreTextGroup}>
                <Text style={styles.exploreCardTitle}>Complete your Safety Profile</Text>
                <Text style={styles.exploreCardDesc}>
                  Configure automated countdowns and hardware safety permissions.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
            </View>
          </Card>

          {/* Card 2: Trusted Contacts */}
          <Card
            onPress={() => router.push('/contacts')}
            style={styles.exploreCard}
            accessibilityLabel="Trusted Contacts"
          >
            <View style={styles.exploreCardInner}>
              <View style={styles.exploreIconCircle}>
                <MaterialIcons name="group" size={22} color={colors.primary} />
              </View>
              <View style={styles.exploreTextGroup}>
                <Text style={styles.exploreCardTitle}>Trusted Contacts</Text>
                <Text style={styles.exploreCardDesc}>
                  Manage the guardian network alerted when you need assistance.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
            </View>
          </Card>

          {/* Card 3: Learn How It Works */}
          <Card
            onPress={() => showMessage('Report an Unsafe Location')}
            style={styles.exploreCard}
            accessibilityLabel="Learn How It Works"
          >
            <View style={styles.exploreCardInner}>
              <View style={styles.exploreIconCircle}>
                <MaterialIcons name="info-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.exploreTextGroup}>
                <Text style={styles.exploreCardTitle}>Learn How It Works</Text>
                <Text style={styles.exploreCardDesc}>
                  Discover real-time hazard decay and safety-scored routing.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
            </View>
          </Card>
        </View>

        {/* Footer Sign In Row */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/auth')}
            accessibilityRole="button"
            accessibilityLabel="Sign in or register"
          >
            <Text style={styles.footerLink}>Sign In</Text>
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
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  /* Greeting Slate Card */
  greetingCard: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    marginBottom: 16,
  },
  greetingContent: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  shieldBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Plan Route Card */
  planRouteCard: {
    padding: 18,
    marginBottom: 16,
  },
  planRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planRouteTitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  planRouteSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  inputsWrapper: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },
  inputText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  findRouteButton: {
    height: 48,
  },

  /* Quick Action Tiles */
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  sosTile: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    padding: 16,
    alignItems: 'flex-start',
  },
  sosIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shareTile: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    padding: 16,
    alignItems: 'flex-start',
  },
  shareIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tileSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  /* Explore Section */
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  exploreList: {
    gap: 10,
    marginBottom: 24,
  },
  exploreCard: {
    padding: 14,
  },
  exploreCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exploreIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreTextGroup: {
    flex: 1,
  },
  exploreCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  exploreCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  /* Footer */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
});
