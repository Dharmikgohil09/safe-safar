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
  DEFAULT_REPORT_TYPE,
  REPORT_TYPES,
  ReportType,
  SAMPLE_LOCATION,
} from '../mock/reportMock';

export default function ReportScreen() {
  const [selectedType, setSelectedType] = useState<ReportType>(DEFAULT_REPORT_TYPE);
  const [note, setNote] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = () => {
    setSubmitted(true);
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
          <Text style={styles.headerTitle}>Report an unsafe location</Text>
          <Text style={styles.headerSubtitle}>
            Help other travellers make informed decisions.
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {submitted ? (
          /* Success View */
          <Card style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <MaterialIcons name="check" size={48} color="#FFFFFF" />
            </View>

            <Text style={styles.successHeading}>Thanks for reporting</Text>
            <Text style={styles.successText}>
              Your report is saved for this demo only.
            </Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Incident:</Text>
                <Text style={styles.summaryValue}>{selectedType}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Location:</Text>
                <Text style={styles.summaryValue}>{SAMPLE_LOCATION}</Text>
              </View>
              {note.trim() ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Notes:</Text>
                  <Text style={styles.summaryValue}>{note.trim()}</Text>
                </View>
              ) : null}
            </View>

            <PrimaryButton
              label="Back to Home"
              onPress={() => router.back()}
              variant="primary"
              style={styles.backHomeButton}
            />
          </Card>
        ) : (
          /* Report Form View */
          <>
            {/* Location Row Card */}
            <Card style={styles.locationCard}>
              <View style={styles.locationRow}>
                <View style={styles.locationIconCircle}>
                  <MaterialIcons name="location-on" size={24} color={colors.accent} />
                </View>
                <View style={styles.locationTextGroup}>
                  <Text style={styles.fieldSectionLabel}>LOCATION</Text>
                  <Text style={styles.locationTitle}>{SAMPLE_LOCATION}</Text>
                  <Text style={styles.locationSubtitle}>GPS pinned coordinates</Text>
                </View>
              </View>
            </Card>

            {/* Incident Type Chips Section */}
            <Card style={styles.sectionCard}>
              <Text style={styles.fieldSectionLabel}>INCIDENT TYPE</Text>
              <Text style={styles.sectionHint}>
                Select the safety concern observed at this location
              </Text>
              <View style={styles.chipsContainer}>
                {REPORT_TYPES.map((type) => {
                  const isSelected = selectedType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setSelectedType(type)}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={type}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Note Field Card */}
            <Card style={styles.sectionCard}>
              <Text style={styles.fieldSectionLabel}>ADDITIONAL DETAILS</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Describe what you saw (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Describe what you saw (optional)"
              />
            </Card>

            {/* Submit Button */}
            <View style={styles.actionContainer}>
              <PrimaryButton
                label="Submit report"
                onPress={handleSubmit}
                variant="accent"
                icon={<MaterialIcons name="send" size={20} color={colors.primaryDark} />}
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
  locationCard: {
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationTextGroup: {
    flex: 1,
  },
  fieldSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    minHeight: 90,
    marginTop: 6,
  },
  actionContainer: {
    marginTop: 8,
  },
  successCard: {
    alignItems: 'center',
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.safe,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: colors.safe,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  successHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  backHomeButton: {
    width: '100%',
  },
});
