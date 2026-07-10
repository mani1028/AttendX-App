import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  Filter,
  Calendar,
  User,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ChevronRight,
  Info,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import API from '../../services/api';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import BottomSheetModal from '../../components/common/BottomSheetModal';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

import { resolveApiErrorMessage } from '../../utils/helpers';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { leaveApprovalStyles as styles } from '../../components/teacher/leaveApproval/leaveApprovalStyles';




import {
  LeaveRequestCard,
  LeaveApprovalModals,
  getSchoolCode,
  getTeacherId,
  getBranchId,
  type LeaveRequest,
  type ClassItem,
  type SectionItem,
} from '../../components/teacher/leaveApproval';


export default function LeaveApprovalScreen({
  embedded = false,
  scrollHeader,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
}) {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [classId, setClassId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('');
  const [status, setStatus] = useState<string>('PENDING');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // Classes/Sections
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  // Teacher assignments/context
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [teacherName, setTeacherName] = useState<string>('');

  // Load credentials with defensive rehydration
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const code = await getSchoolCode();
        const tid = await getTeacherId();
        const bid = await getBranchId();

        if (!isMounted.current) {
          return;
        }

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
  }, [setTabBarVisible]);
  const handleScroll = useScrollTabBar();


  // Resolve teacher ID with fallback protection
  useEffect(() => {
    const resolveTeacherId = async () => {
      if (!schoolCode || !teacherId) {
        return;
      }
      try {
        const res = await API.get('/staff/marks/staff-context', {
          params: {
            school_code: schoolCode,
            branch_id: branchId,
            teacher_id: teacherId,
            employee_id: teacherId,
          },
        });

        if (!isMounted.current) {
          return;
        }

        const canonicalTeacherId = String(res.data?.teacher_data?.teacher_id || teacherId || '').trim();
        setResolvedTeacherId(canonicalTeacherId);
        // store teacher assignments and name for filter defaults
        const assignments = Array.isArray(res.data?.assignments) ? res.data.assignments.filter(Boolean) : [];
        setTeacherAssignments(assignments);
        const tName = res.data?.teacher_data?.full_name || res.data?.teacher_data?.teacher_full_name || res.data?.teacher_data?.name || '';
        setTeacherName(String(tName || '').trim());
      } catch (err: any) {
        if (!isMounted.current) {
          return;
        }
        setResolvedTeacherId(teacherId || '');
      }
    };
    resolveTeacherId();
  }, [schoolCode, teacherId, branchId]);

  // Fetch classes and sections with defensive mapping
  useEffect(() => {
    const fetchClassesSections = async () => {
      if (!schoolCode || !branchId) {
        return;
      }
      try {
        const res = await API.get('/manage/classes-sections', {
          params: { school_code: schoolCode, branch_id: branchId },
        });

        if (!isMounted.current) {
          return;
        }

        const fetchedClasses = Array.isArray(res.data?.classes) ? res.data.classes.filter(Boolean) : [];
        const fetchedSections = Array.isArray(res.data?.sections) ? res.data.sections.filter(Boolean) : [];

        setClasses(fetchedClasses);
        setSections(fetchedSections);
      } catch (e: any) {
        console.error('Failed to load classes/sections:', e);
      }
    };
    fetchClassesSections();
  }, [schoolCode, branchId]);

  // Load leave requests with defensive mapping
  const loadRequests = useCallback(async () => {
    if (!schoolCode || !resolvedTeacherId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const body: any = {
        school_code: schoolCode,
        employee_id: resolvedTeacherId,
      };
      if (classId) {
        body.class_id = Number(classId);
      }
      if (sectionId) {
        body.section_id = Number(sectionId);
      }
      if (status) {
        body.status = status;
      }

      const res = await API.post('/manage/staff/leave-requests', body);

      if (!isMounted.current) {
        return;
      }

      const requests = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];
      setItems(requests);
    } catch (e: any) {
      if (!isMounted.current) {
        return;
      }
      setItems([]);
      setLoadError(
        resolveApiErrorMessage(e, 'Could not load leave requests. Pull down to retry.'),
      );
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
  }, [schoolCode, resolvedTeacherId, classId, sectionId, status, loadRequests]);

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
    const isRejectAction = action === 'REJECTED';
    const actionText = isRejectAction ? 'reject' : 'approve';

    Alert.alert(
      isRejectAction ? 'Reject Leave Request' : 'Approve Leave Request',
      `Are you sure you want to ${actionText} this leave request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: isRejectAction ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await API.put('/manage/staff/leave-requests/action', {
                school_code: schoolCode,
                employee_id: resolvedTeacherId,
                leave_id: leaveId,
                action,
              });

              if (!isMounted.current) {
                return;
              }

              Alert.alert('Success', `Leave ${actionText}ed successfully`);
              setSelectedRequest(null);
              loadRequests();
            } catch (e: any) {
              if (!isMounted.current) {
                return;
              }

              if (e?.response?.status !== 401) {
                Alert.alert('Error', resolveApiErrorMessage(e, 'Failed to update leave status'));
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
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[
          embedded ? styles.scrollContentEmbedded : innerPageLayoutStyles.scrollPageContent,
          styles.scrollContent,
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        {!embedded ? (
          <StandardPageHeader
            title="Student Leaves"
            subtitle={
              loading
                ? 'Loading requests...'
                : loadError
                  ? 'Unable to load requests'
                  : 'Review and manage pending leave applications'
            }
            showBack={navigation.canGoBack()}
            onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never))}
            scrollWithContent
            containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
            rightActions={(
              <TouchableOpacity
                accessibilityRole="button"
                style={heroHeaderStyles.iconBtn}
                onPress={onRefresh}
                accessibilityLabel="Refresh leave requests"
              >
                <RefreshCw size={20} color={Theme.colors.card} />
              </TouchableOpacity>
            )}
          />
        ) : scrollHeader ? (
          scrollHeader
        ) : null}
        <View style={[
          embedded ? innerPageLayoutStyles.contentFront : innerPageLayoutStyles.scrollBody,
          embedded && styles.embeddedGutter,
        ]}>
        {/* Filter Selection Card */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <View style={styles.filterTitleContainer}>
              <Filter size={18} color={Theme.colors.primary} />
              <AppText weight="bold" style={styles.filterTitle}>Filters</AppText>
            </View>
            {(classId || sectionId || status !== 'PENDING') && (
              <TouchableOpacity accessibilityRole="button" onPress={resetFilters}>
                <AppText weight="semibold" style={styles.resetText}>Reset All</AppText>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterGrid}>
            <View style={styles.filterItem}>
              <AppText weight="semibold" style={styles.filterLabel}>Status</AppText>
              <View style={styles.statusToggle}>
                {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                  <TouchableOpacity accessibilityRole="button"
                    key={s}
                    style={[styles.statusBtn, status === s && styles.statusBtnActive]}
                    onPress={() => setStatus(s)}
                  >
                    <AppText weight="semibold" style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity accessibilityRole="button"
              style={styles.advancedFilterBtn}
              onPress={() => setShowFilterModal(true)}
            >
              <Search size={16} color={Theme.colors.textSec} />
              <AppText weight="semibold" style={styles.advancedFilterText}>
                  {advancedFilterText}
              </AppText>
              <ChevronRight size={16} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Requests List */}
        <View style={styles.sectionHeader}>
          <AppText weight="bold" style={styles.sectionTitle}>
            {status.charAt(0) + status.slice(1).toLowerCase()} Requests ({items.length})
          </AppText>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}><Loader /></View>
        ) : loadError ? (
          <AppCard style={styles.errorCard}>
            <AlertCircle size={32} color={Theme.colors.error} />
            <AppText weight="semibold" style={styles.errorTitle}>Could not load requests</AppText>
            <AppText style={styles.errorText}>{loadError}</AppText>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadRequests()}>
              <AppText weight="semibold" style={styles.retryBtnText}>Try again</AppText>
            </TouchableOpacity>
          </AppCard>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={Theme.colors.textSec} />
            <AppText weight="semibold" style={styles.emptyStateText}>No requests found matching your filters</AppText>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {items.map((request) => (
              <LeaveRequestCard
                key={request.leave_id}
                request={request}
                onApprove={(id) => actOnLeave(id, 'APPROVE')}
                onReject={(id) => actOnLeave(id, 'REJECTED')}
                onPress={(req) => setSelectedRequest(req)}
              />
            ))}
          </View>
        )}
        </View>
      </ScrollView>

      <LeaveApprovalModals
        showFilterModal={showFilterModal}
        onCloseFilter={() => setShowFilterModal(false)}
        classes={classes}
        sections={sections}
        classId={classId}
        sectionId={sectionId}
        onClassIdChange={setClassId}
        onSectionIdChange={setSectionId}
        onApplyFilters={() => setShowFilterModal(false)}
        selectedRequest={selectedRequest}
        onCloseDetail={() => setSelectedRequest(null)}
        onActOnLeave={actOnLeave}
      />
    </View>
  );
}
