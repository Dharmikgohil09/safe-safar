import React, { useState } from 'react';
import {
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
import { Card, PrimaryButton } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';
import { BATTERY_BRANDS, BatteryBrand } from '../mock/batteryMock';

export default function BatteryPromptScreen() {
  const [selectedBrandId, setSelectedBrandId] = useState<string>('xiaomi');

  const currentBrand: BatteryBrand =
    BATTERY_BRANDS.find((b) => b.id === selectedBrandId) || BATTERY_BRANDS[0];

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
          <Text style={styles.headerTitle}>Keep SafeSafar running</Text>
          <Text style={styles.headerSubtitle}>Background battery settings</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Explanation Card */}
        <Card style={styles.explanationCard}>
          <View style={styles.explanationRow}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="battery-alert" size={24} color={colors.accent} />
            </View>
            <View style={styles.explanationTextGroup}>
              <Text style={styles.explanationTitle}>Background Protection</Text>
              <Text style={styles.explanationText}>
                Some phones stop background apps to save battery. Turn off battery restrictions so SafeSafar can keep your journey alive.
              </Text>
            </View>
          </View>
        </Card>

        {/* Brand Switcher Section */}
        <Text style={styles.sectionTitle}>SELECT YOUR DEVICE</Text>
        <View style={styles.brandTabsContainer}>
          {BATTERY_BRANDS.map((brand) => {
            const isSelected = selectedBrandId === brand.id;
            return (
              <TouchableOpacity
                key={brand.id}
                onPress={() => setSelectedBrandId(brand.id)}
                style={[
                  styles.brandTab,
                  isSelected && styles.brandTabSelected,
                ]}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={brand.name}
              >
                <Text
                  style={[
                    styles.brandTabText,
                    isSelected && styles.brandTabTextSelected,
                  ]}
                >
                  {brand.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Steps List */}
        <Text style={styles.sectionTitle}>OPTIMIZATION STEPS</Text>
        <View style={styles.stepsList}>
          {currentBrand.steps.map((step, index) => (
            <Card key={index} style={styles.stepCard} entranceDelay={index * 60}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Done Button */}
        <View style={styles.actionContainer}>
          <PrimaryButton
            label="Done"
            onPress={() => router.back()}
            variant="accent"
            icon={<MaterialIcons name="check" size={20} color={colors.primaryDark} />}
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
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerSpacer: {
    width: 36,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  explanationCard: {
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  explanationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  explanationTextGroup: {
    flex: 1,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  brandTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  brandTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandTabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  brandTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  brandTabTextSelected: {
    color: '#FFFFFF',
  },
  stepsList: {
    gap: 10,
    marginBottom: 24,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: 4,
  },
});
