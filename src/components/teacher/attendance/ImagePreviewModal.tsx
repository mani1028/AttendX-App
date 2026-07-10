import React from 'react';
import { View, TouchableOpacity, Image, Modal } from 'react-native';
import { XCircle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { attendanceStyles as styles } from './styles';

interface ImagePreviewModalProps {
  visible: boolean;
  previewImage: string | null;
  onRetake: () => void;
  onConfirm: () => void;
}

export default function ImagePreviewModal({
  visible,
  previewImage,
  onRetake,
  onConfirm,
}: ImagePreviewModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>Confirm Capture</AppText>
            <TouchableOpacity onPress={onRetake}>
              <XCircle size={24} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>
          {previewImage && <Image source={{ uri: previewImage }} style={styles.modalImage} />}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={onRetake}>
              <AppText style={styles.modalBtnTextSecondary}>Retake</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={onConfirm}>
              <AppText style={styles.modalBtnTextPrimary}>Use Photo</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
