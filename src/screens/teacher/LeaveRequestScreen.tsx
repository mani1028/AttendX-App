import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Platform, Modal, Keyboard, KeyboardAvoidingView } from 'react-native';
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
import { leaveRequestStyles as styles } from '../../components/teacher/leaveRequest/leaveRequestStyles';
import { StatusBadge, LeaveHistoryCard, LeaveApplicationForm } from '../../components/teacher/leaveRequest';
import { loadTeacherLeaveContext, isValidYear, formatDateToYMD } from '../../components/teacher/leaveRequest/helpers';
import type { LeaveRequest } from '../../components/teacher/leaveRequest/types';


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
                <LeaveApplicationForm
          embedded={embedded}
          leaveType={leaveType}
          setLeaveType={setLeaveType}
          allocationType={allocationType}
          setAllocationType={setAllocationType}
          fromDate={fromDate}
          toDate={toDate}
          reason={reason}
          setReason={setReason}
          balanceLoading={balanceLoading}
          leaveBalance={leaveBalance}
          submitting={submitting}
          onSubmit={handleSubmit}
          onOpenFromDate={() => setShowFromDatePicker(true)}
          onOpenToDate={() => setShowToDatePicker(true)}
        />

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
              <FileText size={42} color={Theme.colors.textMuted} />
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
