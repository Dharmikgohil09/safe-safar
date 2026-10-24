import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import * as Location from 'expo-location';
import { Card, PrimaryButton } from '../../../components/ui';
import { LocationPickerModal } from '../../../components/LocationPickerModal';
import { colors, radius, spacing, typography } from '../../../theme';
import { LatLng } from '../../../types';
import { geocodingService } from '../../../services/geocodingService';
import {
  reportService,
  REPORT_CATEGORY_MAP,
  ReportCategory,
  ReportItem,
} from '../../../services/reportService';

export const REPORT_TYPES = [
  'Poor lighting',
  'Harassment',
  'Suspicious activity',
  'Road hazard',
  'Other',
] as const;

export type ReportType = typeof REPORT_TYPES[number];

export default function ReportScreen() {
  const [selectedType, setSelectedType] = useState<ReportType>('Poor lighting');
  const [note, setNote] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submittedReport, setSubmittedReport] = useState<ReportItem | null>(null);

  // Real location state
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [addressText, setAddressText] = useState<string>('');
  const [locationStatusText, setLocationStatusText] = useState<string>('Detecting device GPS...');
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  // Modal & submission state
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialDeviceLocation();
  }, []);

  const fetchInitialDeviceLocation = async () => {
    setIsLocating(true);
    setPermissionDenied(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setIsLocating(false);
        setLocationStatusText('Permission denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: LatLng = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setSelectedLocation(coords);

      try {
        const geoRes = await geocodingService.reverseGeocode(coords);
        if (geoRes && (geoRes.address || geoRes.name)) {
          setAddressText(geoRes.address || geoRes.name);
        } else {
          setAddressText(`Pinned location (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`);
        }
      } catch {
        setAddressText(`Pinned location (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`);
      }

      setLocationStatusText('GPS pinned coordinates');
    } catch (err: any) {
      setLocationStatusText('Could not detect GPS');
    } finally {
      setIsLocating(false);
    }
  };

  const handleLocationPicked = (loc: { latitude: number; longitude: number; address: string }) => {
    setSelectedLocation({ latitude: loc.latitude, longitude: loc.longitude });
    setAddressText(loc.address);
    setLocationStatusText('Custom pinned coordinates');
    setPermissionDenied(false);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!selectedLocation) {
      Alert.alert(
        'Location Required',
        'Please select a location on the map before submitting your report.',
        [{ text: 'Pick Location', onPress: () => setIsPickerOpen(true) }, { text: 'Cancel' }]
      );
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const category: ReportCategory = REPORT_CATEGORY_MAP[selectedType] || 'other';
      const result = await reportService.submitReport({
        category,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        description: note.trim(),
        address: addressText,
      });

      if (result && result.report) {
        setSubmittedReport(result.report);
      }
      setSubmitted(true);
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Could not submit report. Please check your network and try again.';
      setSubmitError(serverMsg);
      Alert.alert('Report Submission Failed', serverMsg);
    } finally {
      setIsSubmitting(false);
    }
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
          /* Real Success View (Atlas-persisted confirmation) */
          <Card style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <MaterialIcons name="check" size={48} color="#FFFFFF" />
            </View>

            <Text style={styles.successHeading}>Thanks, rating noted</Text>
            <Text style={styles.successText}>
              Your safety report has been recorded in the SafeSafar Atlas database to protect travellers.
            </Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Incident:</Text>
                <Text style={styles.summaryValue}>{selectedType}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Location:</Text>
                <Text style={styles.summaryValue}>{addressText || 'Pinned coordinates'}</Text>
              </View>
              {selectedLocation && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Coordinates:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
                  </Text>
                </View>
              )}
              {submittedReport?.status && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status:</Text>
                  <Text style={[styles.summaryValue, { color: colors.safe, textTransform: 'capitalize' }]}>
                    {submittedReport.status}
                  </Text>
                </View>
              )}
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
            {/* Dynamic Real Location Card */}
            <Card style={styles.locationCard}>
              <View style={styles.locationRow}>
                <View style={styles.locationIconCircle}>
                  <MaterialIcons
                    name={permissionDenied && !selectedLocation ? 'location-off' : 'location-on'}
                    size={24}
                    color={permissionDenied && !selectedLocation ? colors.danger : colors.accent}
                  />
                </View>

                <View style={styles.locationTextGroup}>
                  <Text style={styles.fieldSectionLabel}>LOCATION</Text>

                  {isLocating ? (
                    <View style={styles.detectingRow}>
                      <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />
                      <Text style={styles.detectingText}>Detecting device location...</Text>
                    </View>
                  ) : permissionDenied && !selectedLocation ? (
                    <>
                      <Text style={[styles.locationTitle, { color: colors.danger }]}>
                        Permission Denied
                      </Text>
                      <Text style={styles.locationSubtitle}>
                        GPS permission was denied. Tap "Change" to pick on map.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.locationTitle} numberOfLines={2}>
                        {addressText ||
                          (selectedLocation
                            ? `Pinned location (${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)})`
                            : 'No location selected')}
                      </Text>
                      <Text style={styles.locationSubtitle}>
                        {selectedLocation
                          ? `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)} • ${locationStatusText}`
                          : 'Please pick a spot on the map'}
                      </Text>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.changeLocationButton}
                  onPress={() => setIsPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Change location"
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="edit-location-alt" size={16} color={colors.primary} />
                  <Text style={styles.changeLocationButtonText}>Change</Text>
                </TouchableOpacity>
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
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={type}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
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
                placeholder="Describe what you saw (optional, max 500 characters)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
                accessibilityLabel="Describe what you saw"
              />
            </Card>

            {/* Submit Error Banner (if error occurred) */}
            {submitError && (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={20} color={colors.danger} style={{ marginRight: 8 }} />
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            )}

            {/* Submit Button */}
            <View style={styles.actionContainer}>
              <PrimaryButton
                label={isSubmitting ? 'Submitting to Atlas...' : 'Submit report'}
                onPress={handleSubmit}
                variant="accent"
                loading={isSubmitting}
                disabled={isSubmitting || (!selectedLocation && !isLocating)}
                icon={!isSubmitting ? <MaterialIcons name="send" size={20} color={colors.primaryDark} /> : undefined}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Full-screen Location Map Picker */}
      <LocationPickerModal
        visible={isPickerOpen}
        initialLocation={selectedLocation}
        onClose={() => setIsPickerOpen(false)}
        onConfirm={handleLocationPicked}
      />
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
    marginRight: 8,
  },
  fieldSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  locationSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  detectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detectingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  changeLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    gap: 4,
  },
  changeLocationButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
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
