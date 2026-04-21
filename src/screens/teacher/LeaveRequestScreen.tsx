import React, { useEffect, useState, useCallback } from 'react';
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
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState<string>('');
  
  // UI states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Date picker states
  const [showFromDatePicker, setShowFromDatePicker] = useState<boolean>(false);
  const [showToDatePicker, setShowToDatePicker] = useState<boolean>(false);

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
      Alert.alert('Error', 'Please select from date');
      return;
    }

    if (!toDate) {
      Alert.alert('Error', 'Please select to date');
      return;
    }

    if (toDate < fromDate) {
      Alert.alert('Error', 'To date must be after from date');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for leave');
      return;
    }

    setSubmitting(true);
    setMsg('');
    setError('');

    try {
      await API.post('/manage/teacher/leave-requests/submit', {
        school_code: schoolCode,
        teacher_id: teacherId,
        from_date: formatDate(fromDate),
        to_date: formatDate(toDate),
        reason: reason.trim(),
      });

      Alert.alert('Success', 'Leave request submitted successfully');
      
      // Reset form
      setFromDate(null);
      setToDate(null);
      setReason('');
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
              {/* From Date */}
              <View style={styles.field}>
                <Text style={styles.label}>From Date</Text>
                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowFromDatePicker(true)}>
                  <Text style={styles.datePickerText}>
                    {fromDate ? formatDate(fromDate) : 'Select from date'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>
                {showFromDatePicker && (
                  <DateTimePicker
                    value={fromDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onFromDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              {/* To Date */}
              <View style={styles.field}>
                <Text style={styles.label}>To Date</Text>
                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowToDatePicker(true)}>
                  <Text style={styles.datePickerText}>
                    {toDate ? formatDate(toDate) : 'Select to date'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>
                {showToDatePicker && (
                  <DateTimePicker
                    value={toDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onToDateChange}
                    minimumDate={fromDate || new Date()}
                  />
                )}
              </View>

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