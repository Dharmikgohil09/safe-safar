import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, radius, typography } from '../../../../theme';
import { useAuth } from '../../../../context/AuthContext';
import { normalizePhone } from '../../../emergency';

interface CompletePhoneModalProps {
  visible: boolean;
  onSuccess: () => void;
  onDismiss?: () => void;
}

export default function CompletePhoneModal({
  visible,
  onSuccess,
  onDismiss,
}: CompletePhoneModalProps) {
  const { completeProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const clean = normalizePhone(phone);
    if (!clean) {
      setError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await completeProfile(phone);
    setLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to update phone number.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="phone-android" size={32} color={colors.accent} />
          </View>

          <Text style={styles.title}>Add Your Mobile Number</Text>
          <Text style={styles.subtitle}>
            SafeSafar requires your mobile number for emergency SOS alerts and live walk tracking with guardians.
          </Text>

          <View style={[styles.inputRow, !!error && styles.inputError]}>
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
              value={phone}
              onChangeText={(val) => {
                setPhone(val);
                if (error) setError(null);
              }}
              editable={!loading}
              autoFocus
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Save & Continue</Text>
            )}
          </TouchableOpacity>

          {onDismiss && (
            <TouchableOpacity style={styles.skipButton} onPress={onDismiss}>
              <Text style={styles.skipText}>Set up later in Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 28,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHover || '#1F2937',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 52,
    width: '100%',
    marginBottom: 8,
  },
  inputError: {
    borderColor: colors.danger,
  },
  prefixWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  prefixText: {
    ...typography.bodyPrimary,
    color: colors.textPrimary,
    marginLeft: 4,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skipButton: {
    marginTop: 14,
    paddingVertical: 6,
  },
  skipText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
