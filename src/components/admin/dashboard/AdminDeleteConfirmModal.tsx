import React from 'react';
import { View, Modal } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import { colors } from '../../../theme/tokens';
import { modalStyles as styles } from './modalStyles';
import type { AdminSchool } from './types';

interface AdminDeleteConfirmModalProps {
  visible: boolean;
  school: AdminSchool | null;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

export default function AdminDeleteConfirmModal({
  visible,
  school,
  onConfirm,
  onCancel,
  deleting,
}: AdminDeleteConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.deleteModal}>
          <View style={styles.deleteIconWrap}>
            <AlertTriangle size={28} color={colors.error} />
          </View>
          <AppText style={styles.deleteTitle}>Delete School?</AppText>
          <AppText style={styles.deleteMessage}>
            This action is permanent. The following school will be removed:
          </AppText>
          <View style={styles.deleteSchoolName}>
            <AppText style={styles.deleteSchoolNameText}>
              {school?.school_id} — {school?.name}
            </AppText>
          </View>
          <View style={styles.deleteActions}>
            <View style={{ flex: 1 }}>
              <AppButton title="Cancel" onPress={onCancel} type="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title={deleting ? '...' : 'Delete'} onPress={onConfirm} disabled={deleting} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
