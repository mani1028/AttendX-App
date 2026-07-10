import React from 'react';
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { X } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { CALENDAR_COLORS } from './helpers';
import { calendarStyles as styles } from './calendarStyles';
import type { Event, FormData } from './types';

export interface CalendarEventFormModalProps {
  visible: boolean;
  editingEvent: Event | null;
  formData: FormData;
  saving: boolean;
  onClose: () => void;
  onChange: (data: FormData) => void;
  onSave: () => void;
}

export default function CalendarEventFormModal({
  visible,
  editingEvent,
  formData,
  saving,
  onClose,
  onChange,
  onSave,
}: CalendarEventFormModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </AppText>
              <TouchableOpacity accessibilityRole="button" onPress={onClose}>
                <X size={24} color={CALENDAR_COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <AppText style={styles.label} weight="semibold">Event Title *</AppText>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Summer Vacation, Diwali Festival"
                  placeholderTextColor={CALENDAR_COLORS.textMuted}
                  value={formData.title}
                  onChangeText={(text) => onChange({ ...formData, title: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <AppText style={styles.label} weight="semibold">Date *</AppText>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={CALENDAR_COLORS.textMuted}
                  value={formData.date}
                  onChangeText={(text) => onChange({ ...formData, date: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <AppText style={styles.label} weight="semibold">Event Type</AppText>
                <View style={styles.pickerContainer}>
                  {['holiday', 'festival', 'exam', 'event'].map((type) => (
                    <TouchableOpacity
                      accessibilityRole="button"
                      key={type}
                      style={[
                        styles.typeOption,
                        formData.type === type && styles.typeOptionActive,
                      ]}
                      onPress={() => onChange({ ...formData, type })}
                    >
                      <AppText
                        style={[
                          styles.typeOptionText,
                          formData.type === type && styles.typeOptionTextActive,
                        ]}
                        weight="bold"
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <AppText style={styles.label} weight="semibold">Description</AppText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional details about this event..."
                  placeholderTextColor={CALENDAR_COLORS.textMuted}
                  value={formData.description}
                  onChangeText={(text) => onChange({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity accessibilityRole="button" style={styles.cancelButton} onPress={onClose}>
                  <AppText style={styles.cancelButtonText} weight="bold">Cancel</AppText>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.submitButton} onPress={onSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color={Theme.colors.card} />
                  ) : (
                    <AppText style={styles.submitButtonText} weight="bold">
                      {editingEvent ? 'Update Event' : 'Add Event'}
                    </AppText>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
