import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Calendar, X, CheckCircle2, XCircle } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';
import { teacherLeaveStyles as styles } from './teacherLeaveStyles';
import type { TeacherLeave } from './types';

export interface TeacherLeaveDetailModalProps {
  leave: TeacherLeave | null;
  actionLoading: boolean;
  onClose: () => void;
  onStatusUpdate: (leaveId: number, status: 'APPROVED' | 'REJECTED') => void;
}

export default function TeacherLeaveDetailModal({
  leave,
  actionLoading,
  onClose,
  onStatusUpdate,
}: TeacherLeaveDetailModalProps) {
  return (
    <Modal
      visible={!!leave}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        {leave ? (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave Details</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.detailTeacherInfo}>
                <View style={styles.largeAvatar}>
                  <Text style={styles.largeAvatarText}>{(leave.teacher_full_name || '?').charAt(0)}</Text>
                </View>
                <Text style={styles.detailTeacherName}>{leave.teacher_full_name}</Text>
                <Text style={styles.detailTeacherSubject}>{leave.subject || 'Class Teacher'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Duration</Text>
                <View style={styles.detailRow}>
                  <Calendar size={18} color={Theme.colors.primaryLight} />
                  <Text style={styles.detailValue}>
                    {new Date(leave.from_date).toLocaleDateString()} to {new Date(leave.to_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Reason</Text>
                <View style={styles.reasonBox}>
                  <Text style={styles.detailReasonText}>{leave.reason}</Text>
                </View>
              </View>

              {leave.status === 'PENDING' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => onStatusUpdate(leave.leave_id, 'REJECTED')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator color={Theme.colors.card} /> : (
                      <>
                        <XCircle size={20} color={Theme.colors.card} style={{ marginRight: Theme.spacing.sm }} />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => onStatusUpdate(leave.leave_id, 'APPROVED')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator color={Theme.colors.card} /> : (
                      <>
                        <CheckCircle2 size={20} color={Theme.colors.card} style={{ marginRight: Theme.spacing.sm }} />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
