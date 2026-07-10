import React from 'react';
import { View, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import AppButton from '../common/AppButton';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';
import type { EditField } from './types';
import { profileStyles as styles } from './profileStyles';

interface ProfileEditModalProps {
  visible: boolean;
  editField: EditField;
  editLoading: boolean;
  onClose: () => void;
  onChangeValue: (value: string) => void;
  onSave: () => void;
}

export default function ProfileEditModal({
  visible,
  editField,
  editLoading,
  onClose,
  onChangeValue,
  onSave,
}: ProfileEditModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>Edit {editField.label}</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.passwordInputGroup}>
              <AppText style={styles.passwordInputLabel}>{editField.label}</AppText>
              <TextInput
                style={styles.passwordInput}
                value={editField.value}
                onChangeText={onChangeValue}
                placeholder={`Enter ${editField.label.toLowerCase()}`}
                placeholderTextColor={Theme.colors.textSec}
                autoFocus
              />
            </View>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.cancelBtn, { flex: 1, marginRight: 10 }]}
              onPress={onClose}
            >
              <AppText style={styles.cancelBtnText}>Cancel</AppText>
            </TouchableOpacity>
            <AppButton
              title={editLoading ? 'Saving...' : 'Save Changes'}
              onPress={onSave}
              disabled={editLoading}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
