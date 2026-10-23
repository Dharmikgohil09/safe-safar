import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
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
import { Card, PrimaryButton, ShieldLogo } from '../../../../components/ui';
import { colors, radius, typography } from '../../../../theme';
import { normalizePhone } from '../../../emergency';
import { useAuth } from '../../../../context/AuthContext';
import CheckEmailModal from '../components/CheckEmailModal';
import CompletePhoneModal from '../components/CompletePhoneModal';
import type { AuthCredentials, AuthValidationErrors } from '../types';

interface LoginScreenProps {
  onSuccess?: () => void;
  onNavigateToRegister?: () => void;
  onClose?: () => void;
}

export default function LoginScreen({
  onSuccess,
  onNavigateToRegister,
  onClose,
}: LoginScreenProps) {
  const { login, googleLogin } = useAuth();
  const [credentials, setCredentials] = useState<AuthCredentials>({ phone: '', pin: '' });
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<AuthValidationErrors>({});
  const [focusedField, setFocusedField] = useState<'phone' | 'pin' | null>(null);
  const [showCheckEmail, setShowCheckEmail] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [showCompletePhone, setShowCompletePhone] = useState(false);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const validate = (): boolean => {
    const errs: AuthValidationErrors = {};
    const input = credentials.phone.trim();
    const isEmail = input.includes('@');

    if (!input) {
      errs.phone = 'Phone number or email is required.';
    } else if (!isEmail && !normalizePhone(input)) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!credentials.pin) {
      errs.pin = 'PIN is required.';
    } else if (credentials.pin.length !== 4) {
      errs.pin = 'PIN must be exactly 4 digits.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});

    try {
      const res = await login(credentials.phone.trim(), credentials.pin);
      if (res.success) {
        if (res.needsProfileCompletion) {
          setShowCompletePhone(true);
        } else if (onSuccess) {
          onSuccess();
        } else if (onClose) {
          onClose();
        }
      } else if (res.isUnverified) {
        setUnverifiedEmail(res.email || credentials.phone.trim());
        setShowCheckEmail(true);
      } else {
        setErrors({ general: res.error || 'Invalid credentials. Please try again.' });
      }
    } catch {
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      Alert.alert(
        'Google Sign-In',
        'Enter Google ID token or test social login?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Test Google User',
            onPress: async () => {
              Alert.alert('Google Client ID Required', 'Configure GOOGLE_WEB_CLIENT_ID and GOOGLE_ANDROID_CLIENT_ID in Google Cloud Console.');
            },
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.container,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {onClose && (
              <View style={styles.topNavRow}>
                <TouchableOpacity
                  style={styles.navBackButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Return to Home"
                >
                  <MaterialIcons name="arrow-back" size={18} color={colors.primary} />
                  <Text style={styles.navBackText}>Home</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Header / Brand */}
            <View style={styles.header}>
              <View style={styles.shieldLogoWrapper}>
                <ShieldLogo size={56} />
              </View>
              <Text style={styles.brandTitle}>SafeSafar</Text>
              <Text style={styles.subtitle}>Safer Routes. Brighter Journeys.</Text>

              {isMock && (
                <View style={styles.mockBadge}>
                  <MaterialIcons name="info-outline" size={13} color={colors.accent} />
                  <Text style={styles.mockBadgeText}>
                    Demo Mode · Try: <Text style={styles.boldText}>9876543210</Text> | PIN:{' '}
                    <Text style={styles.boldText}>1234</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Segmented Tab Row */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabButton, styles.activeTabButton]}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel="Login tab"
              >
                <Text style={[styles.tabButtonText, styles.activeTabButtonText]}>Login</Text>
                <View style={styles.activeUnderline} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={onNavigateToRegister}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Switch to Register"
              >
                <Text style={styles.tabButtonText}>Register</Text>
              </TouchableOpacity>
            </View>

            {/* General Error Banner */}
            {errors.general && (
              <View style={styles.generalErrorBanner}>
                <MaterialIcons name="error-outline" size={18} color={colors.danger} />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            {/* Form Fields Card */}
            <Card style={styles.card}>
              {/* Phone Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'phone' && styles.inputFocused,
                    !!errors.phone && styles.inputError,
                  ]}
                >
                  <View style={styles.prefixWrapper}>
                    <MaterialIcons name="phone" size={18} color={colors.textSecondary} />
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={13}
                    value={credentials.phone}
                    onChangeText={(val) => {
                      setCredentials((prev) => ({ ...prev, phone: val }));
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                    accessibilityLabel="Mobile phone number"
                  />
                </View>
                {errors.phone && <Text style={styles.fieldErrorText}>{errors.phone}</Text>}
              </View>

              {/* PIN / Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Security PIN</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'pin' && styles.inputFocused,
                    !!errors.pin && styles.inputError,
                  ]}
                >
                  <View style={styles.inputLeftIcon}>
                    <MaterialIcons name="lock-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="4 to 6 digit PIN"
                    placeholderTextColor={colors.textMuted}
                    value={credentials.pin}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^\d]/g, '').slice(0, 6);
                      setCredentials((prev) => ({ ...prev, pin: clean }));
                      if (errors.pin) setErrors((prev) => ({ ...prev, pin: undefined }));
                    }}
                    onFocus={() => setFocusedField('pin')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPin}
                    keyboardType="numeric"
                    maxLength={6}
                    editable={!isLoading}
                    accessibilityLabel="PIN code"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPin(!showPin)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    <MaterialIcons
                      name={showPin ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.pin && <Text style={styles.fieldErrorText}>{errors.pin}</Text>}
              </View>

              {/* PrimaryButton */}
              <PrimaryButton
                variant="accent"
                label="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                accessibilityLabel="Sign In"
              />

              {/* Divider "OR" */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Presentational Social Login Buttons */}
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleGoogleSignIn}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                >
                  <MaterialIcons name="g-mobiledata" size={24} color={colors.textPrimary} />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => Alert.alert('Apple Sign-In', 'Social sign-in will be connected during backend integration.')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                >
                  <MaterialIcons name="apple" size={20} color={colors.textPrimary} />
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Footer Navigation */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>New to SafeSafar?</Text>
              <TouchableOpacity
                onPress={onNavigateToRegister}
                activeOpacity={0.7}
                style={styles.footerLinkButton}
                accessibilityRole="button"
                accessibilityLabel="Create an account"
              >
                <Text style={styles.footerLinkText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CheckEmailModal
        visible={showCheckEmail}
        email={unverifiedEmail}
        onVerified={() => {
          setShowCheckEmail(false);
          if (onSuccess) onSuccess();
          else if (onClose) onClose();
        }}
        onClose={() => setShowCheckEmail(false)}
      />

      <CompletePhoneModal
        visible={showCompletePhone}
        onSuccess={() => {
          setShowCompletePhone(false);
          if (onSuccess) onSuccess();
          else if (onClose) onClose();
        }}
        onDismiss={() => {
          setShowCompletePhone(false);
          if (onSuccess) onSuccess();
          else if (onClose) onClose();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  container: {
    width: '100%',
    maxWidth: 460,
  },
  topNavRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    gap: 4,
  },
  navBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Header */
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldLogoWrapper: {
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.cardLarge,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 6,
  },
  mockBadgeText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '800',
    color: colors.primaryDark,
  },

  /* Segmented Tab Row */
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTabButton: {
    backgroundColor: '#FFFBEB',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabButtonText: {
    fontWeight: '800',
    color: colors.primaryDark,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  /* General Error */
  generalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },
  generalErrorText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.danger,
    fontWeight: '600',
    flex: 1,
  },

  /* Card */
  card: {
    padding: 22,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
  },
  inputFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#FFF8F8',
  },
  prefixWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: '100%',
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputLeftIcon: {
    paddingLeft: 12,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.textPrimary,
    height: '100%',
  },
  inputWithIcon: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 15,
    color: colors.textPrimary,
    height: '100%',
  },
  eyeButton: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldErrorText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 5,
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },

  /* Social Buttons */
  socialButtonsContainer: {
    gap: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footerLinkButton: {
    paddingVertical: 4,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
});
