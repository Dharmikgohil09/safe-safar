import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { normalizePhone } from '../../emergency';
import { authService } from '../services/authService';
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
  const [credentials, setCredentials] = useState<AuthCredentials>({ phone: '', pin: '' });
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<AuthValidationErrors>({});
  const [focusedField, setFocusedField] = useState<'phone' | 'pin' | null>(null);

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
    const norm = normalizePhone(credentials.phone);

    if (!credentials.phone.trim()) {
      errs.phone = 'Please enter your mobile phone number.';
    } else if (!norm) {
      errs.phone = 'Please enter a valid 10-digit Indian phone number.';
    }

    if (!credentials.pin) {
      errs.pin = 'Please enter your 4-digit PIN.';
    } else if (credentials.pin.length < 4) {
      errs.pin = 'PIN must be at least 4 digits.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setIsLoading(true);
      setErrors({});
      const res = await authService.login(credentials);

      if (!res.success) {
        setErrors({ general: res.error || 'Login failed. Please check your credentials.' });
        return;
      }

      onSuccess?.();
    } catch {
      setErrors({ general: 'An unexpected connection error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const isMock = authService.isUsingMock();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9F6" />
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
                  <MaterialIcons name="arrow-back" size={18} color="#146B4B" />
                  <Text style={styles.navBackText}>Home</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Header / Brand */}
            <View style={styles.header}>
              <View style={styles.brandIconWrapper}>
                <MaterialIcons name="security" size={28} color="#146B4B" />
              </View>
              <Text style={styles.brandTitle}>SafeSafar</Text>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in with your phone and secure PIN to access your routes and safety circle.
              </Text>

              {isMock && (
                <View style={styles.mockBadge}>
                  <MaterialIcons name="info-outline" size={13} color="#2A6B4B" />
                  <Text style={styles.mockBadgeText}>
                    Demo Mode • Try: <Text style={styles.boldText}>9876543210</Text> | PIN:{' '}
                    <Text style={styles.boldText}>1234</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* General Error Banner */}
            {errors.general && (
              <View style={styles.generalErrorBanner}>
                <MaterialIcons name="error-outline" size={18} color="#C83F43" />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            {/* Form Fields Card */}
            <View style={styles.card}>
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
                    value={credentials.phone}
                    onChangeText={(val) => {
                      setCredentials((prev) => ({ ...prev, phone: val }));
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
                <Text style={styles.label}>Security PIN</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'pin' && styles.inputFocused,
                    errors.pin ? styles.inputError : null,
                  ]}
                >
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter 4-digit PIN"
                    placeholderTextColor="#9CAEA4"
                    value={credentials.pin}
                    onChangeText={(val) => {
                      // Only allow digits
                      const clean = val.replace(/[^\d]/g, '').slice(0, 6);
                      setCredentials((prev) => ({ ...prev, pin: clean }));
                      if (errors.pin) setErrors((prev) => ({ ...prev, pin: undefined }));
                    }}
                    onFocus={() => setFocusedField('pin')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="number-pad"
                    secureTextEntry={!showPin}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    accessibilityLabel="Security PIN"
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
                      color="#64756C"
                    />
                  </TouchableOpacity>
                </View>
                {errors.pin && <Text style={styles.fieldErrorText}>{errors.pin}</Text>}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Sign In"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F9F6',
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
    borderRadius: 14,
    backgroundColor: '#EAF2EC',
    gap: 4,
  },
  navBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#146B4B',
  },

  /* Header */
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandIconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E5F2E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#146B4B',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#18392B',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#65766C',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF5F0',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#D4E6DC',
  },
  mockBadgeText: {
    fontSize: 11,
    color: '#2A6B4B',
    fontWeight: '600',
  },
  boldText: {
    fontWeight: '800',
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
    color: '#C83F43',
    fontWeight: '600',
    flex: 1,
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E1EAE4',
    ...Platform.select({
      ios: {
        shadowColor: '#146B4B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 16px rgba(20, 107, 75, 0.06)',
      },
    }),
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18392B',
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
    borderColor: '#146B4B',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#C83F43',
    backgroundColor: '#FFF8F8',
  },
  prefixWrapper: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E1EAE4',
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
    color: '#18392B',
    height: '100%',
  },
  inputWithIcon: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#18392B',
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
    color: '#C83F43',
    fontWeight: '600',
    marginTop: 5,
  },

  /* Buttons */
  primaryButton: {
    backgroundColor: '#146B4B',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  buttonDisabled: {
    backgroundColor: '#A0BCB0',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: '#65766C',
  },
  footerLinkButton: {
    paddingVertical: 4,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#146B4B',
  },
});
