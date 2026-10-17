import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
import { Card, PrimaryButton, ShieldLogo } from '../../../../components/ui';
import { colors, radius, typography } from '../../../../theme';
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
  const [reduceMotion, setReduceMotion] = useState(false);
  const [permStatus, setPermStatus] = useState<PermissionStatusState>({
    location: false,
    background: false,
    sms: false,
    call: false,
    mic: false,
  });

  // Animated values for staggered transition
  const heroFadeAnim = useRef(new Animated.Value(1)).current;
  const heroSlideAnim = useRef(new Animated.Value(0)).current;

  const titleFadeAnim = useRef(new Animated.Value(1)).current;
  const titleSlideAnim = useRef(new Animated.Value(0)).current;

  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const contentSlideAnim = useRef(new Animated.Value(0)).current;

  const buttonFadeAnim = useRef(new Animated.Value(1)).current;
  const buttonSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      isMounted = false;
      sub?.remove();
    };
  }, []);

  const transitionToStep = (newStep: number) => {
    if (reduceMotion) {
      setCurrentStep(newStep);
      return;
    }

    const slideEnter = newStep > currentStep ? 16 : -16;

    // Fade out current step
    Animated.parallel([
      Animated.timing(heroFadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(titleFadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(contentFadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(buttonFadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setCurrentStep(newStep);
      heroSlideAnim.setValue(slideEnter);
      titleSlideAnim.setValue(slideEnter);
      contentSlideAnim.setValue(slideEnter);
      buttonSlideAnim.setValue(slideEnter);

      // Staggered entrance: logo -> title -> content -> buttons (~80ms apart)
      Animated.stagger(80, [
        Animated.parallel([
          Animated.timing(heroFadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(heroSlideAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
        Animated.parallel([
          Animated.timing(titleFadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(titleSlideAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
        Animated.parallel([
          Animated.timing(contentFadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(contentSlideAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
        Animated.parallel([
          Animated.timing(buttonFadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(buttonSlideAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
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
            <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.brandRow}>
            <ShieldLogo size={20} />
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

        {/* Amber Dot Progress Indicators */}
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((idx) => {
            const isActive = currentStep === idx;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
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
          {/* Step 1: Safe Route Navigator */}
          {currentStep === 0 && (
            <View style={styles.stepContainer}>
              <Animated.View
                style={[
                  styles.heroCircleWrapper,
                  {
                    opacity: heroFadeAnim,
                    transform: [{ translateY: heroSlideAnim }],
                  },
                ]}
              >
                <View style={styles.heroCircle}>
                  <MaterialIcons name="navigation" size={44} color={colors.accent} />
                </View>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Safe Route Navigator</Text>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.textHeaderWrapper,
                  {
                    opacity: titleFadeAnim,
                    transform: [{ translateY: titleSlideAnim }],
                  },
                ]}
              >
                <Text style={styles.stepTitle}>
                  Welcome to <Text style={styles.titleAmber}>SafeSafar</Text>
                </Text>
                <Text style={styles.stepSubtitle}>
                  Travel routes scored by real-time safety factors. Make informed decisions with
                  transparent safety data.
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.highlightsContainer,
                  {
                    opacity: contentFadeAnim,
                    transform: [{ translateY: contentSlideAnim }],
                  },
                ]}
              >
                <Card style={styles.highlightCard}>
                  <View style={styles.highlightIcon}>
                    <MaterialIcons name="alt-route" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.highlightTextWrap}>
                    <Text style={styles.highlightTitle}>Color-Coded Route Options</Text>
                    <Text style={styles.highlightDesc}>
                      Choose between Green (high safety), Amber (moderate), and avoid Red (flagged) paths.
                    </Text>
                  </View>
                </Card>

                <Card style={styles.highlightCard}>
                  <View style={styles.highlightIcon}>
                    <MaterialIcons name="wb-incandescent" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.highlightTextWrap}>
                    <Text style={styles.highlightTitle}>Lighting & Landmark Density</Text>
                    <Text style={styles.highlightDesc}>
                      Prioritizes open hospitals, 24/7 pharmacies, police stations, and well-lit roads.
                    </Text>
                  </View>
                </Card>

                <Card style={styles.highlightCard}>
                  <View style={styles.highlightIcon}>
                    <MaterialIcons name="verified-user" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.highlightTextWrap}>
                    <Text style={styles.highlightTitle}>Verified Community Reports</Text>
                    <Text style={styles.highlightDesc}>
                      Hazards reported by travellers decay naturally over time to keep data fresh and actionable.
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            </View>
          )}

          {/* Step 2: Walk Me Home & Circles */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <Animated.View
                style={[
                  styles.heroCircleWrapper,
                  {
                    opacity: heroFadeAnim,
                    transform: [{ translateY: heroSlideAnim }],
                  },
                ]}
              >
                <View style={styles.heroCircle}>
                  <MaterialIcons name="people-alt" size={44} color={colors.accent} />
                </View>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Walk Me Home</Text>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.textHeaderWrapper,
                  {
                    opacity: titleFadeAnim,
                    transform: [{ translateY: titleSlideAnim }],
                  },
                ]}
              >
                <Text style={styles.stepTitle}>
                  Welcome to <Text style={styles.titleAmber}>SafeSafar</Text>
                </Text>
                <Text style={styles.stepSubtitle}>
                  Stay connected during solo commutes with automated countdown check-ins and emergency contact alerts.
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.highlightsContainer,
                  {
                    opacity: contentFadeAnim,
                    transform: [{ translateY: contentSlideAnim }],
                  },
                ]}
              >
                <Card style={styles.highlightCard}>
                  <View style={styles.highlightIcon}>
                    <MaterialIcons name="timer" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.highlightTextWrap}>
                    <Text style={styles.highlightTitle}>Automated Countdown Check-Ins</Text>
                    <Text style={styles.highlightDesc}>
                      Set trip timers for your journey. If you don&apos;t confirm your arrival, alerts dispatch automatically.
                    </Text>
                  </View>
                </Card>

                <Card style={styles.highlightCard}>
                  <View style={styles.highlightIcon}>
                    <MaterialIcons name="phonelink-ring" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.highlightTextWrap}>
                    <Text style={styles.highlightTitle}>Zero-Install Tracking Links</Text>
                    <Text style={styles.highlightDesc}>
                      Your contacts open your live journey link directly in their mobile browser, no app required for them.
                    </Text>
                  </View>
                </Card>

                <Card style={styles.highlightCard}>
                  <View style={styles.highlightIcon}>
                    <MaterialIcons name="lock-outline" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.highlightTextWrap}>
                    <Text style={styles.highlightTitle}>On-Device Secure Storage</Text>
                    <Text style={styles.highlightDesc}>
                      Your contacts are saved securely on-device so SOS works offline even in zero-data dead zones.
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            </View>
          )}

          {/* Step 3: Emergency Defense & Permissions */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <Animated.View
                style={[
                  styles.heroCircleWrapper,
                  {
                    opacity: heroFadeAnim,
                    transform: [{ translateY: heroSlideAnim }],
                  },
                ]}
              >
                <View style={styles.heroCircle}>
                  <MaterialIcons name="shield" size={44} color={colors.accent} />
                </View>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>4-Channel Alert Engine</Text>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.textHeaderWrapper,
                  {
                    opacity: titleFadeAnim,
                    transform: [{ translateY: titleSlideAnim }],
                  },
                ]}
              >
                <Text style={styles.stepTitle}>
                  Welcome to <Text style={styles.titleAmber}>SafeSafar</Text>
                </Text>
                <Text style={styles.stepSubtitle}>
                  SafeSafar requires essential Android hardware permissions to send emergency SMS and auto-dial your contacts.
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.highlightsContainer,
                  {
                    opacity: contentFadeAnim,
                    transform: [{ translateY: contentSlideAnim }],
                  },
                ]}
              >
                {/* Permissions Breakdown Card */}
                <Card style={styles.permissionsEducationCard}>
                  <Text style={styles.permCardTitle}>Required Safety Permissions</Text>

                  <View style={styles.permRow}>
                    <View style={styles.permIconCircle}>
                      <MaterialIcons name="my-location" size={18} color={colors.accent} />
                    </View>
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
                    <View style={styles.permIconCircle}>
                      <MaterialIcons name="sms" size={18} color={colors.accent} />
                    </View>
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
                    <View style={styles.permIconCircle}>
                      <MaterialIcons name="phone" size={18} color={colors.accent} />
                    </View>
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
                    <View style={styles.permIconCircle}>
                      <MaterialIcons name="mic" size={18} color={colors.accent} />
                    </View>
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
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <View style={styles.grantPermsInner}>
                        <MaterialIcons name="verified" size={18} color={colors.accent} />
                        <Text style={styles.grantPermsButtonText}>Grant Device Permissions</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Card>

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
              </Animated.View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions Bar */}
        <Animated.View
          style={[
            styles.bottomBar,
            {
              opacity: buttonFadeAnim,
              transform: [{ translateY: buttonSlideAnim }],
            },
          ]}
        >
          {currentStep > 0 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Previous step"
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}

          <PrimaryButton
            variant="accent"
            label={currentStep === 2 ? 'Get Started' : 'Continue'}
            style={styles.primaryActionButton}
            onPress={handleNext}
            accessibilityLabel={currentStep === 2 ? 'Get started' : 'Continue to next step'}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.3,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  /* Dot Progress Indicators */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.border,
  },

  /* Scroll Content */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  stepContainer: {
    alignItems: 'center',
  },
  heroCircleWrapper: {
    alignItems: 'center',
  },
  heroCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  stepBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  textHeaderWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  stepTitle: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  titleAmber: {
    color: colors.accent,
  },
  stepSubtitle: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
    color: colors.textSecondary,
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
    padding: 14,
    gap: 14,
  },
  highlightIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
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
    color: colors.textPrimary,
    marginBottom: 3,
  },
  highlightDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  /* Permissions Card */
  permissionsEducationCard: {
    width: '100%',
    padding: 16,
  },
  permCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  permIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  permTextWrap: {
    flex: 1,
  },
  permName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  permDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  permPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'center',
  },
  permPillGranted: {
    backgroundColor: '#FEF3C7',
  },
  permPillPending: {
    backgroundColor: colors.border,
  },
  permPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  permPillTextGranted: {
    color: colors.primaryDark,
  },
  permPillTextPending: {
    color: colors.textMuted,
  },
  grantPermsButton: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  grantPermsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grantPermsButtonText: {
    color: colors.primaryDark,
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
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    gap: 6,
  },
  backButtonPlaceholder: {
    width: 60,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  primaryActionButton: {
    minWidth: 140,
    paddingHorizontal: 20,
    height: 48,
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
    color: colors.textSecondary,
  },
  authLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
});
