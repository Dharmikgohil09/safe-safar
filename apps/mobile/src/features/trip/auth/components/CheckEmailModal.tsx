import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
import { colors, radius, typography } from '../../../../theme';
import { useAuth } from '../../../../context/AuthContext';

interface CheckEmailModalProps {
  visible: boolean;
  email: string;
  onVerified: () => void;
  onClose: () => void;
}

export default function CheckEmailModal({
  visible,
  email,
  onVerified,
  onClose,
}: CheckEmailModalProps) {
  const { resendVerification, checkVerificationStatus } = useAuth();
  const [countdown, setCountdown] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // 30-second cooldown timer for Resend button
  useEffect(() => {
    if (!visible) return;

    setCountdown(30);
    setCanResend(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  // Polling verification status every 4 seconds
  useEffect(() => {
    if (!visible || !email) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await checkVerificationStatus(email);
        if (res.verified) {
          clearInterval(pollInterval);
          onVerified();
        }
      } catch (err) {
        // Continue polling
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [visible, email, onVerified, checkVerificationStatus]);

  // Deep Link listener for safesafar://verified
  useEffect(() => {
    if (!visible) return;

    const handleUrl = (event: { url: string }) => {
      if (event.url.includes('safesafar://verified') || event.url.includes('verified')) {
        onVerified();
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('safesafar://verified') || url.includes('verified'))) {
        onVerified();
      }
    });

    return () => sub.remove();
  }, [visible, onVerified]);

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setResendStatus(null);

    const res = await resendVerification(email);
    setResending(false);

    if (res.success) {
      setResendStatus('Verification email resent!');
      setCanResend(false);
      setCountdown(30);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setResendStatus(res.error || 'Failed to resend email.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <MaterialIcons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <MaterialIcons name="mark-email-read" size={40} color={colors.accent} />
          </View>

          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification link to:
          </Text>
          <Text style={styles.emailHighlight}>{email}</Text>

          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 10 }} />
            <Text style={styles.statusText}>Waiting for email confirmation...</Text>
          </View>

          {resendStatus && (
            <Text style={[styles.feedbackText, resendStatus.includes('resent') ? styles.successText : styles.errorText]}>
              {resendStatus}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.resendButton, !canResend && styles.resendDisabled]}
            onPress={handleResend}
            disabled={!canResend || resending}
          >
            {resending ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
                {canResend ? 'Resend verification email' : `Resend email in ${countdown}s`}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emailHighlight: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: radius.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  statusText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  feedbackText: {
    ...typography.caption,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    color: colors.accent,
  },
  errorText: {
    color: colors.danger,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.accent,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  resendDisabled: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  resendTextDisabled: {
    color: colors.textMuted,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
