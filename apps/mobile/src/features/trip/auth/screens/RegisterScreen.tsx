import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
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
import { Card, PrimaryButton, ShieldLogo } from '../../../../components/ui';
import { colors, radius, typography } from '../../../../theme';
import { normalizePhone } from '../../../emergency';
import { useAuth } from '../../../../context/AuthContext';
import CheckEmailModal from '../components/CheckEmailModal';
import type { AuthValidationErrors, RegisterCredentials } from '../types';

interface RegisterScreenProps {
  onSuccess?: () => void;
  onNavigateToLogin?: () => void;
  onClose?: () => void;
}

export default function RegisterScreen({
  onSuccess,
  onNavigateToLogin,
  onClose,
}: RegisterScreenProps) {
  const { signup } = useAuth();
  const [data, setData] = useState<RegisterCredentials>({
    phone: '',
    pin: '',
    confirmPin: '',
    name: '',
    email: '',
  });
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<AuthValidationErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showCheckEmail, setShowCheckEmail] = useState(false);

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
    let isValid = true;

    if (!data.name.trim()) {
      errs.name = 'Full name is required.';
      isValid = false;
    } else if (data.name.trim().length < 2) {
      errs.name = 'Please enter a valid full name.';
      isValid = false;
    }

    const trimmedEmail = email.trim();
    const atIndex = trimmedEmail.indexOf('@');
    const dotAfterAtIndex = atIndex !== -1 ? trimmedEmail.indexOf('.', atIndex + 1) : -1;
    if (!trimmedEmail) {
      setEmailError('Email address is required.');
      isValid = false;
    } else if (atIndex <= 0 || dotAfterAtIndex === -1 || dotAfterAtIndex === trimmedEmail.length - 1) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError(undefined);
    }

    const norm = normalizePhone(data.phone);
    if (!data.phone.trim()) {
      errs.phone = 'Phone number is required.';
      isValid = false;
    } else if (!norm) {
      errs.phone = 'Enter a valid 10-digit Indian phone number.';
      isValid = false;
    }

    if (!data.pin) {
      errs.pin = 'Security PIN is required.';
      isValid = false;
    } else if (data.pin.length !== 4) {
      errs.pin = 'PIN must be exactly 4 digits.';
      isValid = false;
    }

    if (!data.confirmPin) {
      errs.confirmPin = 'Please confirm your PIN.';
      isValid = false;
    } else if (data.pin !== data.confirmPin) {
      errs.confirmPin = 'PIN codes do not match.';
      isValid = false;
    }

    setErrors(errs);
    return isValid && Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});

    try {
      const res = await signup({
        name: data.name,
        email: email.trim(),
        phone: data.phone,
        pin: data.pin,
        confirmPin: data.confirmPin,
      });

      if (res.success) {
        setShowCheckEmail(true);
      } else {
        if (res.field === 'email') {
          setEmailError(res.error);
        } else if (res.field === 'phone') {
          setErrors({ phone: res.error });
        } else if (res.field === 'password' || res.field === 'pin') {
          setErrors({ pin: res.error });
        } else {
          setErrors({ general: res.error || 'Registration failed. Please try again.' });
        }
      }
    } catch {
      setErrors({ general: 'Network error. Please check your connection and try again.' });
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

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.shieldLogoWrapper}>
                <ShieldLogo size={56} />
              </View>
              <Text style={styles.brandTitle}>SafeSafar</Text>
              <Text style={styles.subtitle}>Safer Routes. Brighter Journeys.</Text>
            </View>

            {/* Segmented Tab Row */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={onNavigateToLogin}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Switch to Login"
              >
                <Text style={styles.tabButtonText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, styles.activeTabButton]}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel="Register tab"
              >
                <Text style={[styles.tabButtonText, styles.activeTabButtonText]}>Register</Text>
                <View style={styles.activeUnderline} />
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
              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'name' && styles.inputFocused,
                    !!errors.name && styles.inputError,
                  ]}
                >
                  <View style={styles.inputLeftIcon}>
                    <MaterialIcons name="person-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter your legal or preferred name"
                    placeholderTextColor={colors.textMuted}
                    value={data.name}
                    onChangeText={(val) => {
                      setData((prev: RegisterCredentials) => ({ ...prev, name: val }));
                      if (errors.name) setErrors((prev: AuthValidationErrors) => ({ ...prev, name: undefined }));
                    }}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                    accessibilityLabel="Full name"
                  />
                </View>
                {errors.name && <Text style={styles.fieldErrorText}>{errors.name}</Text>}
              </View>

              {/* Email Address */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'email' && styles.inputFocused,
                  ]}
                >
                  <View style={styles.inputLeftIcon}>
                    <MaterialIcons name="mail-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={data.email || email}
                    onChangeText={(val) => {
                      setData((prev: RegisterCredentials) => ({ ...prev, email: val }));
                      setEmail(val);
                      if (emailError) setEmailError(undefined);
                    }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                    accessibilityLabel="Email Address"
                  />
                </View>
                {emailError && <Text style={styles.fieldErrorText}>{emailError}</Text>}
              </View>


              {/* Mobile Phone Number */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mobile Phone Number</Text>
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
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={13}
                    value={data.phone}
                    onChangeText={(val) => {
                      setData((prev: RegisterCredentials) => ({ ...prev, phone: val }));
                      if (errors.phone) setErrors((prev: AuthValidationErrors) => ({ ...prev, phone: undefined }));
                    }}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isLoading}
                    accessibilityLabel="Mobile phone number"
                  />
                </View>
                {errors.phone && <Text style={styles.fieldErrorText}>{errors.phone}</Text>}
              </View>

              {/* Set Security PIN */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Create 4-Digit Security PIN</Text>
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
                    placeholder="4 to 6 digit numerical PIN"
                    placeholderTextColor={colors.textMuted}
                    value={data.pin}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^\d]/g, '').slice(0, 6);
                      setData((prev: RegisterCredentials) => ({ ...prev, pin: clean }));
                      if (errors.pin) setErrors((prev: AuthValidationErrors) => ({ ...prev, pin: undefined }));
                    }}
                    onFocus={() => setFocusedField('pin')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPin}
                    keyboardType="numeric"
                    maxLength={6}
                    editable={!isLoading}
                    accessibilityLabel="Create PIN"
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

              {/* Confirm Security PIN */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm Security PIN</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'confirmPin' && styles.inputFocused,
                    !!errors.confirmPin && styles.inputError,
                  ]}
                >
                  <View style={styles.inputLeftIcon}>
                    <MaterialIcons name="lock-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Re-enter your PIN"
                    placeholderTextColor={colors.textMuted}
                    value={data.confirmPin}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^\d]/g, '').slice(0, 6);
                      setData((prev: RegisterCredentials) => ({ ...prev, confirmPin: clean }));
                      if (errors.confirmPin)
                        setErrors((prev: AuthValidationErrors) => ({ ...prev, confirmPin: undefined }));
                    }}
                    onFocus={() => setFocusedField('confirmPin')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showConfirmPin}
                    keyboardType="numeric"
                    maxLength={6}
                    editable={!isLoading}
                    accessibilityLabel="Confirm PIN"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPin(!showConfirmPin)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPin ? 'Hide confirm PIN' : 'Show confirm PIN'}
                  >
                    <MaterialIcons
                      name={showConfirmPin ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPin && (
                  <Text style={styles.fieldErrorText}>{errors.confirmPin}</Text>
                )}
              </View>

              {/* PrimaryButton */}
              <PrimaryButton
                variant="accent"
                label="Create Account"
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                accessibilityLabel="Create Account"
              />
            </Card>

            {/* Footer Navigation */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={onNavigateToLogin}
                activeOpacity={0.7}
                style={styles.footerLinkButton}
                accessibilityRole="button"
                accessibilityLabel="Sign in to your account"
              >
                <Text style={styles.footerLinkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CheckEmailModal
        visible={showCheckEmail}
        email={email.trim()}
        onVerified={() => {
          setShowCheckEmail(false);
          if (onSuccess) onSuccess();
          else if (onClose) onClose();
        }}
        onClose={() => setShowCheckEmail(false)}
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
    paddingHorizontal: 8,
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
  inputLeftIcon: {
    paddingLeft: 12,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
    height: '100%',
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
