import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Card, PrimaryButton, StateView, useReduceMotion } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';
import { useTripContacts } from '../storage/useTripContacts';
import { walkTelemetryService } from '../../../services/walkTelemetryService';

const DURATION_OPTIONS = ['15 min', '1 hour', '8 hours', 'Until I stop'];

export default function LiveLocationScreen() {
  const reduceMotion = useReduceMotion();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const { contacts, loading } = useTripContacts();
  const [selectedContactIds, setSelectedContactIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    contacts.forEach((c) => {
      initial[c.id] = true;
    });
    setSelectedContactIds(initial);
  }, [contacts]);

  const [selectedDuration, setSelectedDuration] = useState<string>('1 hour');
  const [previewStatus, setPreviewStatus] = useState<'ready' | 'loading' | 'empty' | 'error'>('ready');

  const cyclePreviewStatus = () => {
    setPreviewStatus((prev) => {
      if (prev === 'ready') return 'loading';
      if (prev === 'loading') return 'empty';
      if (prev === 'empty') return 'error';
      return 'ready';
    });
  };

  const showMessage = async (feature: string) => {
    if (!reduceMotion && feature === 'Live location sharing preview') {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 150,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }

    try {
      const session = await walkTelemetryService.startWalkSession({
        destinationName: 'Live Location Sharing',
        routeName: 'Active Safe Tracking',
      });

      Alert.alert(
        'Live Sharing Active',
        `Your real-time GPS telemetry is streaming to the SafeSafar Live Tracker.\n\nSMS alert with your tracking link has been dispatched to your trusted contacts.\n\nTracking Link:\n${session.trackerUrl}`,
        [
          {
            text: 'Share Link (WhatsApp/SMS)',
            onPress: () => walkTelemetryService.shareTrackingLink(),
          },
          {
            text: 'Open Web Tracker',
            onPress: () => {
              Linking.openURL(session.trackerUrl).catch(() => {
                Alert.alert('Tracker URL', session.trackerUrl);
              });
            },
          },
          { text: 'OK', style: 'default' },
        ]
      );
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
      console.warn('[LiveLocation] Failed to start telemetry:', err);
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const selectedCount = Object.values(selectedContactIds).filter(Boolean).length;

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
          <Text style={styles.headerTitle}>Share Live Location</Text>
          <Text style={styles.headerSubtitle}>Real-Time GPS Guardian Feed</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Informational Banner */}
        <Card style={styles.bannerCard}>
          <View style={styles.bannerIconCircle}>
            <MaterialIcons name="share-location" size={24} color={colors.accent} />
          </View>
          <View style={styles.bannerTextGroup}>
            <Text style={styles.bannerTitle}>Live Guardian Tracking</Text>
            <Text style={styles.bannerSubtitle}>
              Selected contacts receive a temporary tracking link with your live map path, battery level, and emergency check-in status.
            </Text>
          </View>
        </Card>

        {/* Contacts Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitle}>Share With</Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{selectedCount} Selected</Text>
              </View>
            </View>
            {__DEV__ && (
              <TouchableOpacity
                onPress={cyclePreviewStatus}
                style={styles.previewChip}
                accessibilityRole="button"
                accessibilityLabel="Preview states"
              >
                <Text style={styles.previewChipText}>Preview: {previewStatus}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>
            Choose trusted guardians who will receive your location
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
        ) : previewStatus === 'loading' ? (
          <StateView
            kind="loading"
            title="Loading contacts"
            message="Retrieving your trusted contacts..."
          />
        ) : previewStatus === 'empty' ? (
          <StateView
            kind="empty"
            title="No trusted contacts yet"
            message="Add contacts in Trusted Contacts to share your location."
          />
        ) : previewStatus === 'error' ? (
          <StateView
            kind="error"
            title="Unable to load contacts"
            message="Could not load your contact list. Please try again."
            actionLabel="Retry"
            onAction={() => setPreviewStatus('ready')}
          />
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact, index: number) => {
              const isChecked = !!selectedContactIds[contact.id];

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

        {/* Duration Chips Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Share Duration</Text>
          <Text style={styles.sectionSubtitle}>
            Location sharing will automatically terminate after this period
          </Text>
        </View>

        <View style={styles.chipsContainer}>
          {DURATION_OPTIONS.map((duration) => {
            const isSelected = selectedDuration === duration;

            return (
              <TouchableOpacity
                key={duration}
                activeOpacity={0.8}
                onPress={() => setSelectedDuration(duration)}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Duration: ${duration}`}
              >
                {isSelected ? (
                  <MaterialIcons name="check" size={16} color={colors.primaryDark} style={styles.chipCheck} />
                ) : null}
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {duration}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Security & Privacy Notice */}
        <Card style={styles.privacyCard}>
          <MaterialIcons name="lock" size={18} color={colors.safe} />
          <Text style={styles.privacyText}>
            End-to-end encrypted · You can stop sharing at any moment from this screen or notifications.
          </Text>
        </Card>

        {/* Start Sharing Button */}
        <View style={styles.actionContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
          <PrimaryButton
            variant="accent"
            label="Start Sharing"
            onPress={() => showMessage('Live location sharing preview')}
            icon={<MaterialIcons name="near-me" size={20} color={colors.primaryDark} />}
            style={styles.shareButton}
          />
          </Animated.View>
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
  headerSpacer: {
    width: 36,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },

  /* Banner Card */
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
    marginBottom: 20,
  },
  bannerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerTextGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },

  /* Section Header */
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  badgeCount: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Contacts List */
  contactsList: {
    gap: 10,
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  contactCardChecked: {
    borderColor: colors.accent,
    backgroundColor: '#FFFFFF',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  relPill: {
    backgroundColor: 'rgba(51, 65, 85, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  relPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  contactPhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Duration Chips */
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipCheck: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '800',
  },

  /* Privacy Notice */
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: 'rgba(20, 107, 75, 0.06)',
    borderColor: 'rgba(20, 107, 75, 0.2)',
    marginBottom: 24,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: colors.safe,
    lineHeight: 16,
  },

  /* Action */
  actionContainer: {
    marginBottom: 10,
  },
  shareButton: {
    height: 50,
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
