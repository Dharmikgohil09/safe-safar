import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { requestEmergencyPermissions } from '../../../emergency';
import { setOnboardingCompleted } from '../storage/onboardingStorage';
import type { PermissionStatusState } from '../types';

interface OnboardingScreenProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function OnboardingScreen({ onComplete, onSkip }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRequestingPerms, setIsRequestingPerms] = useState(false);
  const [permStatus, setPermStatus] = useState<PermissionStatusState>({
    location: false,
    background: false,
    sms: false,
    call: false,
    mic: false,
  });

  // Animated values for transition
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const transitionToStep = (newStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: newStep > currentStep ? -20 : 20,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setCurrentStep(newStep);
      slideAnim.setValue(newStep > currentStep ? 20 : -20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    });
  };

  const handleNext = async () => {
    if (currentStep < 2) {
      transitionToStep(currentStep + 1);
    } else {
      await setOnboardingCompleted(true);
      if (onComplete) {
        onComplete();
      } else {
        router.replace('/');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      transitionToStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    await setOnboardingCompleted(true);
    if (onSkip) {
      onSkip();
    } else if (onComplete) {
      onComplete();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  };

  const handleRequestPermissions = async () => {
    setIsRequestingPerms(true);
    try {
      if (Platform.OS === 'android') {
        const res = await requestEmergencyPermissions();
        setPermStatus({
          location: res.location,
          background: res.background,
          sms: res.sms,
          call: res.call,
          mic: res.mic,
        });
      } else {
        // Web / iOS preview fallback
        const fg = await Location.requestForegroundPermissionsAsync();
        setPermStatus({
          location: fg.granted,
          background: false,
          sms: true,
          call: true,
          mic: false,
        });
      }
    } catch {
      // Permission prompt dismissed
    } finally {
      setIsRequestingPerms(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9F6" />
      <View style={styles.container}>
        {/* Top Bar with Return Arrow, Brand & Done */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.navBackButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Return to Home"
          >
            <MaterialIcons name="arrow-back" size={20} color="#146B4B" />
          </TouchableOpacity>
          <View style={styles.brandRow}>
            <MaterialIcons name="security" size={20} color="#146B4B" />
            <Text style={styles.brandName}>SafeSafar</Text>
          </View>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Exit onboarding"
          >
            <Text style={styles.skipButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Step Progress Indicators */}
        <View style={styles.indicatorsRow}>
          {[0, 1, 2].map((idx) => {
            const isActive = currentStep === idx;
            const isDone = currentStep > idx;
            return (
              <View
                key={idx}
                style={[
                  styles.indicatorBar,
                  isActive && styles.indicatorBarActive,
                  isDone && styles.indicatorBarDone,
                ]}
              />
            );
          })}
        </View>

        {/* Scrollable Step Content */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.stepContentWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Step 1: Safe Route Navigator */}
            {currentStep === 0 && (
              <View style={styles.stepContainer}>
                <View style={styles.heroCircle}>
                  <MaterialIcons name="navigation" size={44} color="#146B4B" />
                </View>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Safe Route Navigator</Text>
                </View>
                <Text style={styles.stepTitle}>Navigate by Safety, Not Just Speed</Text>
                <Text style={styles.stepSubtitle}>
                  Travel routes scored by real-time safety factors. Make informed decisions with
                  transparent safety data.
                </Text>

                <View style={styles.highlightsContainer}>
                  <View style={styles.highlightCard}>
                    <View style={styles.highlightIcon}>
                      <MaterialIcons name="alt-route" size={22} color="#146B4B" />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={styles.highlightTitle}>Color-Coded Route Options</Text>
                      <Text style={styles.highlightDesc}>
                        Choose between Green (high safety), Amber (moderate), and avoid Red (flagged) paths.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.highlightCard}>
                    <View style={styles.highlightIcon}>
                      <MaterialIcons name="wb-incandescent" size={22} color="#146B4B" />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={styles.highlightTitle}>Lighting & Landmark Density</Text>
                      <Text style={styles.highlightDesc}>
                        Prioritizes open hospitals, 24/7 pharmacies, police stations, and well-lit roads.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.highlightCard}>
                    <View style={styles.highlightIcon}>
                      <MaterialIcons name="verified-user" size={22} color="#146B4B" />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={styles.highlightTitle}>Verified Community Reports</Text>
                      <Text style={styles.highlightDesc}>
                        Hazards reported by travellers decay naturally over time to keep data fresh and actionable.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Step 2: Walk Me Home & Circles */}
            {currentStep === 1 && (
              <View style={styles.stepContainer}>
                <View style={styles.heroCircle}>
                  <MaterialIcons name="people-alt" size={44} color="#146B4B" />
                </View>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Walk Me Home</Text>
                </View>
                <Text style={styles.stepTitle}>Your Trusted People Watch Over You</Text>
                <Text style={styles.stepSubtitle}>
                  Stay connected during solo commutes with automated countdown check-ins and emergency contact alerts.
                </Text>

                <View style={styles.highlightsContainer}>
                  <View style={styles.highlightCard}>
                    <View style={styles.highlightIcon}>
                      <MaterialIcons name="timer" size={22} color="#146B4B" />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={styles.highlightTitle}>Automated Countdown Check-Ins</Text>
                      <Text style={styles.highlightDesc}>
                        Set trip timers for your journey. If you don&apos;t confirm your arrival, alerts dispatch automatically.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.highlightCard}>
                    <View style={styles.highlightIcon}>
                      <MaterialIcons name="phonelink-ring" size={22} color="#146B4B" />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={styles.highlightTitle}>Zero-Install Tracking Links</Text>
                      <Text style={styles.highlightDesc}>
                        Your contacts open your live journey link directly in their mobile browserâ€”no app required for them.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.highlightCard}>
                    <View style={styles.highlightIcon}>
                      <MaterialIcons name="lock-outline" size={22} color="#146B4B" />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={styles.highlightTitle}>On-Device Secure Storage</Text>
                      <Text style={styles.highlightDesc}>
                        Your contacts are saved securely on-device so SOS works offline even in zero-data dead zones.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Step 3: Emergency Defense & Permissions */}
            {currentStep === 2 && (
              <View style={styles.stepContainer}>
                <View style={styles.heroCircle}>
                  <MaterialIcons name="shield" size={44} color="#146B4B" />
                </View>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>4-Channel Alert Engine</Text>
                </View>
                <Text style={styles.stepTitle}>Emergency Defense & Permissions</Text>
                <Text style={styles.stepSubtitle}>
                  SafeSafar requires essential Android hardware permissions to send emergency SMS and auto-dial your contacts.
                </Text>

                {/* Permissions Breakdown Card */}
                <View style={styles.permissionsEducationCard}>
                  <Text style={styles.permCardTitle}>Required Safety Permissions</Text>

                  <View style={styles.permRow}>
                    <MaterialIcons name="my-location" size={18} color="#146B4B" />
                    <View style={styles.permTextWrap}>
                      <Text style={styles.permName}>Location (Foreground & Background)</Text>
                      <Text style={styles.permDesc}>
                        Shares live GPS coordinates with contacts during active SOS or Walk Me Home journeys.
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.permPill,
                        permStatus.location ? styles.permPillGranted : styles.permPillPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.permPillText,
                          permStatus.location ? styles.permPillTextGranted : styles.permPillTextPending,
                        ]}
                      >
                        {permStatus.location ? 'Granted' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.permRow}>
                    <MaterialIcons name="sms" size={18} color="#146B4B" />
                    <View style={styles.permTextWrap}>
                      <Text style={styles.permName}>Direct SMS (No Internet Required)</Text>
                      <Text style={styles.permDesc}>
                        Dispatches automated SOS messages with a Google Maps link directly through your SIM card.
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.permPill,
                        permStatus.sms ? styles.permPillGranted : styles.permPillPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.permPillText,
                          permStatus.sms ? styles.permPillTextGranted : styles.permPillTextPending,
                        ]}
                      >
                        {permStatus.sms ? 'Granted' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.permRow}>
                    <MaterialIcons name="phone" size={18} color="#146B4B" />
                    <View style={styles.permTextWrap}>
                      <Text style={styles.permName}>Phone Call Access</Text>
                      <Text style={styles.permDesc}>
                        Auto-dials your primary contact in sequence when an SOS alert is active.
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.permPill,
                        permStatus.call ? styles.permPillGranted : styles.permPillPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.permPillText,
                          permStatus.call ? styles.permPillTextGranted : styles.permPillTextPending,
                        ]}
                      >
                        {permStatus.call ? 'Granted' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.permRow}>
                    <MaterialIcons name="mic" size={18} color="#146B4B" />
                    <View style={styles.permTextWrap}>
                      <Text style={styles.permName}>Microphone (Hands-Free Voice Trigger)</Text>
                      <Text style={styles.permDesc}>
                        Listens for your on-device wake phrase to trigger help silently when phone is locked.
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.permPill,
                        permStatus.mic ? styles.permPillGranted : styles.permPillPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.permPillText,
                          permStatus.mic ? styles.permPillTextGranted : styles.permPillTextPending,
                        ]}
                      >
                        {permStatus.mic ? 'Granted' : 'Optional'}
                      </Text>
                    </View>
                  </View>

                  {/* Trigger Permission Button */}
                  <TouchableOpacity
                    style={styles.grantPermsButton}
                    onPress={handleRequestPermissions}
                    disabled={isRequestingPerms}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Grant safety permissions"
                  >
                    {isRequestingPerms ? (
                      <ActivityIndicator size="small" color="#146B4B" />
                    ) : (
                      <View style={styles.grantPermsInner}>
                        <MaterialIcons name="verified" size={18} color="#146B4B" />
                        <Text style={styles.grantPermsButtonText}>Grant Device Permissions</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Secondary navigation to Sign In */}
                <View style={styles.authLinkRow}>
                  <Text style={styles.authLinkHint}>Already have an account?</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/auth')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Go to Sign In"
                  >
                    <Text style={styles.authLinkText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Bottom Actions Bar */}
        <View style={styles.bottomBar}>
          {currentStep > 0 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Previous step"
            >
              <MaterialIcons name="arrow-back" size={20} color="#355648" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}

          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleNext}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={currentStep === 2 ? 'Get started' : 'Continue to next step'}
          >
            <Text style={styles.primaryActionButtonText}>
              {currentStep === 2 ? 'Get Started' : 'Continue'}
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F9F6',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  navBackButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#EAF2EC',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#146B4B',
    letterSpacing: -0.3,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#EAF2EC',
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#345244',
  },

  /* Progress Indicators */
  indicatorsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 14,
  },
  indicatorBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DCE7E1',
  },
  indicatorBarActive: {
    backgroundColor: '#146B4B',
  },
  indicatorBarDone: {
    backgroundColor: '#86BFA7',
  },

  /* Scroll Content */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  stepContentWrapper: {
    width: '100%',
  },
  stepContainer: {
    alignItems: 'center',
  },
  heroCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5F2E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  stepBadge: {
    backgroundColor: '#E8F3EC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#146B4B',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#18392B',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#65766C',
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },

  /* Highlight Cards */
  highlightsContainer: {
    width: '100%',
    gap: 12,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1EAE4',
    gap: 14,
  },
  highlightIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EBF4EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  highlightTextWrap: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18392B',
    marginBottom: 3,
  },
  highlightDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: '#65766C',
  },

  /* Permissions Card */
  permissionsEducationCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1EAE4',
  },
  permCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18392B',
    marginBottom: 12,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F2',
    gap: 10,
  },
  permTextWrap: {
    flex: 1,
  },
  permName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18392B',
  },
  permDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: '#65766C',
    marginTop: 2,
  },
  permPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'center',
  },
  permPillGranted: {
    backgroundColor: '#E5F2E9',
  },
  permPillPending: {
    backgroundColor: '#F3F6F4',
  },
  permPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  permPillTextGranted: {
    color: '#146B4B',
  },
  permPillTextPending: {
    color: '#76877E',
  },
  grantPermsButton: {
    backgroundColor: '#E5F2E9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#CBE0D4',
  },
  grantPermsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grantPermsButtonText: {
    color: '#146B4B',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Bottom Bar */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E6EEE9',
    backgroundColor: '#F5F9F6',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  backButtonPlaceholder: {
    width: 60,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#355648',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#146B4B',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 14,
    gap: 8,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#146B4B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(20, 107, 75, 0.2)',
      },
    }),
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  authLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 6,
  },
  authLinkHint: {
    fontSize: 13,
    color: '#65766C',
  },
  authLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#146B4B',
  },
});
