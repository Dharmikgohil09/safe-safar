import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Card, PrimaryButton, StateView, useReduceMotion } from '../../../components/ui';
import { colors, radius, typography } from '../../../theme';
import { apiFetch } from '../../../lib/api';
import { getAccessToken } from '../../../services/api';
import { authService } from '../auth/services/authService';
import { tripLocationPublisher } from '../../../services/tripLocationPublisher';
import {
  DEFAULT_CHECK_IN_SECONDS,
  DEFAULT_DESTINATION,
} from '../mock/walkMeHomeMock';
import { useTripContacts, type TripContact } from '../storage/useTripContacts';

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
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [hasArrived, setHasArrived] = useState<boolean>(false);
  const [isMissed, setIsMissed] = useState<boolean>(false);
  const { contacts, loading } = useTripContacts();
  const [selectedContactIds, setSelectedContactIds] = useState<Record<string, boolean>>({});
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeTripToken, setActiveTripToken] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    contacts.forEach((c) => {
      initial[c.id] = true;
    });
    setSelectedContactIds(initial);
  }, [contacts]);

  const progressAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer with cleanup on unmount
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsMissed(true);
            tripLocationPublisher.stopPublishing();
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

  // Cleanup GPS publisher on unmount
  useEffect(() => {
    return () => {
      tripLocationPublisher.stopPublishing();
    };
  }, []);

  const handleStartJourney = async () => {
    if (isRunning || isStarting || hasArrived || isMissed) return;
    setIsStarting(true);

    if (!reduceMotion) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Fallback for non-supporting platforms
      }
    }

    try {
      // 1. Check user authentication using current access token mechanism
      const token = (await getAccessToken()) || (await authService.getSession())?.token;
      if (!token) {
        setIsStarting(false);
        Alert.alert(
          'Sign-in Required',
          'Please sign in to your SafeSafar account before starting a protected Walk Me Home journey.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.push('/(auth)/login' as any) },
          ]
        );
        return;
      }

      // 2. Request & verify location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsStarting(false);
        Alert.alert(
          'Location Permission Required',
          'SafeSafar needs location access to broadcast your live GPS journey to your trusted guardians.'
        );
        return;
      }

      // 3. Acquire current device coordinates
      let loc: Location.LocationObject;
      try {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch (locErr: any) {
        setIsStarting(false);
        Alert.alert(
          'GPS Location Error',
          'Could not retrieve your current location. Please verify that GPS/Location is turned on.'
        );
        return;
      }

      const originCoords = [loc.coords.longitude, loc.coords.latitude];

      // 4. Create trip on backend
      let res;
      try {
        res = await apiFetch('/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: {
              address: 'Current Location',
              coordinates: originCoords,
            },
            destination: {
              address: destination?.trim() || 'Home',
              coordinates: [originCoords[0] + 0.005, originCoords[1] + 0.005],
            },
            estimatedDurationMinutes: Math.max(1, Math.ceil(remainingSeconds / 60)),
            emergencyContactIds: contacts
              .filter((c) => selectedContactIds[c.id])
              .map((c) => c.id)
              .filter((id) => /^[0-9a-fA-F]{24}$/.test(id)),
          }),
        });
      } catch (netErr: any) {
        setIsStarting(false);
        Alert.alert(
          'Network Connection Error',
          'Could not connect to SafeSafar server. Please check your internet connection and try again.'
        );
        return;
      }

      if (!res.ok) {
        setIsStarting(false);
        let errorMsg = 'Failed to create journey on server.';
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch {}
        Alert.alert('Trip Creation Failed', errorMsg);
        return;
      }

      const json = await res.json();
      const trip = json.data;

      if (!trip?.tripId || !trip?.trackingToken) {
        setIsStarting(false);
        Alert.alert('Server Error', 'Received invalid session token from SafeSafar server.');
        return;
      }

      // 5. Start live location publisher
      const pubResult = await tripLocationPublisher.startPublishing({
        tripId: trip.tripId,
        trackingToken: trip.trackingToken,
        authToken: token,
      });

      if (!pubResult.success) {
        setIsStarting(false);
        Alert.alert('Live Tracking Warning', pubResult.error || 'Failed to start GPS broadcast.');
        return;
      }

      // 6. Successfully activated!
      setActiveTripId(trip.tripId);
      setActiveTripToken(trip.trackingToken);
      setIsStarting(false);
      setIsRunning(true);
    } catch (err: any) {
      setIsStarting(false);
      console.warn('[WalkMeHome] Unexpected error starting journey:', err);
      Alert.alert('Unexpected Error', err.message || 'An unexpected error occurred while starting your journey.');
    }
  };

  const handleArrived = async () => {
    setIsRunning(false);
    setHasArrived(true);
    await tripLocationPublisher.stopPublishing();

    if (activeTripId) {
      try {
        await apiFetch(`/trips/${activeTripId}/arrived`, { method: 'POST' });
      } catch {
        // Ignore network errors on arrive
      }
    }

    if (!reduceMotion) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Fallback for non-supporting platforms
      }
    }
  };

  const handleReset = async () => {
    setIsRunning(false);
    setHasArrived(false);
    setIsMissed(false);
    setRemainingSeconds(DEFAULT_CHECK_IN_SECONDS);
    await tripLocationPublisher.stopPublishing();
    setActiveTripId(null);
    setActiveTripToken(null);
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const selectedCount = contacts.filter((c) => selectedContactIds[c.id]).length;

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

        {/* Active Live Tracking Card with Guardian Link */}
        {isRunning && activeTripToken && (
          <Card style={styles.trackingLinkCard}>
            <View style={styles.trackingLinkHeader}>
              <View style={styles.pulseDot} />
              <Text style={styles.trackingLinkTitle}>Live Guardian Tracking Active</Text>
            </View>
            <Text style={styles.trackingLinkSubtitle}>
              Your live GPS journey is broadcasting to the Live Guardian Tracker.
            </Text>
            <View style={styles.trackingLinkActions}>
              <TouchableOpacity
                style={styles.openTrackerButton}
                onPress={() => {
                  const base = (process.env.EXPO_PUBLIC_TRACKER_URL || 'http://localhost:3000').replace(/\/+$/, '');
                  const url = `${base}/track/${activeTripToken}`;
                  Linking.openURL(url).catch(() => Alert.alert('Tracker URL', url));
                }}
                accessibilityRole="button"
                accessibilityLabel="Open Web Tracker"
              >
                <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
                <Text style={styles.openTrackerButtonText}>Open Web Tracker</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareTrackerButton}
                onPress={() => {
                  const base = (process.env.EXPO_PUBLIC_TRACKER_URL || 'http://localhost:3000').replace(/\/+$/, '');
                  const url = `${base}/track/${activeTripToken}`;
                  Share.share({
                    message: `SafeSafar Live Walk Me Home: Track my journey in real-time: ${url}`,
                    url,
                  }).catch(() => {});
                }}
                accessibilityRole="button"
                accessibilityLabel="Share tracking link"
              >
                <MaterialIcons name="share" size={16} color={colors.primary} />
                <Text style={styles.shareTrackerButtonText}>Share Link</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Controls */}
        {!hasArrived && !isMissed && (
          <View style={styles.controlsSection}>
            {!isRunning && (
              <PrimaryButton
                variant="accent"
                label={isStarting ? 'Starting journey...' : 'Start journey'}
                disabled={isStarting}
                onPress={handleStartJourney}
                icon={<MaterialIcons name="directions-walk" size={20} color={colors.primaryDark} />}
              />
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
            title="Add a trusted contact first"
            message="Add contacts in Trusted Contacts to check in on your walk."
          />
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact, index) => {
              const isChecked = !!selectedContactIds[contact.id];

              return (
                <TouchableOpacity
                  key={contact.id}
                  activeOpacity={0.8}
                  onPress={() => toggleContact(contact.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={`${contact.name}, Trusted, ${isChecked ? 'selected' : 'unselected'}`}
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
  trackingLinkCard: {
    padding: 14,
    marginVertical: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  trackingLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  trackingLinkTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  trackingLinkSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    marginBottom: 10,
  },
  trackingLinkActions: {
    flexDirection: 'row',
    gap: 10,
  },
  openTrackerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    gap: 6,
  },
  openTrackerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  shareTrackerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    gap: 6,
  },
  shareTrackerButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
