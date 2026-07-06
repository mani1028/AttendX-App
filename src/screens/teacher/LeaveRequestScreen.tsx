import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Calendar, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  listTeacherLeaveRequests,
  submitTeacherLeave,
  getTeacherProfile,
  getStaffLeaveBalance,
  getLeaveRemainingForType,
  pickDefaultStaffLeaveType,
  type LeaveAllocationItem,
  type StaffLeaveBalance,
} from '../../services/teacherService';
import API from '../../services/api';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import { resolveApiErrorMessage } from '../../utils/helpers';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

// Types
interface LeaveRequest {
  leave_id: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

// ponytail: one resolver — login writes mixed AsyncStorage keys; profile API is fallback
async function loadTeacherLeaveContext(): Promise<{
  schoolCode: string;
  branchId: string;
  employeeId: string;
}> {
  const entries = await AsyncStorage.multiGet([
    'school_code', 'schoolCode', 'branch_id', 'branchId',
    'teacher_id', 'teacherId', 'employee_id', 'employeeId',
  ]);
  const bag: Record<string, string> = {};
  entries.forEach(([key, val]) => { if (val) { bag[key] = val; } });

  let schoolCode =
    bag.school_code ||
    bag.schoolCode ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    '';
  let branchId =
    bag.branch_id ||
    bag.branchId ||
    (await storage.getString(StorageKeys.BRANCH_ID)) ||
    '';
  let employeeId =
    bag.teacher_id ||
    bag.teacherId ||
    bag.employee_id ||
    bag.employeeId ||
    (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
    '';

  if (!employeeId || !schoolCode) {
    try {
      const profile = await getTeacherProfile();
      if (!employeeId) {
        employeeId = String(profile?.teacher_id || profile?.employee_id || '').trim();
      }
      if (!schoolCode) {
        schoolCode = String(profile?.school_code || '').trim();
      }
      if (!branchId) {
        branchId = String(profile?.branch_id || '').trim();
      }
    } catch {
      // keep stored values
    }
  }

  if (schoolCode && employeeId) {
    try {
      const res = await API.get('/staff/marks/staff-context', {
        params: {
          school_code: schoolCode,
          branch_id: branchId,
          teacher_id: employeeId,
          employee_id: employeeId,
        },
      });
      const canonical = String(
        res.data?.teacher_data?.teacher_id ||
        res.data?.teacher_data?.employee_id ||
        employeeId,
      ).trim();
      if (canonical) { employeeId = canonical; }
    } catch {
      // use employeeId as-is
    }
  }

  return { schoolCode, branchId, employeeId };
}

const LEAVE_CATEGORY_OPTIONS: { key: LeaveAllocationItem['type']; label: string }[] = [
  { key: 'CASUAL', label: 'Casual' },
  { key: 'SICK', label: 'Sick' },
  { key: 'PAID', label: 'Paid' },
  { key: 'COMP_OFF', label: 'Comp Off' },
  { key: 'LOP', label: 'LOP (Unpaid)' },
];

const isValidYear = (dateString: string): boolean => {
  if (!dateString) {return true;}
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {return false;}
  const year = date.getFullYear();
  return year >= 1000 && year <= new Date().getFullYear() + 1;
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const upperStatus = status?.toUpperCase() || '';

  let bgColor = '#FEF3C7';
  let textColor = '#B45309';
  let icon = <Clock size={14} color="#B45309" />;
  let label = 'Pending';

  if (upperStatus === 'APPROVED') {
    bgColor = '#DCFCE7';
    textColor = '#15803D';
    icon = <CheckCircle2 size={14} color="#15803D" />;
    label = 'Approved';
  } else if (upperStatus === 'REJECTED') {
    bgColor = '#FEE2E2';
    textColor = '#B91C1C';
    icon = <XCircle size={14} color="#B91C1C" />;
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

// Leave History Card Component
const LeaveHistoryCard: React.FC<{ request: LeaveRequest }> = ({ request }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) {return '-';}
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <AppCard style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.dateRangeContainer}>
          <Calendar size={16} color={Theme.colors.textSec} />
          <AppText weight="semibold" style={styles.dateText}>{formatDate(request.from_date)}</AppText>
          {request.from_date !== request.to_date && (
            <>
              <AppText style={styles.dateArrow}>→</AppText>
              <AppText weight="semibold" style={styles.dateText}>{formatDate(request.to_date)}</AppText>
            </>
          )}
        </View>
        <StatusBadge status={request.status} />
      </View>

      <View style={styles.reasonContainer}>
        <FileText size={14} color="#94a3b8" style={{ marginTop: 2 }} />
        <AppText style={styles.reasonText} numberOfLines={2}>{request.reason}</AppText>
      </View>

      <View style={styles.cardFooter}>
        <AppText style={styles.appliedDate}>
          Applied on {formatDate(request.created_at)}
        </AppText>
      </View>
    </AppCard>
  );
};

export default function LeaveRequestScreen({
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

  // Form fields
  const [leaveType, setLeaveType] = useState<'one-day' | 'multiple'>('one-day');
  const [allocationType, setAllocationType] = useState<LeaveAllocationItem['type']>('CASUAL');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState<string>('');

  // UI states
  const isMounted = useRef(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Date picker states
  const [showFromDatePicker, setShowFromDatePicker] = useState<boolean>(false);
  const [showToDatePicker, setShowToDatePicker] = useState<boolean>(false);
  const [leaveBalance, setLeaveBalance] = useState<StaffLeaveBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    const bootstrap = async () => {
      const ctx = await loadTeacherLeaveContext();
      if (!isMounted.current) { return; }
      setSchoolCode(ctx.schoolCode);
      setBranchId(ctx.branchId);
      setTeacherId(ctx.employeeId);
      setResolvedTeacherId(ctx.employeeId);
    };
    bootstrap();
    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, []);
  const handleScroll = useScrollTabBar();

  useEffect(() => {
    if (schoolCode && (resolvedTeacherId || teacherId)) {
      loadHistory();
    }
  }, [schoolCode, resolvedTeacherId, teacherId]);

  const loadLeaveBalance = async (refDate?: Date | null) => {
    const employeeId = resolvedTeacherId || teacherId;
    if (!schoolCode || !employeeId) { return; }
    const ref = refDate || new Date();
    setBalanceLoading(true);
    try {
      const bal = await getStaffLeaveBalance(
        schoolCode,
        employeeId,
        ref.getMonth() + 1,
        ref.getFullYear(),
      );
      if (!isMounted.current) { return; }
      setLeaveBalance(bal);
      setAllocationType((prev) => {
        if (prev === 'LOP') { return 'LOP'; }
        const rem = getLeaveRemainingForType(bal, prev) ?? 0;
        if (rem > 0) { return prev; }
        return pickDefaultStaffLeaveType(bal);
      });
    } finally {
      if (isMounted.current) {
        setBalanceLoading(false);
      }
    }
  };

  useEffect(() => {
    if (schoolCode && (resolvedTeacherId || teacherId)) {
      loadLeaveBalance(fromDate);
    }
  }, [schoolCode, resolvedTeacherId, teacherId, fromDate]);

  const hasDuplicateLeave = (newFromDate: string, newToDate: string): boolean => {
    return history.some((leave) => {
      const status = (leave.status || '').toUpperCase();
      if (status !== 'PENDING' && status !== 'APPROVED') {return false;}
      return leave.from_date === newFromDate && leave.to_date === newToDate;
    });
  };

  const resetForm = () => {
    setFromDate(null);
    setToDate(null);
    setReason('');
    setLeaveType('one-day');
    setAllocationType(pickDefaultStaffLeaveType(leaveBalance));
    loadLeaveBalance(null);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate: Date | undefined,
    setDate: React.Dispatch<React.SetStateAction<Date | null>>,
    isFromDate: boolean = false
  ) => {
    if (Platform.OS === 'android') {
      setShowFromDatePicker(false);
      setShowToDatePicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setDate(selectedDate);

    if (isFromDate && toDate && selectedDate > toDate) {
      setToDate(null);
    }
  };

  const loadHistory = async () => {
    const employeeId = resolvedTeacherId || teacherId;
    if (!schoolCode || !employeeId) { return; }
    setLoadingHistory(true);
    try {
      const data = await listTeacherLeaveRequests(schoolCode, branchId, employeeId);
      if (isMounted.current) {
        setHistory(data?.items || []);
      }
    } catch (error: any) {
      console.error('Failed to load history:', error);
      if (isMounted.current) {
        setHistory([]);
      }
    } finally {
      if (isMounted.current) {
        setLoadingHistory(false);
      }
    }
  };

  const refreshAll = async () => {
    await loadHistory();
  };

  const formatDateToYMD = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    let employeeId = resolvedTeacherId || teacherId;
    let activeSchoolCode = schoolCode;
    let activeBranchId = branchId;

    if (!employeeId || !activeSchoolCode) {
      const ctx = await loadTeacherLeaveContext();
      employeeId = ctx.employeeId;
      activeSchoolCode = ctx.schoolCode;
      activeBranchId = ctx.branchId;
      if (ctx.employeeId) {
        setTeacherId(ctx.employeeId);
        setResolvedTeacherId(ctx.employeeId);
        setSchoolCode(ctx.schoolCode);
        setBranchId(ctx.branchId);
      }
    }
    if (!fromDate) {
      Alert.alert('Error', 'Please select a leave date');
      return;
    }
    const finalToDate = leaveType === 'one-day' ? fromDate : toDate;
    if (!finalToDate) {
      Alert.alert('Error', 'Please select a "To Date"');
      return;
    }
    if (leaveType === 'multiple' && toDate && toDate < fromDate) {
      Alert.alert('Error', 'To Date must be on or after From Date');
      return;
    }
    if (!isValidYear(formatDateToYMD(fromDate)) || !isValidYear(formatDateToYMD(finalToDate))) {
      Alert.alert('Error', 'Please select a valid date');
      return;
    }
    if (hasDuplicateLeave(formatDateToYMD(fromDate), formatDateToYMD(finalToDate))) {
      Alert.alert('Duplicate Request', 'An active leave request already exists for these dates.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for leave');
      return;
    }
    if (allocationType !== 'LOP') {
      if (balanceLoading) {
        Alert.alert('Please wait', 'Leave balance is still loading.');
        return;
      }
      const rem = getLeaveRemainingForType(leaveBalance, allocationType) ?? 0;
      if (rem <= 0) {
        Alert.alert(
          'No balance',
          'This leave type has no balance remaining. Select LOP or another available type.',
        );
        return;
      }
    }

    if (!employeeId) {
      Alert.alert('Error', 'Teacher ID not found. Please re-login.');
      return;
    }

    setSubmitting(true);
    try {
      await submitTeacherLeave(activeSchoolCode, activeBranchId, employeeId, {
        from_date: formatDateToYMD(fromDate),
        to_date: formatDateToYMD(finalToDate),
        reason: reason.trim(),
        leave_type: allocationType,
      });

      if (isMounted.current) {
        Alert.alert('Success', 'Leave request submitted successfully', [
          { text: 'OK', onPress: resetForm },
        ]);
        loadHistory();
        loadLeaveBalance(fromDate);
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        // Handled by global interceptor, but we should stop local processing
        return;
      }
      Alert.alert('Error', resolveApiErrorMessage(error, 'Failed to submit leave request'));
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, embedded && styles.containerEmbedded]} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      <ScrollView
        style={[styles.scrollView, !embedded && innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={[
          embedded ? styles.scrollContentEmbedded : innerPageLayoutStyles.scrollPageContent,
          styles.scrollContent,
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        {!embedded ? (
          <StandardPageHeader
            title="Leave Request"
            subtitle="Apply for leave and track your requests"
            showBack={navigation.canGoBack()}
            onBackPress={() => navigation.goBack()}
            scrollWithContent
            containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          />
        ) : scrollHeader ? (
          scrollHeader
        ) : null}
        <View style={[
          embedded ? innerPageLayoutStyles.contentFront : innerPageLayoutStyles.scrollBody,
          embedded && styles.embeddedGutter,
        ]}>
        <AppCard style={[styles.mainCard, embedded && styles.mainCardEmbedded]} elevated={false} variant="flat">
          <View style={styles.cardHeader}>
            <Calendar size={20} color={Theme.colors.primary} />
            <AppText weight="bold" style={styles.cardTitle}>New Application</AppText>
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.typeBtn, leaveType === 'one-day' && styles.typeBtnActive]}
              onPress={() => setLeaveType('one-day')}
            >
              <AppText weight="semibold" style={[styles.typeBtnText, leaveType === 'one-day' && styles.typeBtnTextActive]}>Single Day</AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.typeBtn, leaveType === 'multiple' && styles.typeBtnActive]}
              onPress={() => setLeaveType('multiple')}
            >
              <AppText weight="semibold" style={[styles.typeBtnText, leaveType === 'multiple' && styles.typeBtnTextActive]}>Multiple Days</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <AppText weight="semibold" style={styles.inputLabel}>Leave Type</AppText>
            {balanceLoading ? (
              <AppText style={styles.balanceHint}>Loading leave balance…</AppText>
            ) : null}
            <View style={styles.chipContainer}>
              {LEAVE_CATEGORY_OPTIONS.map((option) => {
                const isLop = option.key === 'LOP';
                const remaining = getLeaveRemainingForType(leaveBalance, option.key);
                const noBalance = !isLop && (remaining ?? 0) <= 0;
                const disabled = balanceLoading || noBalance;
                const chipLabel = isLop
                  ? option.label
                  : noBalance
                    ? option.label
                    : `${option.label} (${remaining})`;
                return (
                  <TouchableOpacity
                    key={option.key}
                    accessibilityRole="button"
                    disabled={disabled}
                    style={[
                      styles.chip,
                      allocationType === option.key && styles.chipActive,
                      disabled && styles.chipDisabled,
                    ]}
                    onPress={() => setAllocationType(option.key)}
                  >
                    <AppText
                      weight="semibold"
                      style={[
                        styles.chipText,
                        allocationType === option.key && styles.chipTextActive,
                        disabled && styles.chipTextDisabled,
                      ]}
                    >
                      {chipLabel}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.inputGroup}>
              <AppText weight="semibold" style={styles.inputLabel}>{leaveType === 'one-day' ? 'Date' : 'From Date'}</AppText>
              <TouchableOpacity accessibilityRole="button" style={styles.dateSelector} onPress={() => setShowFromDatePicker(true)}>
                <AppText weight="semibold" style={fromDate ? styles.dateValue : styles.datePlaceholder}>
                  {fromDate ? formatDateToYMD(fromDate) : 'YYYY-MM-DD'}
                </AppText>
                <Calendar size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {leaveType === 'multiple' && (
              <View style={styles.inputGroup}>
                <AppText weight="semibold" style={styles.inputLabel}>To Date</AppText>
                <TouchableOpacity accessibilityRole="button" style={styles.dateSelector} onPress={() => setShowToDatePicker(true)}>
                  <AppText weight="semibold" style={toDate ? styles.dateValue : styles.datePlaceholder}>
                    {toDate ? formatDateToYMD(toDate) : 'YYYY-MM-DD'}
                  </AppText>
                  <Calendar size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <AppText weight="semibold" style={styles.inputLabel}>Reason for Leave</AppText>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={3}
              placeholder="e.g. Family emergency, Medical checkup..."
              placeholderTextColor="#94a3b8"
              value={reason}
              onChangeText={setReason}
            />
          </View>

          <AppButton
            title="Submit Application"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.submitButton}
          />
        </AppCard>

        {/* History Section */}
          <View style={styles.sectionHeader}>
          <AppText weight="bold" style={styles.sectionTitle}>Application History</AppText>
          <TouchableOpacity accessibilityRole="button" onPress={refreshAll}>
            <AppText weight="semibold" style={styles.refreshText}>Refresh</AppText>
          </TouchableOpacity>
        </View>

        {loadingHistory ? (
          <View style={styles.loaderContainer}><Loader /></View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconContainer}>
              <FileText size={42} color="#94a3b8" />
            </View>
            <AppText weight="bold" style={styles.emptyStateTitle}>No Applications Yet</AppText>
            <AppText style={styles.emptyStateSubtext}>Your leave requests will appear here</AppText>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((request, idx) => (
              <LeaveHistoryCard key={request.leave_id || `leave-${idx}`} request={request} />
            ))}
          </View>
        )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' ? (
        <>
          <Modal visible={showFromDatePicker} transparent animationType="slide" onRequestClose={() => setShowFromDatePicker(false)}>
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerSheet}>
                <TouchableOpacity style={styles.pickerDone} onPress={() => setShowFromDatePicker(false)}>
                  <AppText weight="bold" style={styles.pickerDoneText}>Done</AppText>
                </TouchableOpacity>
                <DateTimePicker
                  value={fromDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(e, d) => handleDateChange(e, d, setFromDate, true)}
                  minimumDate={new Date()}
                />
              </View>
            </View>
          </Modal>
          <Modal visible={showToDatePicker} transparent animationType="slide" onRequestClose={() => setShowToDatePicker(false)}>
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerSheet}>
                <TouchableOpacity style={styles.pickerDone} onPress={() => setShowToDatePicker(false)}>
                  <AppText weight="bold" style={styles.pickerDoneText}>Done</AppText>
                </TouchableOpacity>
                <DateTimePicker
                  value={toDate || fromDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(e, d) => handleDateChange(e, d, setToDate)}
                  minimumDate={fromDate || new Date()}
                />
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          {showFromDatePicker ? (
            <DateTimePicker
              value={fromDate || new Date()}
              mode="date"
              display="default"
              onChange={(e, d) => handleDateChange(e, d, setFromDate, true)}
              minimumDate={new Date()}
            />
          ) : null}
          {showToDatePicker ? (
            <DateTimePicker
              value={toDate || fromDate || new Date()}
              mode="date"
              display="default"
              onChange={(e, d) => handleDateChange(e, d, setToDate)}
              minimumDate={fromDate || new Date()}
            />
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  containerEmbedded: {
    backgroundColor: Theme.colors.background,
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: Theme.colors.card,
    fontSize: 18,
  },
  heroContent: {
    marginBottom: 0,
  },
  heroGreeting: {
    color: Theme.colors.card,
    fontSize: 24,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  scrollContentEmbedded: {
    paddingBottom: 100,
  },
  mainCard: {
    marginTop: Theme.spacing.sm,
    marginHorizontal: 0,
    borderRadius: 12,
    padding: 16,
    backgroundColor: Theme.colors.card,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  mainCardEmbedded: {
    marginTop: 4,
    marginHorizontal: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    padding: Theme.spacing.xs,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnActive: {
    backgroundColor: Theme.colors.card,
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typeBtnText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  typeBtnTextActive: {
    color: Theme.colors.primary,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  balanceHint: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginBottom: 6,
  },
  chipText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  chipTextDisabled: {
    color: Theme.colors.textMuted,
  },
  formRow: {
    flexDirection: 'row',
    gap: 15,
    flexWrap: 'wrap',
  },
  inputGroup: {
    flex: 1,
    marginBottom: Theme.spacing.md,
    minWidth: Platform.OS === 'ios' ? 150 : 140,
  },
  inputLabel: {
    fontSize: 13,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.sm,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: Theme.spacing.md,
    height: 52,
    minHeight: 52,
  },
  dateValue: {
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  datePlaceholder: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
  },
  reasonInput: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    ...Theme.typography.body,
    color: Theme.colors.text,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  submitButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    height: 52,
    marginTop: 10,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  pickerDone: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pickerDoneText: {
    color: Theme.colors.primary,
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 15,
  },
  embeddedGutter: {
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
  },
  sectionTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  refreshText: {
    ...Theme.typography.body,
    color: Theme.colors.blue,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    borderRadius: 20,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.background,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
    }),
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    ...Theme.typography.body,
    color: '#334155',
  },
  dateArrow: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  reasonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  reasonText: {
    flex: 1,
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    lineHeight: 20,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
    paddingTop: 10,
  },
  appliedDate: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    fontStyle: 'italic',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    ...Theme.typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyState: {
    padding: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#334155',
    marginBottom: Theme.spacing.sm,
  },
  emptyStateSubtext: {
    color: Theme.colors.textMuted,
    ...Theme.typography.body,
    textAlign: 'center',
  },
});
