import React from 'react';
import { View, TextInput, TouchableOpacity, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import { Theme } from '../../../theme/tokens';
import { marksEntryStyles as styles } from './marksEntryStyles';

interface ExamConfigModalProps {
  visible: boolean;
  maxMarks: string;
  passMarks: string;
  onMaxMarksChange: (value: string) => void;
  onPassMarksChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}

export default function ExamConfigModal({
  visible,
  maxMarks,
  passMarks,
  onMaxMarksChange,
  onPassMarksChange,
  onSave,
  onClose,
  saving,
}: ExamConfigModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.configModalContent}>
          <View style={styles.modalHeader}>
            <AppText weight="bold" style={styles.modalTitle}>Exam Configuration</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <X size={20} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>

          <View style={styles.configModalBody}>
            <AppText weight="bold" style={styles.modalLabel}>Total Marks</AppText>
            <TextInput
              style={styles.configInput}
              placeholder="Enter total marks"
              keyboardType="numeric"
              value={maxMarks}
              onChangeText={onMaxMarksChange}
            />

            <AppText weight="bold" style={[styles.modalLabel, { marginTop: Theme.spacing.md }]}>Pass Marks</AppText>
            <TextInput
              style={styles.configInput}
              placeholder="Enter pass marks"
              keyboardType="numeric"
              value={passMarks}
              onChangeText={onPassMarksChange}
            />
          </View>

          <View style={styles.modalFooter}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton title={saving ? 'Saving...' : 'Save Config'} onPress={onSave} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
