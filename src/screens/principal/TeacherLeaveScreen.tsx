import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Calendar,
  ChevronRight,
  FileText,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft
} from 'lucide-react-native';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import API from '../../services/api';
import { Principal_THEME as C } from '../../constants/principalTheme';
import { formatErrorMessage } from '../../utils/helpers';
import AppText from '../../components/common/AppText';
import { safeGoBack } from '../../utils/navigationHelpers';

const { width } = Dimensions.get('window');

interface TeacherLeave {
  leave_id: number;
  teacher_id: number;
  teacher_full_name: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  teacher_avatar?: string;
  subject?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return { bg: '#ECFDF5', text: '#059669', label: 'Approved', icon: CheckCircle2 };
      case 'REJECTED':
        return { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected', icon: XCircle };
      default:
        return { bg: '#FFFBEB', text: '#D97706', label: 'Pending', icon: Clock };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <StatusIcon size={12} color={config.text} style={{ marginRight: 4 }} />
      <AppText weight="bold" style={[styles.statusBadgeText, { color: config.text }]}>{config.label}</AppText>
    </View>
  );
};

export default function TeacherLeaveScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [leaves, setLeaves] = useState<TeacherLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedLeave, setSelectedLeave] = useState<TeacherLeave | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const totalLeaves = leaves.length;

  const loadLeaves = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const schoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
      const response = await API.post('/manage/principal/staff-leave-requests', {
        school_code: schoolCode,
      });
      const data = response.data?.items || response.data || [];
      setLeaves(Array.isArray(data) ? data : []);

      // Calculate stats
      const pending = data.filter((l: any) => l.status === 'PENDING').length;
      const approved = data.filter((l: any) => l.status === 'APPROVED').length;
      const rejected = data.filter((l: any) => l.status === 'REJECTED').length;
      setStats({ pending, approved, rejected });
    } catch (error: any) {
      console.error('Error loading leaves:', error);
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || 'Failed to load leave requests'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaves(false);
  };

  const handleStatusUpdate = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const schoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
      await API.put('/manage/principal/staff-leave-requests/action', {
        school_code: schoolCode,
        leave_id: leaveId,
        action: status,
      });
      Alert.alert('Success', `Leave request ${status.toLowerCase()} successfully`);
      setSelectedLeave(null);
      loadLeaves(false);
    } catch (error: any) {
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || 'Failed to update leave status'));
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLeaves = leaves.filter(leave => {
    if (filter === 'ALL') return true;
    return leave.status === filter;
  });

  const renderLeaveCard = (leave: TeacherLeave) => (
    <TouchableOpacity
      key={leave.leave_id}
      style={styles.leaveCard}
      onPress={() => setSelectedLeave(leave)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.teacherInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{leave.teacher_full_name.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.teacherName}>{leave.teacher_full_name}</Text>
            <Text style={styles.teacherSubject}>{leave.subject || 'Teacher'}</Text>
          </View>
        </View>
        <StatusBadge status={leave.status} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.dateInfo}>
          <Calendar size={14} color="#64748B" />
          <Text style={styles.dateText}>
            {new Date(leave.from_date).toLocaleDateString()} - {new Date(leave.to_date).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.reasonText} numberOfLines={2}>{leave.reason}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.appliedOn}>Applied: {new Date(leave.created_at).toLocaleDateString()}</Text>
        <TouchableOpacity
          style={styles.viewDetailsBtn}
          onPress={() => setSelectedLeave(leave)}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
          <ChevronRight size={16} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      <View style={[styles.headerStandard, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => safeGoBack(navigation, 'PrincipalDashboard')}
          >
            <ChevronLeft size={24} color={HEADER_CONSTANTS.TEXT_COLOR} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText weight="bold" style={styles.headerTitle}>Teacher Leaves</AppText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerContent}>
          <AppText weight="bold" style={styles.headerGreeting}>Leave Approvals</AppText>
          <AppText style={styles.headerSubtext}>{totalLeaves} total requests • {stats.pending} pending</AppText>
        </View>
      </View>

      <View style={styles.contentOverlap}>
        <View style={styles.filterTabs}>
          <AppText style={styles.filterLabel} weight="semibold">Filter by Status</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilter(tab)}
                style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              >
                <AppText style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]} weight="semibold">
                  {tab === 'ALL' ? 'All Requests' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          >
            {filteredLeaves.length > 0 ? (
              <View style={styles.leavesList}>
                {filteredLeaves.map(renderLeaveCard)}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <FileText size={64} color="#E2E8F0" />
                <AppText style={styles.emptyText}>No {filter.toLowerCase()} leave requests found</AppText>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Leave Detail Modal */}
      <Modal
        visible={!!selectedLeave}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLeave(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave Details</Text>
              <TouchableOpacity onPress={() => setSelectedLeave(null)}>
                <X size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {selectedLeave && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailTeacherInfo}>
                  <View style={styles.largeAvatar}>
                    <Text style={styles.largeAvatarText}>{selectedLeave.teacher_full_name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.detailTeacherName}>{selectedLeave.teacher_full_name}</Text>
                  <Text style={styles.detailTeacherSubject}>{selectedLeave.subject || 'Class Teacher'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <View style={styles.detailRow}>
                    <Calendar size={18} color="#3B82F6" />
                    <Text style={styles.detailValue}>
                      {new Date(selectedLeave.from_date).toLocaleDateString()} to {new Date(selectedLeave.to_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Reason</Text>
                  <View style={styles.reasonBox}>
                    <Text style={styles.detailReasonText}>{selectedLeave.reason}</Text>
                  </View>
                </View>

                {selectedLeave.status === 'PENDING' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleStatusUpdate(selectedLeave.leave_id, 'REJECTED')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <XCircle size={20} color="#FFF" style={{ marginRight: 8 }} />
                          <Text style={styles.actionBtnText}>Reject</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleStatusUpdate(selectedLeave.leave_id, 'APPROVED')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <CheckCircle2 size={20} color="#FFF" style={{ marginRight: 8 }} />
                          <Text style={styles.actionBtnText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
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
  headerStandard: {
    backgroundColor: HEADER_CONSTANTS.BACKGROUND_COLOR,
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontSize: HEADER_CONSTANTS.TITLE_FONT_SIZE,
    fontWeight: HEADER_CONSTANTS.TITLE_FONT_WEIGHT,
    textAlign: 'center',
  },
  headerContent: {
    marginTop: 24,
  },
  headerGreeting: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    opacity: HEADER_CONSTANTS.SUBTITLE_OPACITY,
    fontSize: 14,
    marginTop: 4,
  },
  headerSpacer: {
    width: 40,
  },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heroCardLabel: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
  },
  heroCardValue: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  heroCardPills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  heroPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingPill: {
    backgroundColor: '#FFFBEB',
  },
  approvedPill: {
    backgroundColor: '#ECFDF5',
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 10,
  },
  filterTabs: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  filterScrollContent: {
    paddingHorizontal: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leavesList: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  leaveCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#3B82F6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  teacherSubject: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    marginBottom: 16,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
  },
  reasonText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  appliedOn: {
    fontSize: 12,
    color: '#94A3B8',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
    marginRight: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalScroll: {
    padding: 20,
  },
  detailTeacherInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  largeAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  detailTeacherName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  detailTeacherSubject: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 15,
    color: '#1E293B',
    marginLeft: 10,
    fontWeight: '500',
  },
  reasonBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailReasonText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 0.48,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
