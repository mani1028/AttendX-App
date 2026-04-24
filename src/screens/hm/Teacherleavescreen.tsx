import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';

// Local theme bridge
const C = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textMuted,
  primary: colors.primary,
  primarySoft: colors.primary + '20',
  success: colors.success,
  successSoft: colors.successSoft,
  error: colors.error,
  errorSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
};

interface LeaveRequest {
  leave_id: string;
  teacher_id: string;
  teacher_full_name?: string;
  employee_id?: string;
  designation?: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

const getSchoolCode = async (): Promise<string> => {
  return await AsyncStorage.getItem('school_code') ||
    await AsyncStorage.getItem('schoolCode') ||
    '';
};

const getBranchId = async (): Promise<string> => {
  return await AsyncStorage.getItem('branch_id') ||
    await AsyncStorage.getItem('branchId') ||
    '';
};

export default function HMTeacherLeavesPage() {
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('PENDING');
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load credentials
  useEffect(() => {
    loadCredentials();
  }, []);

  useEffect(() => {
    if (schoolCode && branchId) {
      loadRequests();
    }
  }, [schoolCode, branchId, status]);

  const loadCredentials = async () => {
    const code = await getSchoolCode();
    const branch = await getBranchId();
    setSchoolCode(code);
    setBranchId(branch);
  };

  const loadRequests = async () => {
    if (!schoolCode || !branchId) return;

    setMsg('');
    setError('');
    setLoading(true);

    try {
      const res = await API.post('/manage/hm/teacher-leave-requests', {
        school_code: schoolCode,
        branch_id: branchId,
        status: status || null,
      });

      setItems(res.data?.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load leave requests');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const actOnLeave = async (leaveId: string, action: 'APPROVED' | 'REJECTED') => {
    setMsg('');
    setError('');
    setActionLoading(true);

    try {
      await API.put('/manage/hm/teacher-leave-requests/action', {
        school_code: schoolCode,
        leave_id: leaveId,
        action,
      });

      setMsg(`Leave ${action.toLowerCase()} successfully`);
      await loadRequests();
      
      // Auto clear message after 3 seconds
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update leave status');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
      setShowStatusModal(false);
      setSelectedLeave(null);
    }
  };

  const confirmAction = (leave: LeaveRequest, action: 'APPROVED' | 'REJECTED') => {
    setSelectedLeave(leave);
    setShowStatusModal(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: C.successSoft, color: C.success, icon: 'check-circle' };
      case 'REJECTED':
        return { bg: C.errorSoft, color: C.error, icon: 'x-circle' };
      default:
        return { bg: C.warningSoft, color: C.warning, icon: 'clock' };
    }
  };

  const pendingCount = items.filter((item) => item.status === 'PENDING').length;

  const renderLeaveCard = (item: LeaveRequest) => {
    const statusStyle = getStatusStyle(item.status);
    const isPending = item.status === 'PENDING';

    return (
      <View key={item.leave_id} style={styles.leaveCard}>
        <View style={styles.cardHeader}>
          <View style={styles.teacherInfo}>
            <View style={styles.teacherAvatar}>
              <AppText style={styles.avatarText}>
                {(item.teacher_full_name || item.teacher_id).charAt(0).toUpperCase()}
              </AppText>
            </View>
            <View>
              <AppText style={styles.teacherName}>
                {item.teacher_full_name || item.teacher_id}
              </AppText>
              <AppText style={styles.employeeId}>
                ID: {item.employee_id || '-'} • {item.designation || 'Teacher'}
              </AppText>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon as any} size={12} color={statusStyle.color} />
            <AppText style={[styles.statusText, { color: statusStyle.color }]}>
              {item.status}
            </AppText>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.dateRange}>
            <View style={styles.dateItem}>
              <Icon name="calendar" size={14} color={C.textMuted} />
              <AppText style={styles.dateLabel}>From:</AppText>
              <AppText style={styles.dateValue}>{formatDate(item.from_date)}</AppText>
            </View>
            <View style={styles.dateItem}>
              <Icon name="calendar" size={14} color={C.textMuted} />
              <AppText style={styles.dateLabel}>To:</AppText>
              <AppText style={styles.dateValue}>{formatDate(item.to_date)}</AppText>
            </View>
          </View>

          <View style={styles.reasonContainer}>
            <AppText style={styles.reasonLabel}>Reason:</AppText>
            <AppText style={styles.reasonText}>{item.reason}</AppText>
          </View>

          <View style={styles.appliedDate}>
            <Icon name="clock" size={12} color={C.textMuted} />
            <AppText style={styles.appliedDateText}>
              Applied on: {formatDate(item.created_at)}
            </AppText>
          </View>
        </View>

        {isPending && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => confirmAction(item, 'APPROVED')}
              disabled={actionLoading}
            >
              <Icon name="check" size={14} color="#fff" />
              <AppText style={styles.actionBtnText}>Approve</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => confirmAction(item, 'REJECTED')}
              disabled={actionLoading}
            >
              <Icon name="x" size={14} color="#fff" />
              <AppText style={styles.actionBtnText}>Reject</AppText>
            </TouchableOpacity>
          </View>
        )}

        {!isPending && (
          <View style={styles.resolvedStatus}>
            <AppText style={styles.resolvedText}>
              {item.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
            </AppText>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Icon name="calendar" size={20} color={C.primary} />
            <View>
              <AppText style={styles.title}>Teacher Leave Approvals</AppText>
              <AppText style={styles.subText}>
                {pendingCount > 0 ? `${pendingCount} pending` : 'All reviewed'}
              </AppText>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadRequests} disabled={loading}>
            <Icon name="refresh-cw" size={16} color={C.text} />
            <AppText style={styles.refreshBtnText}>Refresh</AppText>
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, status === '' && styles.filterChipActive]}
                onPress={() => setStatus('')}
              >
                <AppText style={[styles.filterChipText, status === '' && styles.filterChipTextActive]}>
                  All Status
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, status === 'PENDING' && styles.filterChipActive]}
                onPress={() => setStatus('PENDING')}
              >
                <AppText style={[styles.filterChipText, status === 'PENDING' && styles.filterChipTextActive]}>
                  Pending
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, status === 'APPROVED' && styles.filterChipActive]}
                onPress={() => setStatus('APPROVED')}
              >
                <AppText style={[styles.filterChipText, status === 'APPROVED' && styles.filterChipTextActive]}>
                  Approved
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, status === 'REJECTED' && styles.filterChipActive]}
                onPress={() => setStatus('REJECTED')}
              >
                <AppText style={[styles.filterChipText, status === 'REJECTED' && styles.filterChipTextActive]}>
                  Rejected
                </AppText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Messages */}
        {msg ? (
          <View style={[styles.message, styles.successMessage]}>
            <Icon name="check-circle" size={16} color={C.success} />
            <AppText style={styles.successMessageText}>{msg}</AppText>
          </View>
        ) : null}
        
        {error ? (
          <View style={[styles.message, styles.errorMessage]}>
            <Icon name="alert-circle" size={16} color={C.error} />
            <AppText style={styles.errorMessageText}>{error}</AppText>
          </View>
        ) : null}

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <AppText style={styles.statNumber}>{items.length}</AppText>
            <AppText style={styles.statLabel}>Total Requests</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={[styles.statNumber, styles.pendingNumber]}>{pendingCount}</AppText>
            <AppText style={styles.statLabel}>Pending</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={[styles.statNumber, styles.approvedNumber]}>
              {items.filter(i => i.status === 'APPROVED').length}
            </AppText>
            <AppText style={styles.statLabel}>Approved</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={[styles.statNumber, styles.rejectedNumber]}>
              {items.filter(i => i.status === 'REJECTED').length}
            </AppText>
            <AppText style={styles.statLabel}>Rejected</AppText>
          </View>
        </View>

        {/* Leave Requests List */}
        {loading && items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <AppText style={styles.loadingText}>Loading leave requests...</AppText>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={48} color={C.textMuted} />
            <AppText style={styles.emptyTitle}>No leave requests found</AppText>
            <AppText style={styles.emptyText}>
              {status ? `No ${status.toLowerCase()} leave requests` : 'No leave requests available'}
            </AppText>
          </View>
        ) : (
          <View style={styles.leavesList}>
            <View style={styles.listHeader}>
              <AppText style={styles.listHeaderTitle}>Leave Requests</AppText>
              <AppText style={styles.listHeaderCount}>{items.length} total</AppText>
            </View>
            {items.map(renderLeaveCard)}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Confirm Action</AppText>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Icon name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <AppText style={styles.modalMessage}>
                Are you sure you want to {selectedLeave?.status === 'PENDING' ? 'process this' : ''} leave request for
              </AppText>
              <AppText style={styles.modalTeacherName}>
                {selectedLeave?.teacher_full_name || selectedLeave?.teacher_id}
              </AppText>
              <AppText style={styles.modalDates}>
                From {selectedLeave ? formatDate(selectedLeave.from_date) : ''} to {selectedLeave ? formatDate(selectedLeave.to_date) : ''}
              </AppText>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setShowStatusModal(false)}
              >
                <AppText style={styles.cancelModalBtnText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.approveModalBtn]}
                onPress={() => selectedLeave && actOnLeave(selectedLeave.leave_id, 'APPROVED')}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="check" size={14} color="#fff" />
                    <AppText style={styles.approveModalBtnText}>Approve</AppText>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.rejectModalBtn]}
                onPress={() => selectedLeave && actOnLeave(selectedLeave.leave_id, 'REJECTED')}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="x" size={14} color="#fff" />
                    <AppText style={styles.rejectModalBtnText}>Reject</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    gap: 12,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  subText: {
    color: C.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  successMessage: {
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.success + '40',
  },
  successMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: C.success,
  },
  errorMessage: {
    backgroundColor: C.errorSoft,
    borderWidth: 1,
    borderColor: C.error + '40',
  },
  errorMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: C.error,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  pendingNumber: {
    color: C.warning,
  },
  approvedNumber: {
    color: C.success,
  },
  rejectedNumber: {
    color: C.error,
  },
  statLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: C.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: C.card,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 4,
  },
  leavesList: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  listHeaderCount: {
    fontSize: 12,
    color: C.textMuted,
  },
  leaveCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teacherAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.primary,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  employeeId: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
  },
  dateRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: C.textMuted,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
  },
  reasonContainer: {
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
  },
  appliedDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedDateText: {
    fontSize: 11,
    color: C.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveBtn: {
    backgroundColor: C.success,
  },
  rejectBtn: {
    backgroundColor: C.error,
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  resolvedStatus: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: 'center',
  },
  resolvedText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: 16,
    width: '85%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: C.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalTeacherName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  modalDates: {
    fontSize: 13,
    color: C.textMuted,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelModalBtn: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
  },
  approveModalBtn: {
    backgroundColor: C.success,
  },
  approveModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  rejectModalBtn: {
    backgroundColor: C.error,
  },
  rejectModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});