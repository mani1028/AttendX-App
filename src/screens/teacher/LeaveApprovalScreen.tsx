import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Filter,
  Calendar,
  User,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ChevronRight,
  Info,
  Bell
} from 'lucide-react-native';
import API from '../../services/api';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import BottomSheetModal from '../../components/common/BottomSheetModal';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import HM_THEME from '../../constants/hmTheme';

const { width } = Dimensions.get('window');

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
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const upperStatus = status?.toUpperCase() || '';

  let bgColor = '#FEF3C7';
  let textColor = '#B45309';
  let icon = <Clock size={12} color="#B45309" />;
  let label = 'Pending';

  if (upperStatus === 'APPROVED') {
    bgColor = '#DCFCE7';
    textColor = '#15803D';
    icon = <CheckCircle2 size={12} color="#15803D" />;
    label = 'Approved';
  } else if (upperStatus === 'REJECTED') {
    bgColor = '#FEE2E2';
    textColor = '#B91C1C';
    icon = <XCircle size={12} color="#B91C1C" />;
    label = 'Rejected';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      {icon}
      <AppText weight="bold" style={[styles.badgeText, { color: textColor }]}>
        {label}
      </AppText>
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
        <View style={styles.studentInfo}>
          <View style={styles.avatarPlaceholder}>
            <User size={20} color="#64748b" />
          </View>
          <View>
            <AppText weight="bold" style={styles.studentName}>{request.student_full_name}</AppText>
            <AppText style={styles.rollNumber}>Roll No: {request.roll_number}</AppText>
          </View>
        </View>
        <StatusBadge status={request.status} />
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardDetails}>
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <BookOpen size={14} color="#94a3b8" />
            <AppText weight="semiBold" style={styles.detailValue}>{request.class_grade} - {request.section}</AppText>
          </View>
          <View style={styles.detailItem}>
            <Calendar size={14} color="#94a3b8" />
            <AppText weight="semiBold" style={styles.detailValue}>
              {formatDate(request.from_date)} {request.from_date !== request.to_date ? `to ${formatDate(request.to_date)}` : ''}
            </AppText>
          </View>
        </View>

        <View style={styles.reasonBox}>
          <Info size={14} color="#64748b" style={{ marginTop: 2 }} />
          <AppText style={styles.reasonText}>{request.reason}</AppText>
        </View>
      </View>

      {request.status === 'PENDING' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onReject(request.leave_id)}
          >
            <XCircle size={16} color="#B91C1C" />
            <AppText weight="bold" style={styles.rejectBtnText}>Reject</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onApprove(request.leave_id)}
          >
            <CheckCircle2 size={16} color="#FFFFFF" />
            <AppText weight="bold" style={styles.approveBtnText}>Approve</AppText>
          </TouchableOpacity>
        </View>
      )}
    </AppCard>
  );
};

export default function LeaveApprovalScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [resolvedTeacherId, setResolvedTeacherId] = useState<string>('');

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
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
  // Teacher assignments/context
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [teacherName, setTeacherName] = useState<string>('');
  const [loadingTeacherContext, setLoadingTeacherContext] = useState<boolean>(false);

  // Load credentials with defensive rehydration
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const code = await getSchoolCode();
        const tid = await getTeacherId();
        const bid = await getBranchId();

        if (!isMounted.current) return;

        setSchoolCode(code || '');
        setTeacherId(tid || '');
        setBranchId(bid || '');
      } catch (err) {
        console.error('Failed to load credentials:', err);
      }
    };
    loadCredentials();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;
    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  // Resolve teacher ID with fallback protection
  useEffect(() => {
    const resolveTeacherId = async () => {
      if (!schoolCode || !teacherId) return;
      try {
        const res = await API.get('/teacher/marks/teacher-context', {
          params: { teacher_id: teacherId },
          headers: { 'x-school-code': schoolCode },
        });

        if (!isMounted.current) return;

        const canonicalTeacherId = String(res.data?.teacher_data?.teacher_id || teacherId || '').trim();
        setResolvedTeacherId(canonicalTeacherId);
        // store teacher assignments and name for filter defaults
        const assignments = Array.isArray(res.data?.assignments) ? res.data.assignments.filter(Boolean) : [];
        setTeacherAssignments(assignments);
        const tName = res.data?.teacher_data?.full_name || res.data?.teacher_data?.teacher_full_name || res.data?.teacher_data?.name || '';
        setTeacherName(String(tName || '').trim());
      } catch (err: any) {
        if (!isMounted.current) return;
        setResolvedTeacherId(teacherId || '');
      }
    };
    resolveTeacherId();
  }, [schoolCode, teacherId]);

  // Fetch classes and sections with defensive mapping
  useEffect(() => {
    const fetchClassesSections = async () => {
      if (!schoolCode || !branchId) return;
      setLoadingClassesSections(true);
      try {
        const res = await API.get('/manage/classes-sections', {
          params: { school_code: schoolCode, branch_id: branchId },
        });

        if (!isMounted.current) return;

        const fetchedClasses = Array.isArray(res.data?.classes) ? res.data.classes.filter(Boolean) : [];
        const fetchedSections = Array.isArray(res.data?.sections) ? res.data.sections.filter(Boolean) : [];

        setClasses(fetchedClasses);
        setSections(fetchedSections);
      } catch (e: any) {
        console.error('Failed to load classes/sections:', e);
        if (isMounted.current && e?.response?.status !== 401) {
          setError('Failed to load filters');
        }
      } finally {
        if (isMounted.current) {
          setLoadingClassesSections(false);
        }
      }
    };
    fetchClassesSections();
  }, [schoolCode, branchId]);

  // Load leave requests with defensive mapping
  const loadRequests = useCallback(async () => {
    if (!schoolCode || !resolvedTeacherId) return;
    setLoading(true);
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

      if (!isMounted.current) return;

      const requests = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];
      setItems(requests);
    } catch (e: any) {
      if (!isMounted.current) return;

      if (e?.response?.status !== 401) {
        setError(e?.response?.data?.detail || 'Failed to load leave requests');
      }
      setItems([]);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [schoolCode, resolvedTeacherId, classId, sectionId, status]);

  useEffect(() => {
    if (schoolCode && resolvedTeacherId) {
      loadRequests();
    }
  }, [schoolCode, resolvedTeacherId, classId, sectionId, status]);

  const advancedFilterText = useMemo(() => {
    // If explicit class filter selected
    if (classId) {
      const cls = classes.find(c => c.id === classId);
      const classText = `Class ${cls?.name || classId}`;
      const secText = sectionId ? ` • Sec ${sections.find(s => s.id === sectionId)?.name || sectionId}` : ' • All Sections';
      return classText + secText;
    }

    // No explicit class selected - if teacher has exactly one assigned class, show that class and teacher name
    const uniqueAssignedClasses = Array.from(new Map((teacherAssignments || [])
      .filter(a => a?.class_name)
      .map((a: any) => [String(a.class_name).trim().toLowerCase(), { class_name: a.class_name, class_id: String(a.class_id) }])
      ).values());

    if (!classId && uniqueAssignedClasses.length === 1) {
      const cls = uniqueAssignedClasses[0];
      const classText = `Class ${cls.class_name || cls.class_id}`;
      const nameText = teacherName ? ` • ${teacherName}` : ' • All Sections';
      return classText + nameText;
    }

    // Fallback to generic labels
    return 'All Classes • All Sections';
  }, [classId, sectionId, classes, sections, teacherAssignments, teacherName]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, [loadRequests]);

  const actOnLeave = async (leaveId: string, action: 'APPROVE' | 'REJECTED') => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action.toLowerCase()} this leave request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: action === 'APPROVE' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await API.put('/manage/teacher/leave-requests/action', {
                school_code: schoolCode,
                teacher_id: resolvedTeacherId,
                leave_id: leaveId,
                action,
              });

              if (!isMounted.current) return;

              Alert.alert('Success', `Leave ${action.toLowerCase()} successfully`);
              loadRequests();
            } catch (e: any) {
              if (!isMounted.current) return;

              if (e?.response?.status !== 401) {
                Alert.alert('Error', e?.response?.data?.detail || 'Failed to update leave status');
              }
            }
          },
        },
      ]
    );
  };

  const resetFilters = () => {
    setClassId('');
    setSectionId('');
    setStatus('PENDING');
    setShowFilterModal(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={HM_THEME.navy} />

      {/* Navy Standard Header (animated on scroll) */}
      <Animated.View
        style={[
          styles.headerStandard,
          { paddingTop: insets.top + 20, paddingBottom: 30 },
          {
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 120],
                  outputRange: [0, -80],
                  extrapolate: 'clamp',
                }),
              },
              {
                scale: scrollY.interpolate({
                  inputRange: [0, 120],
                  outputRange: [1, 0.99],
                  extrapolate: 'clamp',
                }),
              },
            ],
            opacity: scrollY.interpolate({
              inputRange: [0, 120],
              outputRange: [1, 0.98],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never)}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText weight="bold" style={styles.headerTitle}>Leave Approvals</AppText>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => (navigation as any).navigate('Notifications')}
          >
            <Bell size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <AppText weight="bold" style={styles.headerGreeting}>Student Leaves</AppText>
          <AppText style={styles.headerSubtext}>Review and manage pending leave applications</AppText>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}
        onScroll={(e) => { Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })(e); handleScroll(e); }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HM_THEME.navy} />}
      >

        {/* Filter Selection Card */}
        <AppCard style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <View style={styles.filterTitleContainer}>
              <Filter size={18} color={HM_THEME.navy} />
              <AppText weight="bold" style={styles.filterTitle}>Filters</AppText>
            </View>
            {(classId || sectionId || status !== 'PENDING') && (
              <TouchableOpacity onPress={resetFilters}>
                <AppText weight="semiBold" style={styles.resetText}>Reset All</AppText>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterGrid}>
            <View style={styles.filterItem}>
              <AppText weight="semiBold" style={styles.filterLabel}>Status</AppText>
              <View style={styles.statusToggle}>
                {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusBtn, status === s && styles.statusBtnActive]}
                    onPress={() => setStatus(s)}
                  >
                    <AppText weight="semiBold" style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.advancedFilterBtn}
              onPress={() => setShowFilterModal(true)}
            >
              <Search size={16} color="#64748B" />
              <AppText weight="semiBold" style={styles.advancedFilterText}>
                  {advancedFilterText}
              </AppText>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Requests List */}
        <View style={styles.sectionHeader}>
          <AppText weight="bold" style={styles.sectionTitle}>
            {status.charAt(0) + status.slice(1).toLowerCase()} Requests ({items.length})
          </AppText>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}><Loader /></View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#cbd5e1" />
            <AppText weight="semiBold" style={styles.emptyStateText}>No requests found matching your filters</AppText>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {items.map((request) => (
              <LeaveRequestCard
                key={request.leave_id}
                request={request}
                onApprove={(id) => actOnLeave(id, 'APPROVED')}
                onReject={(id) => actOnLeave(id, 'REJECTED')}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <BottomSheetModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} sheetStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <AppText weight="bold" style={styles.modalTitle}>Select Class & Section</AppText>
          <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalClose}>
            <XCircle size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <AppText weight="bold" style={styles.modalLabel}>Class</AppText>
          <View style={styles.chipContainer}>
            <TouchableOpacity
              style={[styles.chip, !classId && styles.chipActive]}
              onPress={() => setClassId('')}
            >
              <AppText weight="semiBold" style={[styles.chipText, !classId && styles.chipTextActive]}>All Classes</AppText>
            </TouchableOpacity>
            {classes.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={[styles.chip, classId === cls.id && styles.chipActive]}
                onPress={() => setClassId(cls.id)}
              >
                <AppText weight="semiBold" style={[styles.chipText, classId === cls.id && styles.chipTextActive]}>
                  {cls.name || cls.class_grade}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText weight="bold" style={[styles.modalLabel, { marginTop: 20 }]}>Section</AppText>
          <View style={styles.chipContainer}>
            <TouchableOpacity
              style={[styles.chip, !sectionId && styles.chipActive]}
              onPress={() => setSectionId('')}
            >
              <AppText weight="semiBold" style={[styles.chipText, !sectionId && styles.chipTextActive]}>All Sections</AppText>
            </TouchableOpacity>
            {sections.map((sec) => (
              <TouchableOpacity
                key={sec.id}
                style={[styles.chip, sectionId === sec.id && styles.chipActive]}
                onPress={() => setSectionId(sec.id)}
              >
                <AppText weight="semiBold" style={[styles.chipText, sectionId === sec.id && styles.chipTextActive]}>
                  {sec.name || sec.section}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <AppButton
            title="Apply Filters"
            onPress={() => setShowFilterModal(false)}
            style={styles.modalApplyBtn}
          />
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerStandard: {
    backgroundColor: HM_THEME.navy,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerContent: {
    marginTop: 24,
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  filterCard: {
    marginTop: -20,
    borderRadius: 30,
    padding: 18,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    ...Platform.select({

      android: { elevation: 6 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTitle: {
    fontSize: 16,
    color: '#0F172A',
  },
  resetText: {
    fontSize: 14,
    color: '#2563EB',
  },
  filterGrid: {
    gap: 12,
  },
  filterItem: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  statusToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  statusBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusBtnText: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBtnTextActive: {
    color: HM_THEME.navy,
  },
  advancedFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  advancedFilterText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#0F172A',
  },
  requestsList: {
    gap: 12,
    paddingHorizontal: 16,
  },
  requestCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    ...Platform.select({

      android: { elevation: 4 },

      ios: {},

    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 16,
    color: '#0F172A',
  },
  rollNumber: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardDetails: {
    gap: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 13,
    color: '#475569',
  },
  reasonBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    gap: 8,
  },
  approveBtn: {
    backgroundColor: HM_THEME.navy,
  },
  rejectBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  rejectBtnText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
    color: '#0F172A',
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: HM_THEME.navy,
    borderColor: HM_THEME.navy,
  },
  chipText: {
    fontSize: 14,
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    padding: 20,
    paddingTop: 0,
  },
  modalApplyBtn: {
    backgroundColor: HM_THEME.navy,
    height: 52,
    borderRadius: 12,
  },
});