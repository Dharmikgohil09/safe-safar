import React from 'react';
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
import { useAuth } from '../../../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout, isLoading: authLoading } = useAuth();

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

  const openHelp = () => {
    Alert.alert(
      'Help and Support',
      'Need help with SafeSafar? Call our customer care team on 8780888428. For an emergency, use the SOS button or call 112 immediately.',
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Call 8780888428', onPress: () => Linking.openURL('tel:8780888428').catch(() => { }) },
      ]
    );
  };

  const displayName = user?.name || 'SafeSafar User';
  const displayEmail = user?.email || (user?.phone ? `+91 ${user.phone}` : 'No email linked');
  const initials = (displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'SS').toUpperCase();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your SafeSafar account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/auth');
          } catch (err) {
            console.warn('[ProfileScreen] Logout error:', err);
            router.replace('/auth');
          }
        },
      },
    ]);
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
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {authLoading ? (
          <StateView
            kind="loading"
            title="Loading profile"
            message="Fetching safety profile and credentials..."
          />
        ) : (
          <Card style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{displayName}</Text>
                  <MaterialIcons name="verified" size={18} color={colors.accent} />
                </View>
                <Text style={styles.userEmail}>{displayEmail}</Text>
                {user?.phone && (
                  <Text style={[styles.userEmail, { marginTop: 2, color: colors.textSecondary }]}>
                    📞 +91 {user.phone}
                  </Text>
                )}
                <View style={styles.badgeRow}>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>
                      {user?.authProvider === 'google' ? 'Google Account' : 'SafeSafar Verified'}
                    </Text>
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
            onPress={openHelp}
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
        </Card>

        {/* Section 3: Logout */}
        <Card style={styles.logoutCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
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
});
