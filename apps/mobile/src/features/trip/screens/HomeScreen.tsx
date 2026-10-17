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
import { Card, ShieldLogo } from '../../../components/ui';
import { colors, radius, typography } from '../../../theme';

export default function HomeScreen() {
  const showMessage = (feature: string) => {
    Alert.alert(feature, 'This feature will be connected during development.');
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerBrandGroup}>
            <ShieldLogo size={32} />
            <View style={styles.headerTitles}>
              <Text style={styles.brand}>SafeSafar</Text>
              <Text style={styles.subtitle}>Your safety, your journey.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/auth')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sign in or register"
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcome}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.description}>Stay safe, explore freely.</Text>
        </View>

        {/* SOS Card */}
        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => showMessage('SOS preview')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="SOS Emergency button"
        >
          <Text style={styles.sosTitle}>SOS</Text>
          <Text style={styles.sosSubtitle}>Emergency assistance preview</Text>
        </TouchableOpacity>

        {/* Safety Tools Section */}
        <Text style={styles.sectionTitle}>Your safety tools</Text>

        <View style={styles.cardsList}>
          {/* 1. Set up your safety profile */}
          <Card
            onPress={() => router.push('/onboarding')}
            style={styles.setupCard}
            accessibilityLabel="Set up your safety profile"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="shield" size={24} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.cardTitle}>Set up your safety profile</Text>
                <Text style={styles.cardDescription}>
                  Explore SafeSafar features and configure emergency permissions.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#438568" />
            </View>
          </Card>

          {/* 2. Plan a Safe Route */}
          <Card
            onPress={() => showMessage('Plan a Safe Route')}
            style={styles.toolCard}
            accessibilityLabel="Plan a Safe Route"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="map" size={24} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.cardTitle}>Plan a Safe Route</Text>
                <Text style={styles.cardDescription}>
                  Find a safer way to your destination.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#438568" />
            </View>
          </Card>

          {/* 3. Walk Me Home */}
          <Card
            onPress={() => showMessage('Walk Me Home')}
            style={styles.toolCard}
            accessibilityLabel="Walk Me Home"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="directions-walk" size={24} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.cardTitle}>Walk Me Home</Text>
                <Text style={styles.cardDescription}>
                  Stay connected while travelling.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#438568" />
            </View>
          </Card>

          {/* 4. Trusted Contacts */}
          <Card
            onPress={() => router.push('/contacts')}
            style={styles.toolCard}
            accessibilityLabel="Trusted Contacts"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="group" size={24} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.cardTitle}>Trusted Contacts</Text>
                <Text style={styles.cardDescription}>
                  Manage the people you rely on.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#438568" />
            </View>
          </Card>

          {/* 5. Report an unsafe location */}
          <Card
            onPress={() => showMessage('Report an Unsafe Location')}
            style={styles.reportCard}
            accessibilityLabel="Report an unsafe location"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircleReport}>
                <MaterialIcons name="flag" size={24} color={colors.primaryDark} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.cardTitle}>Report an unsafe location</Text>
                <Text style={styles.cardDescription}>
                  Help other travellers make informed decisions.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#438568" />
            </View>
          </Card>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Stay aware. Stay connected. Travel safely.
        </Text>
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
    padding: 22,
    paddingTop: 18,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerBrandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitles: {
    justifyContent: 'center',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signInButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#CBE0D4',
  },
  signInButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  welcome: {
    marginTop: 8,
    marginBottom: 22,
  },
  greeting: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  description: {
    fontSize: typography.body.fontSize,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: 6,
  },
  sosButton: {
    backgroundColor: colors.sosRed,
    borderRadius: radius.cardLarge,
    padding: 23,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 3,
    shadowColor: colors.sosRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  sosTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  sosSubtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  cardsList: {
    gap: 12,
  },
  setupCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1.5,
    padding: 16,
  },
  toolCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    padding: 16,
  },
  reportCard: {
    backgroundColor: colors.primarySoft,
    borderColor: '#CDE2D4',
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconCircleReport: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D8EADB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  cardDescription: {
    fontSize: typography.caption.fontSize,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 4,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    marginTop: 28,
  },
});
