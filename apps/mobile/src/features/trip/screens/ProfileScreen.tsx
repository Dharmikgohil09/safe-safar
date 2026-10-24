import React, { useState } from 'react';
import {
  Alert,
  Linking,
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
import { Card, StateView } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';
import { mockUser } from '../mock/mockData';

export default function ProfileScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const showMessage = (feature: string) => {
    Alert.alert(feature, 'This feature will be connected during development.');
  };

  const handleOpenNotifications = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Notifications', 'Open your phone settings and allow SafeSafar notifications.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={styles.headerSubtitle}>Safety Settings & Personal Account</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => setIsLoading((prev) => !prev)}
              style={styles.previewChip}
              accessibilityRole="button"
              accessibilityLabel="Preview states"
            >
              <Text style={styles.previewChipText}>
                {isLoading ? 'Loading' : 'Ready'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
          onPress={() => showMessage('Settings')}
            style={styles.settingsIconButton}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <MaterialIcons name="settings" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {isLoading ? (
          <StateView
            kind="loading"
            title="Loading profile"
            message="Fetching safety profile and credentials..."
          />
        ) : (
          <Card style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{mockUser.initials}</Text>
              </View>
              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{mockUser.name}</Text>
                  <MaterialIcons name="verified" size={18} color={colors.accent} />
                </View>
                <Text style={styles.userEmail}>{mockUser.email}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>SafeSafar Verified</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
            onPress={() => showMessage('Edit Profile')}
              style={styles.editButton}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <MaterialIcons name="edit" size={16} color={colors.primary} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Section 1: Safety & Emergency Network */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Safety & Guardians</Text>
          <Text style={styles.sectionSubtitle}>Manage critical alerts & emergency routes</Text>
        </View>

        <Card style={styles.menuCard}>
          {/* Safety Profile */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/onboarding')}
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="Safety Profile, review and update safety preferences"
          >
            <View style={[styles.menuIconCircle, styles.iconBgPrimary]}>
              <MaterialIcons name="verified-user" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuLabel}>Safety Profile</Text>
              <Text style={styles.menuSubLabel}>Review and customize safety preferences</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Trusted Contacts */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/contacts')}
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="Trusted Contacts, manage emergency circle"
          >
            <View style={[styles.menuIconCircle, styles.iconBgAccent]}>
              <MaterialIcons name="people" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuLabel}>Trusted Contacts</Text>
              <Text style={styles.menuSubLabel}>Manage emergency circle & guardian list</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Section 2: Preferences & System */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Preferences & Support</Text>
          <Text style={styles.sectionSubtitle}>System settings and help center</Text>
        </View>

        <Card style={styles.menuCard}>
          {/* App Settings */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/app-settings')}
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="App Settings"
          >
            <View style={[styles.menuIconCircle, styles.iconBgSoft]}>
              <MaterialIcons name="settings" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuLabel}>App Settings</Text>
              <Text style={styles.menuSubLabel}>Units, night theme, and offline maps</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Notifications */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenNotifications}
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <View style={[styles.menuIconCircle, styles.iconBgSoft]}>
              <MaterialIcons name="notifications-none" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuLabel}>Notifications</Text>
              <Text style={styles.menuSubLabel}>Safety alerts and SOS siren sound</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Battery Optimization */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/battery-prompt')}
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="Battery Optimization"
          >
            <View style={[styles.menuIconCircle, styles.iconBgSoft]}>
              <MaterialIcons name="battery-charging-full" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuLabel}>Battery Optimization</Text>
              <Text style={styles.menuSubLabel}>Keep SafeSafar running in background</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Trip Rating */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/trip-rating')}
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="Trip Rating"
          >
            <View style={[styles.menuIconCircle, styles.iconBgSoft]}>
              <MaterialIcons name="star-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuLabel}>Trip Rating</Text>
              <Text style={styles.menuSubLabel}>Rate your recent journey safety</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Help and Support */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showMessage('Help and Support')}
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="Help and Support"
          >
            <View style={[styles.menuIconCircle, styles.iconBgSoft]}>
              <MaterialIcons name="help-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuLabel}>Help and Support</Text>
              <Text style={styles.menuSubLabel}>FAQs, reporting issues, and emergency manual</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* About SafeSafar */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showMessage('About SafeSafar')}
            style={styles.menuRow}
            accessibilityRole="button"
            accessibilityLabel="About SafeSafar"
          >
            <View style={[styles.menuIconCircle, styles.iconBgSoft]}>
              <MaterialIcons name="info-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuLabel}>About SafeSafar</Text>
              <Text style={styles.menuSubLabel}>Version 1.0.0 · Privacy policy & terms</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Section 3: Logout */}
        <Card style={styles.logoutCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showMessage('Logout')}
            style={styles.logoutRow}
            accessibilityRole="button"
            accessibilityLabel="Log Out"
          >
            <View style={styles.logoutIconCircle}>
              <MaterialIcons name="logout" size={20} color={colors.danger} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.logoutLabel}>Log Out</Text>
              <Text style={styles.logoutSubLabel}>Securely disconnect your current session</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.danger} />
          </TouchableOpacity>
        </Card>

        {/* Brand Footnote */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>SafeSafar · Safer Travel, Brighter Futures</Text>
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
  headerTitleGroup: {
    flex: 1,
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
  settingsIconButton: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },

  /* Profile Card */
  profileCard: {
    padding: 16,
    marginBottom: 20,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(20, 107, 75, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.safe,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 14,
    borderRadius: radius.card,
    backgroundColor: colors.primarySoft,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Section Headers */
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

  /* Menu Cards */
  menuCard: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBgPrimary: {
    backgroundColor: 'rgba(20, 107, 75, 0.12)',
  },
  iconBgAccent: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  iconBgSoft: {
    backgroundColor: colors.primarySoft,
  },
  menuTextGroup: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuSubLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 50,
  },

  /* Logout */
  logoutCard: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(200, 63, 67, 0.2)',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(200, 63, 67, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  logoutSubLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Footer */
  footerNote: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerNoteText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
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
