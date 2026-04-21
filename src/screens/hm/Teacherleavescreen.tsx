import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';

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
        return { bg: '#dcfce7', color: '#15803d', icon: 'check-circle' };
      case 'REJECTED':
        return { bg: '#fee2e2', color: '#b91c1c', icon: 'x-circle' };
      default:
        return { bg: '#fef3c7', color: '#b45309', icon: 'clock' };
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
              <Text style={styles.avatarText}>
                {(item.teacher_full_name || item.teacher_id).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.teacherName}>
                {item.teacher_full_name || item.teacher_id}
              </Text>
              <Text style={styles.employeeId}>
                ID: {item.employee_id || '-'} • {item.designation || 'Teacher'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon as any} size={12} color={statusStyle.color} />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.dateRange}>
            <View style={styles.dateItem}>
              <Icon name="calendar" size={14} color="#64748b" />
              <Text style={styles.dateLabel}>From:</Text>
              <Text style={styles.dateValue}>{formatDate(item.from_date)}</Text>
            </View>
            <View style={styles.dateItem}>
              <Icon name="calendar" size={14} color="#64748b" />
              <Text style={styles.dateLabel}>To:</Text>
              <Text style={styles.dateValue}>{formatDate(item.to_date)}</Text>
            </View>
          </View>

          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>

          <View style={styles.appliedDate}>
            <Icon name="clock" size={12} color="#94a3b8" />
            <Text style={styles.appliedDateText}>
              Applied on: {formatDate(item.created_at)}
            </Text>
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
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => confirmAction(item, 'REJECTED')}
              disabled={actionLoading}
            >
              <Icon name="x" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPending && (
          <View style={styles.resolvedStatus}>
            <Text style={styles.resolvedText}>
              {item.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
            </Text>
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
            <Icon name="calendar" size={20} color="#2563eb" />
            <View>
              <Text style={styles.title}>Teacher Leave Approvals</Text>
              <Text style={styles.subText}>
                {pendingCount > 0 ? `${pendingCount} pending` : 'All reviewed'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadRequests} disabled={loading}>
            <Icon name="refresh-cw" size={16} color="#475569" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
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
                <Text style={[styles.filterChipText, status === '' && styles.filterChipTextActive]}>
                  All Status
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, status === 'PENDING' && styles.filterChipActive]}
                onPress={() => setStatus('PENDING')}
              >
                <Text style={[styles.filterChipText, status === 'PENDING' && styles.filterChipTextActive]}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, status === 'APPROVED' && styles.filterChipActive]}
                onPress={() => setStatus('APPROVED')}
              >
                <Text style={[styles.filterChipText, status === 'APPROVED' && styles.filterChipTextActive]}>
                  Approved
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, status === 'REJECTED' && styles.filterChipActive]}
                onPress={() => setStatus('REJECTED')}
              >
                <Text style={[styles.filterChipText, status === 'REJECTED' && styles.filterChipTextActive]}>
                  Rejected
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Messages */}
        {msg ? (
          <View style={[styles.message, styles.successMessage]}>
            <Icon name="check-circle" size={16} color="#1d4ed8" />
            <Text style={styles.successMessageText}>{msg}</Text>
          </View>
        ) : null}
        
        {error ? (
          <View style={[styles.message, styles.errorMessage]}>
            <Icon name="alert-circle" size={16} color="#b91c1c" />
            <Text style={styles.errorMessageText}>{error}</Text>
          </View>
        ) : null}

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{items.length}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.pendingNumber]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.approvedNumber]}>
              {items.filter(i => i.status === 'APPROVED').length}
            </Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.rejectedNumber]}>
              {items.filter(i => i.status === 'REJECTED').length}
            </Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        {/* Leave Requests List */}
        {loading && items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading leave requests...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No leave requests found</Text>
            <Text style={styles.emptyText}>
              {status ? `No ${status.toLowerCase()} leave requests` : 'No leave requests available'}
            </Text>
          </View>
        ) : (
          <View style={styles.leavesList}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Leave Requests</Text>
              <Text style={styles.listHeaderCount}>{items.length} total</Text>
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
              <Text style={styles.modalTitle}>Confirm Action</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Icon name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Are you sure you want to {selectedLeave?.status === 'PENDING' ? 'process this' : ''} leave request for
              </Text>
              <Text style={styles.modalTeacherName}>
                {selectedLeave?.teacher_full_name || selectedLeave?.teacher_id}
              </Text>
              <Text style={styles.modalDates}>
                From {selectedLeave ? formatDate(selectedLeave.from_date) : ''} to {selectedLeave ? formatDate(selectedLeave.to_date) : ''}
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setShowStatusModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
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
                    <Text style={styles.approveModalBtnText}>Approve</Text>
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
                    <Text style={styles.rejectModalBtnText}>Reject</Text>
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
    backgroundColor: '#f3f6fb',
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
    color: '#0f172a',
  },
  subText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
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
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  successMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  pendingNumber: {
    color: '#b45309',
  },
  approvedNumber: {
    color: '#15803d',
  },
  rejectedNumber: {
    color: '#b91c1c',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
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
    color: '#0f172a',
  },
  listHeaderCount: {
    fontSize: 12,
    color: '#64748b',
  },
  leaveCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0284c7',
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  employeeId: {
    fontSize: 11,
    color: '#64748b',
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
    color: '#64748b',
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
  },
  reasonContainer: {
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  appliedDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedDateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
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
    backgroundColor: '#22c55e',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  resolvedStatus: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
  },
  resolvedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
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
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalTeacherName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalDates: {
    fontSize: 13,
    color: '#64748b',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
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
    backgroundColor: '#f1f5f9',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  approveModalBtn: {
    backgroundColor: '#22c55e',
  },
  approveModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  rejectModalBtn: {
    backgroundColor: '#ef4444',
  },
  rejectModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});