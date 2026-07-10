import React from 'react';
import { View, Modal } from 'react-native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import type { RegistrationStyles } from './RegistrationStepper';
import { registrationStyles as defaultStyles } from './registrationStyles';

export interface RollNumberModalProps {
  visible: boolean;
  rollNumber: string;
  onClose: () => void;
  styles?: RegistrationStyles;
}

export default function RollNumberModal({ visible, rollNumber, onClose, styles = defaultStyles }: RollNumberModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <AppText weight="bold" style={styles.modalTitle}>Registration Complete</AppText>
          <AppText style={styles.modalMessage}>
            Your student details were saved successfully and a roll number has been assigned.
          </AppText>
          <View style={styles.rollNumberDisplay}>
            <AppText weight="semibold" style={styles.rollNumberLabel}>Assigned Roll Number</AppText>
            <AppText weight="bold" style={styles.rollNumberValue}>{rollNumber || '—'}</AppText>
          </View>
          <AppText style={styles.modalNote}>Copy this roll number or note it down for records.</AppText>
          <AppButton title="OK" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
