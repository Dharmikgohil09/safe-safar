import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Card, DarkHeader } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';

export default function AppSettingsScreen() {
  const [nightTheme, setNightTheme] = useState(false);
  const [useKilometres, setUseKilometres] = useState(true);
  const [offlineMaps, setOfflineMaps] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <DarkHeader
        title="App Settings"
        subtitle="Preferences & system configuration"
        leftSlot={
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>General Preferences</Text>
          <Text style={styles.sectionSubtitle}>
            Configure interface, navigation units, and offline caching
          </Text>
        </View>

        <Card style={styles.card}>
          {/* Night Theme */}
          <View style={styles.settingRow}>
            <View style={[styles.iconCircle, styles.iconBgSoft]}>
              <MaterialIcons name="dark-mode" size={20} color={colors.primary} />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.label}>Night theme</Text>
              <Text style={styles.subLabel}>Darker palette for low-light navigation</Text>
            </View>
            <Switch
              value={nightTheme}
              onValueChange={setNightTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={nightTheme ? '#FFFFFF' : '#FFFFFF'}
              accessibilityLabel="Night theme"
            />
          </View>

          <View style={styles.divider} />

          {/* Use Kilometres */}
          <View style={styles.settingRow}>
            <View style={[styles.iconCircle, styles.iconBgSoft]}>
              <MaterialIcons name="straighten" size={20} color={colors.primary} />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.label}>Use kilometres</Text>
              <Text style={styles.subLabel}>Display distances in km instead of miles</Text>
            </View>
            <Switch
              value={useKilometres}
              onValueChange={setUseKilometres}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={useKilometres ? '#FFFFFF' : '#FFFFFF'}
              accessibilityLabel="Use kilometres"
            />
          </View>

          <View style={styles.divider} />

          {/* Download Maps for Offline Use */}
          <View style={styles.settingRow}>
            <View style={[styles.iconCircle, styles.iconBgSoft]}>
              <MaterialIcons name="file-download" size={20} color={colors.primary} />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.label}>Download maps for offline use</Text>
              <Text style={styles.subLabel}>Cache route tiles for emergency offline navigation</Text>
            </View>
            <Switch
              value={offlineMaps}
              onValueChange={setOfflineMaps}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={offlineMaps ? '#FFFFFF' : '#FFFFFF'}
              accessibilityLabel="Download maps for offline use"
            />
          </View>
        </Card>

        {/* Notice Card */}
        <Card style={styles.noticeCard}>
          <MaterialIcons name="info-outline" size={18} color={colors.textMuted} />
          <Text style={styles.noticeText}>
            Settings are applied for your current session.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgSoft: {
    backgroundColor: colors.primarySoft,
  },
  textGroup: {
    flex: 1,
  },
  label: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  noticeText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    flex: 1,
  },
});
