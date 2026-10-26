import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Card, PrimaryButton, StateView, useReduceMotion } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';
import {
  DEFAULT_CHECK_IN_SECONDS,
  DEFAULT_DESTINATION,
} from '../mock/walkMeHomeMock';
import { useTripContacts, type TripContact } from '../storage/useTripContacts';
import { walkTelemetryService } from '../../../services/walkTelemetryService';

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function WalkMeHomeScreen() {
  const reduceMotion = useReduceMotion();
  const [destination, setDestination] = useState<string>(DEFAULT_DESTINATION);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(DEFAULT_CHECK_IN_SECONDS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasArrived, setHasArrived] = useState<boolean>(false);
  const [isMissed, setIsMissed] = useState<boolean>(false);

  const { contacts: initialContacts, loading } = useTripContacts();
  const [contacts, setContacts] = useState<TripContact[]>([]);

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  const progressAnim = useRef(new Animated.Value(1)).current;
  const sessionStartedRef = useRef<boolean>(false);

  // Countdown timer with cleanup on unmount
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsMissed(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, remainingSeconds]);

  const progress = remainingSeconds / DEFAULT_CHECK_IN_SECONDS;
  const isLowTime = progress < 0.25;
  const ringColor = isLowTime ? colors.accent : colors.primary;

  // Arc animation / static update respecting reduce-motion
  useEffect(() => {
    if (reduceMotion) {
      progressAnim.setValue(progress);
    } else {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 900,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [progress, reduceMotion, progressAnim]);

  const handleStartJourney = async () => {
    if (hasArrived || isMissed || isRunning) return;

    try {
      await walkTelemetryService.startWalkSession({
        destinationName: destination || 'Home',
        routeName: 'Walk Me Home Journey',
      });
      sessionStartedRef.current = true;
    } catch (err: any) {
      if (err?.message === 'Add a trusted contact first') {
        Alert.alert(
          'Add a trusted contact first',
          'Add someone in Trusted Contacts so they can receive your journey alerts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Trusted Contacts', onPress: () => router.push('/contacts') },
          ]
        );
        return;
      }
      console.warn('[WalkMeHome] startWalkSession error:', err);
    }

    setIsRunning(true);
    if (!reduceMotion) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Fallback for non-supporting platforms
      }
    }
  };

  const handleArrived = () => {
    setIsRunning(false);
    setHasArrived(true);
    if (sessionStartedRef.current) {
      walkTelemetryService.endWalkSession(true).catch((err) => {
        console.warn('[WalkMeHome] endWalkSession error:', err);
      });
      sessionStartedRef.current = false;
    }
    if (!reduceMotion) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Fallback for non-supporting platforms
      }
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setHasArrived(false);
    setIsMissed(false);
    setRemainingSeconds(DEFAULT_CHECK_IN_SECONDS);
    if (sessionStartedRef.current) {
      walkTelemetryService.endWalkSession(false).catch(() => {});
      sessionStartedRef.current = false;
    }
  };

  const toggleContact = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const selectedCount = contacts.filter((c) => c.selected).length;

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
          <Text style={styles.headerTitle}>Walk Me Home</Text>
          <Text style={styles.headerSubtitle}>Automated Guardian Check-In</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Destination Field */}
        <Card style={styles.destinationCard}>
          <View style={styles.destinationRow}>
            <View style={styles.locationIconBox}>
              <MaterialIcons name="place" size={22} color={colors.accent} />
            </View>
            <View style={styles.destinationInputGroup}>
              <Text style={styles.fieldLabel}>DESTINATION</Text>
              <TextInput
                style={styles.destinationInput}
                value={destination}
                onChangeText={setDestination}
                placeholder="Enter destination"
                placeholderTextColor={colors.textMuted}
                editable={!isRunning}
                accessibilityLabel="Destination"
              />
            </View>
          </View>
        </Card>

        {/* Circular Countdown Ring */}
        <View style={styles.circleOuterWrapper}>
          <View
            style={[
              styles.circleBaseTrack,
              { borderColor: isLowTime ? '#FEF3C7' : '#E2E8F0' },
            ]}
          >
            {/* View-based progress ring arc */}
            <Animated.View
              style={[
                styles.circleArc,
                {
                  borderColor: 'transparent',
                  borderTopColor: ringColor,
                  borderRightColor: progress > 0.25 ? ringColor : 'transparent',
                  borderBottomColor: progress > 0.5 ? ringColor : 'transparent',
                  borderLeftColor: progress > 0.75 ? ringColor : 'transparent',
                  transform: [
                    {
                      rotate: reduceMotion
                        ? '0deg'
                        : progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['-90deg', '270deg'],
                          }),
                    },
                  ],
                },
              ]}
            />

            {/* Inner Content */}
            <View style={styles.circleContent}>
              <MaterialIcons
                name="schedule"
                size={22}
                color={isLowTime ? colors.accent : colors.textMuted}
              />
              <Text
                style={[
                  styles.timerText,
                  isLowTime && { color: colors.accent },
                ]}
                accessibilityRole="timer"
                accessibilityLabel={`Remaining time: ${formatTime(remainingSeconds)}`}
              >
                {formatTime(remainingSeconds)}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: isLowTime ? '#FEF3C7' : colors.primarySoft },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: isLowTime ? colors.accent : colors.primaryDark },
                  ]}
                >
                  {hasArrived
                    ? 'Arrived'
                    : isMissed
                    ? 'Missed'
                    : isRunning
                    ? isLowTime
                      ? 'Low time'
                      : 'Walking'
                    : 'Check-in timer'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Safe Arrival Card */}
        {hasArrived && (
          <Card style={styles.arrivalCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.arrivalIconCircle}>
                <MaterialIcons name="check-circle" size={28} color={colors.safe} />
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.arrivalTitle}>Safe Arrival Confirmed</Text>
                <Text style={styles.arrivalDesc}>
                  You have arrived safely at {destination || 'your destination'}. Trusted contacts have been informed.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              accessibilityRole="button"
              accessibilityLabel="Reset walk demo"
            >
              <MaterialIcons name="replay" size={18} color={colors.primary} />
              <Text style={styles.resetButtonText}>Reset Walk Demo</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Missed Check-in Card */}
        {isMissed && !hasArrived && (
          <Card style={styles.missedCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.missedIconCircle}>
                <MaterialIcons name="error-outline" size={28} color={colors.danger} />
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.missedTitle}>Check-in missed (demo)</Text>
                <Text style={styles.missedDesc}>
                  In the real app, your trusted contacts would be alerted.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              accessibilityRole="button"
              accessibilityLabel="Reset walk demo"
            >
              <MaterialIcons name="replay" size={18} color={colors.primary} />
              <Text style={styles.resetButtonText}>Reset Walk Demo</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Controls */}
        {!hasArrived && !isMissed && (
          <View style={styles.controlsSection}>
            {!isRunning && (
              <PrimaryButton
                variant="accent"
                label="Start journey"
                onPress={handleStartJourney}
                icon={<MaterialIcons name="directions-walk" size={20} color={colors.primaryDark} />}
              />
            )}
            {isRunning && (
              <TouchableOpacity
                style={[styles.outlineButton, { borderColor: colors.accent, marginBottom: spacing.sm }]}
                onPress={() => walkTelemetryService.shareTrackingLink()}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Share Live Tracking Link"
              >
                <MaterialIcons name="share" size={20} color={colors.accent} />
                <Text style={[styles.outlineButtonText, { color: colors.accent }]}>Share Live Tracking Link</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.outlineButton, !isRunning && styles.outlineButtonSecondary]}
              onPress={handleArrived}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="I have arrived"
            >
              <MaterialIcons name="check-circle" size={22} color={colors.primary} />
              <Text style={styles.outlineButtonText}>I have arrived</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Contact Picker Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Trusted Contacts</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{selectedCount} Selected</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            These contacts will be alerted if you do not check in before the timer expires
          </Text>
        </View>

        {loading ? (
          <StateView
            kind="loading"
            title="Loading contacts"
            message="Retrieving your trusted contacts..."
          />
        ) : contacts.length === 0 ? (
          <StateView
            kind="empty"
            title="No trusted contacts yet"
            message="Add contacts in Trusted Contacts to share your location."
          />
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact, index) => {
              const isChecked = contact.selected;

              return (
                <TouchableOpacity
                  key={contact.id}
                  activeOpacity={0.8}
                  onPress={() => toggleContact(contact.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={`${contact.name}, ${isChecked ? 'selected' : 'unselected'}`}
                >
                  <Card
                    style={[
                      styles.contactCard,
                      isChecked && styles.contactCardChecked,
                    ]}
                    entranceDelay={index * 60}
                  >
                    <View style={styles.checkboxContainer}>
                      <MaterialIcons
                        name={isChecked ? 'check-box' : 'check-box-outline-blank'}
                        size={24}
                        color={isChecked ? colors.accent : colors.textMuted}
                      />
                    </View>

                    <View style={styles.contactAvatar}>
                      <Text style={styles.avatarInitials}>
                        {contact.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.contactInfo}>
                      <View style={styles.contactTopRow}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <View style={styles.relPill}>
                          <Text style={styles.relPillText}>Trusted</Text>
                        </View>
                      </View>
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
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
  destinationCard: {
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destinationInputGroup: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  destinationInput: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    padding: 0,
  },
  circleOuterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  circleBaseTrack: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  circleArc: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 8,
  },
  circleContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  controlsSection: {
    marginVertical: 14,
    gap: 10,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  outlineButtonSecondary: {
    borderColor: colors.border,
    backgroundColor: '#F8FAFC',
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  arrivalCard: {
    padding: 16,
    marginVertical: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  missedCard: {
    padding: 16,
    marginVertical: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrivalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  missedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextGroup: {
    flex: 1,
  },
  arrivalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.safe,
    marginBottom: 4,
  },
  arrivalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  missedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.danger,
    marginBottom: 4,
  },
  missedDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  badgeCount: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.pill,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  contactsList: {
    gap: 8,
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactCardChecked: {
    borderColor: colors.accent,
    backgroundColor: '#FFFDF9',
  },
  checkboxContainer: {
    marginRight: 10,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  relPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  relPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  contactPhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
