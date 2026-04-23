import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

// Types
interface LeaveRequest {
  leave_id: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
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

const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isValidYear = (dateString: string): boolean => {
  if (!dateString) return true;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  return year >= 1000 && year <= new Date().getFullYear();
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

  const getDisplayText = () => {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus === 'APPROVED') return 'Approved';
    if (upperStatus === 'REJECTED') return 'Rejected';
    return 'Pending';
  };

  return (
    <View style={[styles.badge, getStatusStyle()]}>
      <Text style={[styles.badgeText, getTextStyle()]}>
        {getDisplayText()}
      </Text>
    </View>
  );
};

// Leave History Card Component
const LeaveHistoryCard: React.FC<{ request: LeaveRequest }> = ({ request }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <AppCard style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.dateRange}>
          <Text style={styles.dateLabel}>📅 {formatDate(request.from_date)}</Text>
          <Text style={styles.dateArrow}>→</Text>
          <Text style={styles.dateLabel}>{formatDate(request.to_date)}</Text>
        </View>
        <StatusBadge status={request.status} />
      </View>
      
      <Text style={styles.reasonLabel}>Reason:</Text>
      <Text style={styles.reasonText}>{request.reason}</Text>
      
      <Text style={styles.appliedDate}>
        Applied: {formatDate(request.created_at)}
      </Text>
    </AppCard>
  );
};

export default function LeaveRequestScreen() {
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  
  // Form fields
  const [leaveType, setLeaveType] = useState<'one-day' | 'multiple'>('one-day');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState<string>('');
  
  // UI states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  
  // Date picker states
  const [showFromDatePicker, setShowFromDatePicker] = useState<boolean>(false);
  const [showToDatePicker, setShowToDatePicker] = useState<boolean>(false);

  const minDate = getTodayDate();

  // Load credentials
  useEffect(() => {
    const loadCredentials = async () => {
      const code = await getSchoolCode();
      const tid = await getTeacherId();
      setSchoolCode(code);
      setTeacherId(tid);
    };
    loadCredentials();
  }, []);

  // Load history when credentials are ready
  useEffect(() => {
    if (schoolCode && teacherId) {
      loadHistory();
    }
  }, [schoolCode, teacherId]);

  // Check for duplicate leave requests (exact same date range)
  const hasDuplicateLeave = (newFromDate: string, newToDate: string): boolean => {
    return history.some((leave) => {
      // Only check against PENDING and APPROVED requests
      const status = (leave.status || '').toUpperCase();
      if (status === 'REJECTED') return false;
      
      // Only reject if exact same from_date AND to_date
      return leave.from_date === newFromDate && leave.to_date === newToDate;
    });
  };

  const loadHistory = async () => {
    if (!schoolCode || !teacherId) return;

    setLoadingHistory(true);
    try {
      // Try POST endpoint first
      let res;
      try {
        res = await API.post('/manage/teacher/leave-requests/list', {
          school_code: schoolCode,
          teacher_id: teacherId,
        });
      } catch {
        // Fallback to GET endpoint
        res = await API.get('/manage/teacher/leave-requests', {
          params: {
            school_code: schoolCode,
            teacher_id: teacherId,
          },
        });
      }
      setHistory(res.data?.items || []);
    } catch (error) {
      console.error('Failed to load history:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!fromDate) {
      Alert.alert('Error', 'Please select a leave date');
      return;
    }

    // For one-day leave, toDate is same as fromDate
    const finalToDate = leaveType === 'one-day' ? fromDate : toDate;

    if (!finalToDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (leaveType === 'multiple' && toDate && toDate < fromDate) {
      Alert.alert('Error', 'To date must be after from date');
      return;
    }

    // Validate year for both dates
    if (!isValidYear(formatDate(fromDate))) {
      Alert.alert('Error', 'Invalid year in From Date. Please use a valid year (e.g., 1991, 1823, 2026)');
      return;
    }

    if (!isValidYear(formatDate(finalToDate))) {
      Alert.alert('Error', 'Invalid year in To Date. Please use a valid year (e.g., 1991, 1823, 2026)');
      return;
    }

    // Check for duplicate leave requests (exact same dates)
    if (hasDuplicateLeave(formatDate(fromDate), formatDate(finalToDate))) {
      Alert.alert(
        'Duplicate Request',
        'You already have a leave request for the exact same dates. Please choose different dates.'
      );
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your leave');
      return;
    }

    setSubmitting(true);

    try {
      await API.post('/manage/teacher/leave-requests/submit', {
        school_code: schoolCode,
        teacher_id: teacherId,
        from_date: formatDate(fromDate),
        to_date: formatDate(finalToDate),
        reason: reason.trim(),
      });

      Alert.alert('Success', 'Leave request submitted successfully');
      
      // Reset form
      setFromDate(null);
      setToDate(null);
      setReason('');
      setLeaveType('one-day');
      await loadHistory();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || 'Failed to submit leave request';
      Alert.alert('Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      setFromDate(selectedDate);
      // If toDate is before fromDate, reset toDate
      if (toDate && toDate < selectedDate) {
        setToDate(null);
      }
    }
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    setShowToDatePicker(false);
    if (selectedDate) {
      setToDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>📅 Leave Request</Text>
          </View>
        </View>

        {/* Two Column Layout */}
        <View style={styles.grid}>
          {/* Apply Leave Form */}
          <AppCard style={styles.formCard}>
            <Text style={styles.cardTitle}>Apply for Leave</Text>
            <View style={styles.formBody}>
              {/* Leave Type Selection */}
              <View style={styles.field}>
                <Text style={styles.label}>Leave Type</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[styles.radioOption, leaveType === 'one-day' && styles.radioOptionActive]}
                    onPress={() => setLeaveType('one-day')}
                  >
                    <View style={[styles.radioCircle, leaveType === 'one-day' && styles.radioCircleActive]} />
                    <Text style={[styles.radioText, leaveType === 'one-day' && styles.radioTextActive]}>
                      One Day
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioOption, leaveType === 'multiple' && styles.radioOptionActive]}
                    onPress={() => setLeaveType('multiple')}
                  >
                    <View style={[styles.radioCircle, leaveType === 'multiple' && styles.radioCircleActive]} />
                    <Text style={[styles.radioText, leaveType === 'multiple' && styles.radioTextActive]}>
                      Multiple Days
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* From Date */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  {leaveType === 'one-day' ? 'Leave Date' : 'From Date'}
                </Text>
                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowFromDatePicker(true)}>
                  <Text style={styles.datePickerText}>
                    {fromDate ? formatDate(fromDate) : 'Select date'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>
                {showFromDatePicker && (
                  <DateTimePicker
                    value={fromDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onFromDateChange}
                    minimumDate={new Date(minDate)}
                  />
                )}
              </View>

              {/* To Date (only for multiple days) */}
              {leaveType === 'multiple' && (
                <View style={styles.field}>
                  <Text style={styles.label}>To Date</Text>
                  <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowToDatePicker(true)}>
                    <Text style={styles.datePickerText}>
                      {toDate ? formatDate(toDate) : 'Select date'}
                    </Text>
                    <Text style={styles.calendarIcon}>📅</Text>
                  </TouchableOpacity>
                  {showToDatePicker && (
                    <DateTimePicker
                      value={toDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onToDateChange}
                      minimumDate={fromDate || new Date(minDate)}
                    />
                  )}
                </View>
              )}

              {/* Reason */}
              <View style={styles.field}>
                <Text style={styles.label}>Reason</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Enter the reason for your leave request..."
                  placeholderTextColor="#94a3b8"
                  textAlignVertical="top"
                />
              </View>

              {/* Submit Button */}
              <AppButton
                title={submitting ? 'Submitting...' : 'Submit Leave Request'}
                onPress={handleSubmit}
                disabled={submitting}
                style={styles.submitBtn}
              />
            </View>
          </AppCard>

          {/* Leave History */}
          <AppCard style={styles.historyCardContainer}>
            <Text style={styles.cardTitle}>Leave History</Text>
            {loadingHistory ? (
              <Loader />
            ) : history.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No leave requests found</Text>
                <Text style={styles.emptyText}>Your leave history will appear here</Text>
              </View>
            ) : (
              history.map((request) => (
                <LeaveHistoryCard key={request.leave_id} request={request} />
              ))
            )}
          </AppCard>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>👑 Role: Teacher • Leave Management</Text>
        </View>
      </ScrollView>
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
    marginBottom: 22,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  grid: {
    gap: 22,
  },
  formCard: {
    padding: 0,
    overflow: 'hidden',
  },
  historyCardContainer: {
    padding: 0,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    padding: 18,
    paddingBottom: 8,
  },
  formBody: {
    padding: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
  radioCircleActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  radioTextActive: {
    color: '#2563eb',
  },
  datePickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  datePickerText: {
    fontSize: 14,
    color: '#0f172a',
  },
  calendarIcon: {
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 8,
  },
  historyCard: {
    margin: 12,
    padding: 14,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  dateArrow: {
    fontSize: 12,
    color: '#64748b',
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 8,
  },
  appliedDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
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
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
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
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
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
});