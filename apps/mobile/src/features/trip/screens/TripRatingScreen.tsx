import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Card, PrimaryButton } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';
import {
  RATING_OPTIONS,
  RatingOption,
} from '../mock/tripRatingMock';

export default function TripRatingScreen() {
  const [fromLocation, setFromLocation] = useState<string>('SVNIT');
  const [toLocation, setToLocation] = useState<string>('Adajan');
  const [selectedRating, setSelectedRating] = useState<RatingOption>('Felt safe');
  const [note, setNote] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const displayedSummary = `${fromLocation} to ${toLocation}`;

  const handleSaveRating = () => {
    setIsSaved(true);
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
          <Text style={styles.headerTitle}>How was your trip?</Text>
          <Text style={styles.headerSubtitle}>Help improve safe routing</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Sample Trip Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconCircle}>
              <MaterialIcons name="navigation" size={22} color={colors.accent} />
            </View>
            <View style={styles.summaryTextGroup}>
              <Text style={styles.summarySectionLabel}>COMPLETED TRIP</Text>
              <Text style={styles.summaryTitle}>{displayedSummary}</Text>
              <Text style={styles.summarySubtitle}>Safe route navigation ended</Text>
            </View>
          </View>

          <View style={styles.inputsRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>From</Text>
              <TextInput
                style={styles.summaryInput}
                value={fromLocation}
                onChangeText={setFromLocation}
                placeholder="From location"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="From location"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>To</Text>
              <TextInput
                style={styles.summaryInput}
                value={toLocation}
                onChangeText={setToLocation}
                placeholder="To location"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="To location"
              />
            </View>
          </View>
        </Card>

        {isSaved ? (
          /* Confirmation Message Card */
          <Card style={styles.confirmationCard}>
            <View style={styles.confirmIconCircle}>
              <MaterialIcons name="check-circle" size={40} color={colors.safe} />
            </View>
            <Text style={styles.confirmationTitle}>Thanks, rating noted for this demo.</Text>
            <Text style={styles.confirmationSubtitle}>
              Your feedback helps refine danger heatmaps and lighting corridors for the community.
            </Text>
            <PrimaryButton
              label="Back to Home"
              onPress={() => router.back()}
              variant="primary"
              style={styles.backButtonBottom}
            />
          </Card>
        ) : (
          /* Rating Form */
          <>
            {/* Rating Chips Section */}
            <Card style={styles.sectionCard}>
              <Text style={styles.fieldSectionLabel}>SAFETY RATING</Text>
              <Text style={styles.sectionHint}>How safe did you feel during this journey?</Text>
              <View style={styles.chipsContainer}>
                {RATING_OPTIONS.map((option) => {
                  const isSelected = selectedRating === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setSelectedRating(option)}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={option}
                    >
                      <MaterialIcons
                        name={
                          option === 'Felt safe'
                            ? 'sentiment-satisfied'
                            : option === 'Okay'
                            ? 'sentiment-neutral'
                            : 'sentiment-dissatisfied'
                        }
                        size={18}
                        color={isSelected ? '#FFFFFF' : colors.textSecondary}
                        style={styles.chipIcon}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Optional Note Field */}
            <Card style={styles.sectionCard}>
              <Text style={styles.fieldSectionLabel}>ADDITIONAL FEEDBACK</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Anything to add (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Anything to add (optional)"
              />
            </Card>

            {/* Save Rating Button */}
            <View style={styles.actionContainer}>
              <PrimaryButton
                label="Save rating"
                onPress={handleSaveRating}
                variant="accent"
                icon={<MaterialIcons name="star" size={20} color={colors.primaryDark} />}
              />
            </View>
          </>
        )}
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
  summaryCard: {
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTextGroup: {
    flex: 1,
  },
  summarySectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summarySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 80,
    marginTop: 6,
  },
  actionContainer: {
    marginTop: 8,
  },
  confirmationCard: {
    alignItems: 'center',
    padding: 24,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  backButtonBottom: {
    width: '100%',
  },
});
