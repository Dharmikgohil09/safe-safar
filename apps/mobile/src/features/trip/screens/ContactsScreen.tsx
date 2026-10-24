import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import { useReduceMotion } from '../../../components/ui';
import {
  normalizePhone,
  type Contact,
} from '../../emergency';
import { getTripContacts, saveTripContacts } from '../storage/contactsStorage';
import { colors } from '../../../theme';
import type { ContactFormData, FeedbackNotice, FormValidationErrors } from '../types';

const MAX_CONTACTS = 5;

function AnimatedContactRow({
  children,
  index,
  reduceMotion,
}: {
  children: React.ReactNode;
  index: number;
  reduceMotion: boolean;
}) {
  const opacity = React.useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = React.useRef(new Animated.Value(reduceMotion ? 0 : 10)).current;

  React.useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.delay(index * 60),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();
  }, [reduceMotion, index]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function ContactsScreen() {
  const reduceMotion = useReduceMotion();
  const [contacts, setLocalContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  // Modal states
  const [isFormModalVisible, setIsFormModalVisible] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<ContactFormData>({ name: '', phone: '' });
  const [formErrors, setFormErrors] = useState<FormValidationErrors>({});

  // Delete confirmation modal state
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Load contacts from SecureStore on mount
  const loadContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await getTripContacts();
      setLocalContacts(stored);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not load contacts from secure storage.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Format phone display with standard spacing (+91 XXXXX XXXXX)
  const formatPhoneDisplay = (phone: string): string => {
    const norm = normalizePhone(phone) ?? phone;
    if (norm.startsWith('+91') && norm.length === 13) {
      return `${norm.slice(0, 3)} ${norm.slice(3, 8)} ${norm.slice(8)}`;
    }
    return norm;
  };

  // Get initials for avatar
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Open Add modal
  const handleOpenAddModal = () => {
    if (contacts.length >= MAX_CONTACTS) {
      setFeedback({
        type: 'info',
        message: `Maximum of ${MAX_CONTACTS} trusted contacts reached. Remove an existing contact to add another.`,
      });
      return;
    }
    setFormMode('add');
    setFormData({ name: '', phone: '' });
    setFormErrors({});
    setIsFormModalVisible(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (contact: Contact) => {
    setFormMode('edit');
    setFormData({ id: contact.id, name: contact.name, phone: contact.phone });
    setFormErrors({});
    setIsFormModalVisible(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormValidationErrors = {};
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      errors.name = 'Please enter a name for this contact.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters long.';
    }

    const normalized = normalizePhone(formData.phone);
    if (!formData.phone.trim()) {
      errors.phone = 'Please enter a phone number.';
    } else if (!normalized) {
      errors.phone = 'Enter a valid 10-digit Indian number or full number with country code.';
    } else {
      // Check for duplicate phone in other contacts
      const duplicate = contacts.find(
        (c) => c.phone === normalized && c.id !== formData.id
      );
      if (duplicate) {
        errors.phone = `This phone number is already saved as "${duplicate.name}".`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Save (Add or Edit)
  const handleSaveContact = async () => {
    if (!validateForm()) return;

    const normalized = normalizePhone(formData.phone);
    if (!normalized) return;

    try {
      setIsSaving(true);
      let updatedList: Contact[];

      if (formMode === 'add') {
        const newContact: Contact = {
          id: Date.now().toString(),
          name: formData.name.trim(),
          phone: normalized,
        };
        updatedList = [...contacts, newContact];
      } else {
        updatedList = contacts.map((c) =>
          c.id === formData.id
            ? { ...c, name: formData.name.trim(), phone: normalized }
            : c
        );
      }

      // Persist through platform-aware contacts storage (SecureStore on Android, localStorage on web)
      const saved = await saveTripContacts(updatedList);
      setLocalContacts(saved);
      setIsFormModalVisible(false);
      setFeedback({
        type: 'success',
        message:
          formMode === 'add'
            ? `Added ${formData.name.trim()} to your trusted contacts.`
            : `Updated ${formData.name.trim()}'s contact information.`,
      });
    } catch {
      setFormErrors({ general: 'Failed to write to secure storage. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      setIsSaving(true);
      const updatedList = contacts.filter((c) => c.id !== contactToDelete.id);
      const saved = await saveTripContacts(updatedList);
      setLocalContacts(saved);
      const deletedName = contactToDelete.name;
      setContactToDelete(null);
      setFeedback({
        type: 'info',
        message: `Removed ${deletedName} from your safety circle.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not remove contact from secure storage.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Normalized preview value
  const phonePreview = useMemo(() => {
    if (!formData.phone.trim()) return null;
    const norm = normalizePhone(formData.phone);
    return norm ? formatPhoneDisplay(norm) : null;
  }, [formData.phone]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWrapper}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.headerBadge}>
                <MaterialIcons name="security" size={14} color={colors.primary} />
                <Text style={styles.headerBadgeText}>On-Device Encrypted • Offline Ready</Text>
              </View>
              <Text style={styles.title}>Trusted Contacts</Text>
              <Text style={styles.subtitle}>
                Your trusted safety circle when you need immediate help or journey check-ins.
              </Text>
            </View>

            {/* Feedback Banner */}
            {feedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  feedback.type === 'error' && styles.feedbackBannerError,
                  feedback.type === 'info' && styles.feedbackBannerInfo,
                ]}
                accessibilityLiveRegion="polite"
              >
                <MaterialIcons
                  name={
                    feedback.type === 'error'
                      ? 'error-outline'
                      : feedback.type === 'info'
                      ? 'info-outline'
                      : 'check-circle'
                  }
                  size={18}
                  color={
                    feedback.type === 'error'
                      ? '#C83F43'
                      : feedback.type === 'info'
                      ? '#2A6B8A'
                      : colors.primary
                  }
                />
                <Text
                  style={[
                    styles.feedbackText,
                    feedback.type === 'error' && styles.feedbackTextError,
                    feedback.type === 'info' && styles.feedbackTextInfo,
                  ]}
                >
                  {feedback.message}
                </Text>
              </View>
            )}

            {/* Summary & Protocol Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleRow}>
                  <MaterialIcons name="people" size={20} color={colors.primary} />
                  <Text style={styles.summaryTitle}>Safety Circle Status</Text>
                </View>
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>
                    {contacts.length} / {MAX_CONTACTS} Saved
                  </Text>
                </View>
              </View>
              <Text style={styles.summaryExplanation}>
                In an SOS trigger, these contacts receive direct automated SMS alerts with your live
                coordinates, followed by sequential phone calls.
              </Text>
              <View style={styles.priorityNote}>
                <MaterialIcons name="info-outline" size={14} color="#557565" />
                <Text style={styles.priorityNoteText}>
                  Contacts are called in sequence. Contact 1 serves as your primary contact.
                </Text>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.addContactButton,
                contacts.length >= MAX_CONTACTS && styles.addContactButtonDisabled,
              ]}
              onPress={handleOpenAddModal}
              disabled={contacts.length >= MAX_CONTACTS}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Add new trusted contact"
              accessibilityHint="Opens form to save a new contact"
            >
              <MaterialIcons name="person-add" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.addContactButtonText}>
                {contacts.length === 0 ? 'Add First Contact' : 'Add Trusted Contact'}
              </Text>
            </TouchableOpacity>

            {/* Contact Cards Section */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Saved Contacts</Text>
                {contacts.length > 0 && (
                  <Text style={styles.sectionSubtitle}>
                    {contacts.length === 1 ? '1 contact' : `${contacts.length} contacts`}
                  </Text>
                )}
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Reading secure local storage...</Text>
              </View>
            ) : contacts.length === 0 ? (
              /* Deliberate Empty State */
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="contact-emergency" size={36} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Build your emergency circle</Text>
                <Text style={styles.emptyDescription}>
                  You have not added any trusted contacts yet. Add family members, trusted friends,
                  or guardians who should be notified when you need help.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={handleOpenAddModal}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Add your first trusted contact"
                >
                  <MaterialIcons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyActionButtonText}>Add Your First Contact</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Contact Cards List */
              <View style={styles.contactList}>
                {contacts.map((contact, index) => {
                  const isPrimary = index === 0;
                  return (
                    <AnimatedContactRow key={contact.id} index={index} reduceMotion={reduceMotion}>
                    <View style={styles.contactCard}>
                      <View style={styles.cardMainRow}>
                        {/* Avatar */}
                        <View style={[styles.avatar, isPrimary && styles.avatarPrimary]}>
                          <Text style={[styles.avatarText, isPrimary && styles.avatarTextPrimary]}>
                            {getInitials(contact.name)}
                          </Text>
                        </View>

                        {/* Name and Phone */}
                        <View style={styles.contactDetails}>
                          <View style={styles.contactNameRow}>
                            <Text style={styles.contactName} numberOfLines={1}>
                              {contact.name}
                            </Text>
                            {isPrimary ? (
                              <View style={styles.primaryBadge}>
                                <MaterialIcons name="star" size={11} color={colors.primary} />
                                <Text style={styles.primaryBadgeText}>Primary</Text>
                              </View>
                            ) : (
                              <View style={styles.priorityBadge}>
                                <Text style={styles.priorityBadgeText}>Priority #{index + 1}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.contactPhone}>
                            {formatPhoneDisplay(contact.phone)}
                          </Text>
                        </View>
                      </View>

                      {/* Card Action Controls */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.cardActionButton}
                          onPress={() => handleOpenEditModal(contact)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit contact ${contact.name}`}
                        >
                          <MaterialIcons name="edit" size={16} color="#355648" />
                          <Text style={styles.cardActionEditText}>Edit</Text>
                        </TouchableOpacity>

                        <View style={styles.cardActionDivider} />

                        <TouchableOpacity
                          style={styles.cardActionButton}
                          onPress={() => setContactToDelete(contact)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove contact ${contact.name}`}
                        >
                          <MaterialIcons name="delete-outline" size={16} color="#A73336" />
                          <Text style={styles.cardActionDeleteText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    </AnimatedContactRow>
                  );
                })}
              </View>
            )}

            {/* Offline Resilience Footer */}
            <View style={styles.footerNote}>
              <MaterialIcons name="offline-bolt" size={16} color="#75847A" />
              <Text style={styles.footerNoteText}>
                Contacts are saved locally in device secure storage so SOS alerts trigger without
                requiring an active internet connection.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add / Edit Contact Modal */}
      <Modal
        visible={isFormModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !isSaving && setIsFormModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => !isSaving && setIsFormModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {formMode === 'add' ? 'Add Trusted Contact' : 'Edit Contact'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {formMode === 'add'
                    ? 'They will be reached during safety alerts.'
                    : 'Update details for this trusted contact.'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => !isSaving && setIsFormModalVisible(false)}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Close form"
              >
                <MaterialIcons name="close" size={22} color="#607268" />
              </TouchableOpacity>
            </View>

            {formErrors.general && (
              <View style={styles.generalErrorBanner}>
                <MaterialIcons name="error-outline" size={16} color="#C83F43" />
                <Text style={styles.generalErrorText}>{formErrors.general}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[styles.textInput, formErrors.name ? styles.inputError : null]}
                placeholder="e.g. Maya Sharma"
                placeholderTextColor="#9EAFA7"
                value={formData.name}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, name: text }));
                  if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                }}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!isSaving}
                accessibilityLabel="Contact full name"
              />
              {formErrors.name && (
                <Text style={styles.fieldErrorText}>{formErrors.name}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Mobile Phone Number</Text>
              <TextInput
                style={[styles.textInput, formErrors.phone ? styles.inputError : null]}
                placeholder="e.g. 9876543210 or +919876543210"
                placeholderTextColor="#9EAFA7"
                value={formData.phone}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, phone: text }));
                  if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                keyboardType="phone-pad"
                returnKeyType="done"
                editable={!isSaving}
                accessibilityLabel="Contact phone number"
              />
              {formErrors.phone ? (
                <Text style={styles.fieldErrorText}>{formErrors.phone}</Text>
              ) : phonePreview ? (
                <View style={styles.validPreviewRow}>
                  <MaterialIcons name="check" size={14} color={colors.primary} />
                  <Text style={styles.validPreviewText}>Standardized as: {phonePreview}</Text>
                </View>
              ) : (
                <Text style={styles.inputHelpText}>
                  10-digit Indian numbers (+91) will be standardized automatically.
                </Text>
              )}
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsFormModalVisible(false)}
                disabled={isSaving}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveContact}
                disabled={isSaving}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Save contact"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {formMode === 'add' ? 'Save Contact' : 'Save Changes'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={Boolean(contactToDelete)}
        animationType="fade"
        transparent
        onRequestClose={() => !isSaving && setContactToDelete(null)}
      >
        <View style={styles.modalBackdropCenter}>
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => !isSaving && setContactToDelete(null)}
          />
          <View style={styles.deleteDialogCard}>
            <View style={styles.deleteDialogIconCircle}>
              <MaterialIcons name="delete-forever" size={32} color="#C83F43" />
            </View>
            <Text style={styles.deleteDialogTitle}>Remove from Safety Circle?</Text>
            <Text style={styles.deleteDialogBody}>
              Are you sure you want to remove <Text style={styles.boldText}>{contactToDelete?.name}</Text> (
              {contactToDelete ? formatPhoneDisplay(contactToDelete.phone) : ''})? They will no
              longer receive automated SOS alerts or emergency phone calls.
            </Text>

            <View style={styles.deleteDialogActions}>
              <TouchableOpacity
                style={styles.deleteDialogCancelBtn}
                onPress={() => setContactToDelete(null)}
                disabled={isSaving}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Keep contact"
              >
                <Text style={styles.deleteDialogCancelText}>Keep Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteDialogConfirmBtn,
                  isSaving && styles.deleteDialogConfirmDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={isSaving}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Confirm removal of contact"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteDialogConfirmText}>Remove Contact</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 620,
  },

  /* Header Section */
  header: {
    marginBottom: 20,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 10,
    gap: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#65766C',
    marginTop: 6,
  },

  /* Feedback Banner */
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  feedbackBannerError: {
    backgroundColor: '#FDECEC',
    borderColor: '#F5C6CB',
  },
  feedbackBannerInfo: {
    backgroundColor: '#EBF4F9',
    borderColor: '#CFE3EE',
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1B5E20',
  },
  feedbackTextError: {
    color: '#C83F43',
  },
  feedbackTextInfo: {
    color: '#1B4D63',
  },

  /* Summary Card */
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1EAE4',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(20, 107, 75, 0.06)',
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryExplanation: {
    fontSize: 13,
    lineHeight: 19,
    color: '#55695E',
  },
  priorityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAF8',
    borderRadius: 10,
    padding: 9,
    marginTop: 10,
    gap: 8,
  },
  priorityNoteText: {
    fontSize: 12,
    color: '#557565',
    flex: 1,
  },

  /* Add Contact Button */
  addContactButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 10px rgba(20, 107, 75, 0.2)',
      },
    }),
  },
  addContactButtonDisabled: {
    backgroundColor: '#A0BCB0',
  },
  buttonIcon: {
    marginRight: 8,
  },
  addContactButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#65766C',
  },

  /* Loading State */
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#65766C',
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1EAE4',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#65766C',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 360,
  },
  emptyActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Contact List & Cards */
  contactList: {
    gap: 12,
    marginBottom: 20,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1EAE4',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(20, 107, 75, 0.04)',
      },
    }),
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F1EC',
    borderWidth: 1,
    borderColor: '#CFE0D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPrimary: {
    backgroundColor: '#D7EDE0',
    borderColor: '#98CDB0',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A5D44',
  },
  avatarTextPrimary: {
    color: colors.primary,
  },
  contactDetails: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  priorityBadge: {
    backgroundColor: '#F0F4F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#65766C',
  },
  contactPhone: {
    fontSize: 13,
    color: '#64756C',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F4F2',
    marginTop: 14,
    paddingTop: 10,
    gap: 12,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
    minHeight: 36,
  },
  cardActionEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#355648',
  },
  cardActionDeleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A73336',
  },
  cardActionDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E1EAE4',
  },

  /* Footer Note */
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF5F0',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 10,
  },
  footerNoteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#52695E',
    flex: 1,
  },

  /* Form Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(14, 35, 25, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#65766C',
    marginTop: 3,
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#F0F4F2',
  },
  generalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  generalErrorText: {
    fontSize: 12,
    color: '#C83F43',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 7,
  },
  textInput: {
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: '#D4E2D9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: '#C83F43',
    backgroundColor: '#FFF8F8',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#C83F43',
    marginTop: 5,
    fontWeight: '500',
  },
  inputHelpText: {
    fontSize: 11,
    color: '#76877E',
    marginTop: 5,
  },
  validPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  validPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E2D9',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#55695E',
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0BCB0',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Delete Dialog Modal */
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(14, 35, 25, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteDialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      },
    }),
  },
  deleteDialogIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  deleteDialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteDialogBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#65766C',
    textAlign: 'center',
    marginBottom: 20,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deleteDialogActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  deleteDialogCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4E2D9',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  deleteDialogCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#55695E',
  },
  deleteDialogConfirmBtn: {
    flex: 1,
    backgroundColor: '#C83F43',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  deleteDialogConfirmDisabled: {
    backgroundColor: '#E59B9E',
  },
  deleteDialogConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
