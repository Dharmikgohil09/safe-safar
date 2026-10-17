import React, { useEffect, useRef, useState } from 'react';
import {
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
import { authService } from '../services/authService';
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
  const [data, setData] = useState<RegisterCredentials>({
    name: '',
    phone: '',
    pin: '',
    confirmPin: '',
  });
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<AuthValidationErrors>({});
  const [focusedField, setFocusedField] = useState<'name' | 'phone' | 'pin' | 'confirmPin' | null>(
    null
  );

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const validate = (): boolean => {
    const errs: AuthValidationErrors = {};
    const norm = normalizePhone(data.phone);

    if (!data.name.trim()) {
      errs.name = 'Please enter your full name.';
    } else if (data.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }

    if (!data.phone.trim()) {
      errs.phone = 'Please enter your phone number.';
    } else if (!norm) {
      errs.phone = 'Please enter a valid 10-digit Indian phone number.';
    }

    if (!data.pin) {
      errs.pin = 'Create a 4-digit security PIN.';
    } else if (data.pin.length < 4) {
      errs.pin = 'PIN must be at least 4 digits.';
    }

    if (!data.confirmPin) {
      errs.confirmPin = 'Confirm your security PIN.';
    } else if (data.pin !== data.confirmPin) {
      errs.confirmPin = 'PINs do not match. Please re-enter.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      setIsLoading(true);
      setErrors({});
      const res = await authService.register(data);

      if (!res.success) {
        setErrors({ general: res.error || 'Registration failed. Please try again.' });
        return;
      }

      onSuccess?.();
    } catch {
      setErrors({ general: 'Connection error during registration. Please try again.' });
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
              <Text style={styles.brandTitle}>SAFESAFAR</Text>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Safer Travel, Brighter Futures.</Text>
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
                    errors.name ? styles.inputError : null,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Diya Patel"
                    placeholderTextColor="#9CAEA4"
                    value={data.name}
                    onChangeText={(val) => {
                      setData((prev) => ({ ...prev, name: val }));
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    returnKeyType="next"
                    accessibilityLabel="Full name"
                  />
                </View>
                {errors.name && <Text style={styles.fieldErrorText}>{errors.name}</Text>}
              </View>

              {/* Phone Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mobile Phone Number</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'phone' && styles.inputFocused,
                    errors.phone ? styles.inputError : null,
                  ]}
                >
                  <View style={styles.prefixWrapper}>
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.inputWithPrefix}
                    placeholder="98765 43210"
                    placeholderTextColor="#9CAEA4"
                    value={data.phone}
                    onChangeText={(val) => {
                      setData((prev) => ({ ...prev, phone: val }));
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    returnKeyType="next"
                    accessibilityLabel="Mobile phone number"
                  />
                </View>
                {errors.phone && <Text style={styles.fieldErrorText}>{errors.phone}</Text>}
              </View>

              {/* PIN Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Create 4-Digit PIN</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'pin' && styles.inputFocused,
                    errors.pin ? styles.inputError : null,
                  ]}
                >
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. 2468"
                    placeholderTextColor="#9CAEA4"
                    value={data.pin}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^\d]/g, '').slice(0, 6);
                      setData((prev) => ({ ...prev, pin: clean }));
                      if (errors.pin) setErrors((prev) => ({ ...prev, pin: undefined }));
                    }}
                    onFocus={() => setFocusedField('pin')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="number-pad"
                    secureTextEntry={!showPin}
                    returnKeyType="next"
                    accessibilityLabel="Create 4-digit PIN"
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
                {errors.pin ? (
                  <Text style={styles.fieldErrorText}>{errors.pin}</Text>
                ) : (
                  <Text style={styles.helperText}>Used for fast sign-in and travel check-in confirmations.</Text>
                )}
              </View>

              {/* Confirm PIN Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm Security PIN</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'confirmPin' && styles.inputFocused,
                    errors.confirmPin ? styles.inputError : null,
                  ]}
                >
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Re-enter 4-digit PIN"
                    placeholderTextColor="#9CAEA4"
                    value={data.confirmPin}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^\d]/g, '').slice(0, 6);
                      setData((prev) => ({ ...prev, confirmPin: clean }));
                      if (errors.confirmPin) setErrors((prev) => ({ ...prev, confirmPin: undefined }));
                    }}
                    onFocus={() => setFocusedField('confirmPin')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="number-pad"
                    secureTextEntry={!showConfirmPin}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    accessibilityLabel="Confirm Security PIN"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPin(!showConfirmPin)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPin ? 'Hide PIN' : 'Show PIN'}
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
                accessibilityLabel="Sign in"
              >
                <Text style={styles.footerLinkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: '#EAF2EC',
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
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  /* Error Banner */
  generalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F5C6CB',
    borderRadius: 12,
    padding: 12,
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
    backgroundColor: '#FAFCFA',
    borderWidth: 1.2,
    borderColor: '#D4E2D9',
    borderRadius: 12,
    overflow: 'hidden',
    height: 48,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#FFF8F8',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
    height: '100%',
  },
  prefixWrapper: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: '#F3F7F4',
    height: '100%',
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#345244',
  },
  inputWithPrefix: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.textPrimary,
    height: '100%',
  },
  inputWithIcon: {
    flex: 1,
    paddingHorizontal: 14,
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
  helperText: {
    fontSize: 11,
    color: '#76877E',
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
    color: colors.primary,
  },
});
