import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

// Types
interface LeaveRequest {
  leave_id: string;
  student_full_name: string;
  roll_number: string;
  class_grade: string;
  section: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface ClassItem {
  id: string;
  name: string;
  class_grade: string;
}

interface SectionItem {
  id: string;
  name: string;
  section: string;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getTeacherId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('teacher_id');
  return id || (await AsyncStorage.getItem('teacherId')) || 
         (await AsyncStorage.getItem('employee_id')) || 
         (await AsyncStorage.getItem('employeeId')) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) || '';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = () => {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus === 'APPROVED') return styles.badgeApproved;
    if (upperStatus === 'REJECTED') return styles.badgeRejected;
    return styles.badgePending;
  };

  const getTextStyle = () => {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus === 'APPROVED') return styles.badgeTextApproved;
    if (upperStatus === 'REJECTED') return styles.badgeTextRejected;
    return styles.badgeTextPending;
  };

  const getIcon = () => {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus === 'PENDING') return '⏳';
    if (upperStatus === 'APPROVED') return '✅';
    return '❌';
  };

  return (
    <View style={[styles.badge, getStatusStyle()]}>
      <Text style={styles.badgeIcon}>{getIcon()}</Text>
      <Text style={[styles.badgeText, getTextStyle()]}>
        {status || 'PENDING'}
      </Text>
    </View>
  );
};

// Leave Request Card Component
const LeaveRequestCard: React.FC<{
  request: LeaveRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ request, onApprove, onReject }) => {
  return (
    <AppCard style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.studentName}>{request.student_full_name}</Text>
          <Text style={styles.rollNumber}>Roll No: {request.roll_number}</Text>
        </View>
        <StatusBadge status={request.status} />
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Class:</Text>
          <Text style={styles.detailValue}>{request.class_grade}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Section:</Text>
          <Text style={styles.detailValue}>{request.section}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>From:</Text>
          <Text style={styles.detailValue}>{formatDate(request.from_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>To:</Text>
          <Text style={styles.detailValue}>{formatDate(request.to_date)}</Text>
        </View>
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Reason:</Text>
          <Text style={styles.reasonText}>{request.reason}</Text>
        </View>
      </View>

      {request.status === 'PENDING' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onApprove(request.leave_id)}
          >
            <Text style={styles.actionBtnText}>✓ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onReject(request.leave_id)}
          >
            <Text style={styles.actionBtnText}>✗ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </AppCard>
  );
};

// Filter Modal Component
const FilterModal: React.FC<{
  visible: boolean;
  classes: ClassItem[];
  sections: SectionItem[];
  selectedClass: string;
  selectedSection: string;
  selectedStatus: string;
  loading: boolean;
  onSelectClass: (classId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onSelectStatus: (status: string) => void;
  onApply: () => void;
  onClose: () => void;
}> = ({
  visible,
  classes,
  sections,
  selectedClass,
  selectedSection,
  selectedStatus,
  loading,
  onSelectClass,
  onSelectSection,
  onSelectStatus,
  onApply,
  onClose,
}) => {
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Leave Requests</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Class Filter */}
            <Text style={styles.modalLabel}>Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                <TouchableOpacity
                  style={[styles.chip, !selectedClass && styles.chipActive]}
                  onPress={() => onSelectClass('')}
                >
                  <Text style={[styles.chipText, !selectedClass && styles.chipTextActive]}>
                    All Classes
                  </Text>
                </TouchableOpacity>
                {classes.map((cls) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[styles.chip, selectedClass === cls.id && styles.chipActive]}
                    onPress={() => onSelectClass(cls.id)}
                  >
                    <Text style={[styles.chipText, selectedClass === cls.id && styles.chipTextActive]}>
                      {cls.name || cls.class_grade || `Class ${cls.id}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Section Filter */}
            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Section</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                <TouchableOpacity
                  style={[styles.chip, !selectedSection && styles.chipActive]}
                  onPress={() => onSelectSection('')}
                >
                  <Text style={[styles.chipText, !selectedSection && styles.chipTextActive]}>
                    All Sections
                  </Text>
                </TouchableOpacity>
                {sections.map((sec) => (
                  <TouchableOpacity
                    key={sec.id}
                    style={[styles.chip, selectedSection === sec.id && styles.chipActive]}
                    onPress={() => onSelectSection(sec.id)}
                  >
                    <Text style={[styles.chipText, selectedSection === sec.id && styles.chipTextActive]}>
                      {sec.name || sec.section || `Section ${sec.id}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Status Filter */}
            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {statusOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, selectedStatus === opt.value && styles.chipActive]}
                    onPress={() => onSelectStatus(opt.value)}
                  >
                    <Text style={[styles.chipText, selectedStatus === opt.value && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </ScrollView>

          <View style={styles.modalFooter}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton title="Apply Filters" onPress={onApply} disabled={loading} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function LeaveApprovalScreen() {
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [resolvedTeacherId, setResolvedTeacherId] = useState<string>('');
  
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Filters
  const [classId, setClassId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('');
  const [status, setStatus] = useState<string>('PENDING');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  
  // Classes/Sections
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loadingClassesSections, setLoadingClassesSections] = useState<boolean>(false);

  // Load credentials
  useEffect(() => {
    const loadCredentials = async () => {
      const code = await getSchoolCode();
      const tid = await getTeacherId();
      const bid = await getBranchId();
      setSchoolCode(code);
      setTeacherId(tid);
      setBranchId(bid);
    };
    loadCredentials();
  }, []);

  // Resolve teacher ID
  useEffect(() => {
    const resolveTeacherId = async () => {
      if (!schoolCode || !teacherId) return;

      try {
        const res = await API.get('/teacher/marks/teacher-context', {
          params: { teacher_id: teacherId },
          headers: { 'x-school-code': schoolCode },
        });
        const canonicalTeacherId = String(res.data?.teacher_data?.teacher_id || teacherId).trim();
        setResolvedTeacherId(canonicalTeacherId);
      } catch {
        setResolvedTeacherId(teacherId);
      }
    };

    resolveTeacherId();
  }, [schoolCode, teacherId]);

  // Fetch classes and sections
  useEffect(() => {
    const fetchClassesSections = async () => {
      if (!schoolCode || !branchId) return;
      
      setLoadingClassesSections(true);
      try {
        const res = await API.get('/manage/classes-sections', {
          params: { school_code: schoolCode, branch_id: branchId },
        });
        setClasses(res.data?.classes || []);
        setSections(res.data?.sections || []);
      } catch (e) {
        console.error('Failed to load classes/sections:', e);
      } finally {
        setLoadingClassesSections(false);
      }
    };

    fetchClassesSections();
  }, [schoolCode, branchId]);

  // Load leave requests
  const loadRequests = useCallback(async () => {
    if (!schoolCode || !resolvedTeacherId) return;

    setLoading(true);
    setMsg('');
    setError('');

    try {
      const body: any = {
        school_code: schoolCode,
        teacher_id: resolvedTeacherId,
      };
      if (classId) body.class_id = Number(classId);
      if (sectionId) body.section_id = Number(sectionId);
      if (status) body.status = status;

      const res = await API.post('/manage/teacher/leave-requests', body);
      setItems(res.data?.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load leave requests');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, resolvedTeacherId, classId, sectionId, status]);

  // Load when dependencies change
  useEffect(() => {
    if (schoolCode && resolvedTeacherId) {
      loadRequests();
    }
  }, [schoolCode, resolvedTeacherId, classId, sectionId, status]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, [loadRequests]);

  const actOnLeave = async (leaveId: string, action: 'APPROVED' | 'REJECTED') => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action.toLowerCase()} this leave request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action === 'APPROVED' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await API.put('/manage/teacher/leave-requests/action', {
                school_code: schoolCode,
                teacher_id: resolvedTeacherId,
                leave_id: leaveId,
                action,
              });
              setMsg(`Leave ${action.toLowerCase()} successfully`);
              loadRequests();
            } catch (e: any) {
              setError(e?.response?.data?.detail || 'Failed to update leave status');
            }
          },
        },
      ]
    );
  };

  const applyFilters = () => {
    setShowFilterModal(false);
    loadRequests();
  };

  const resetFilters = () => {
    setClassId('');
    setSectionId('');
    setStatus('PENDING');
    setShowFilterModal(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>📅 Leave Approval</Text>
            <Text style={styles.subText}>{items.length} requests</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadRequests}>
            <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Button */}
        <View style={styles.filterBar}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Text style={styles.filterBtnText}>🔽 Filter</Text>
          </TouchableOpacity>
          {(classId || sectionId || status !== 'PENDING') && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
              <Text style={styles.resetBtnText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active Filters */}
        {(classId || sectionId || status !== 'PENDING') && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersLabel}>Active Filters:</Text>
            {classId && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>
                  Class: {classes.find(c => c.id === classId)?.name || classId}
                </Text>
              </View>
            )}
            {sectionId && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>
                  Section: {sections.find(s => s.id === sectionId)?.name || sectionId}
                </Text>
              </View>
            )}
            {status !== 'PENDING' && status !== '' && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Status: {status}</Text>
              </View>
            )}
          </View>
        )}

        {/* Messages */}
        {msg && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{msg}</Text>
          </View>
        )}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Leave Requests List */}
        {loading ? (
          <Loader />
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No leave requests found</Text>
            <Text style={styles.emptyText}>
              {classId || sectionId || status !== 'PENDING'
                ? 'Try adjusting your filters'
                : 'No pending leave requests at the moment'}
            </Text>
          </View>
        ) : (
          items.map((request) => (
            <LeaveRequestCard
              key={request.leave_id}
              request={request}
              onApprove={(id) => actOnLeave(id, 'APPROVED')}
              onReject={(id) => actOnLeave(id, 'REJECTED')}
            />
          ))
        )}

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>👑 Role: Teacher • Leave Approver</Text>
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        classes={classes}
        sections={sections}
        selectedClass={classId}
        selectedSection={sectionId}
        selectedStatus={status}
        loading={loadingClassesSections}
        onSelectClass={setClassId}
        onSelectSection={setSectionId}
        onSelectStatus={setStatus}
        onApply={applyFilters}
        onClose={() => setShowFilterModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 14,
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  filterBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  resetBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTag: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  filterTagText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  successContainer: {
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  successText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
  },
  requestCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  rollNumber: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 65,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  reasonContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
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
    fontSize: 13,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeApproved: {
    backgroundColor: '#dcfce7',
  },
  badgeRejected: {
    backgroundColor: '#fee2e2',
  },
  badgeIcon: {
    fontSize: 11,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPending: {
    color: '#b45309',
  },
  badgeTextApproved: {
    color: '#15803d',
  },
  badgeTextRejected: {
    color: '#b91c1c',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#4a5568',
  },
  chipTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
});