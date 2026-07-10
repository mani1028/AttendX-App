import React from 'react';
import { View, TouchableOpacity, Modal } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { attendanceStyles as styles } from './styles';

interface AttendanceErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function AttendanceErrorModal({
  visible,
  title,
  message,
  onClose,
}: AttendanceErrorModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.errorModalOverlay}>
        <View style={styles.errorModalContent}>
          <View style={styles.errorModalIconContainer}>
            <AlertCircle size={40} color={Theme.colors.error} />
          </View>
          <AppText style={styles.errorModalTitle}>{title}</AppText>
          <AppText style={styles.errorModalMessage}>{message}</AppText>
          <TouchableOpacity style={styles.errorModalButton} onPress={onClose} activeOpacity={0.8}>
            <AppText style={styles.errorModalButtonText}>OK</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
