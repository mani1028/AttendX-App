import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Calendar, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

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
  return year >= 1000 && year <= new Date().getFullYear() + 1;
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
      <Text style={[styles.badgeText, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
};

// Leave History Card Component
const LeaveHistoryCard: React.FC<{ request: LeaveRequest }> = ({ request }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <AppCard style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.dateRangeContainer}>
          <Calendar size={16} color="#64748b" />
          <Text style={styles.dateText}>{formatDate(request.from_date)}</Text>
          {request.from_date !== request.to_date && (
            <>
              <Text style={styles.dateArrow}>→</Text>
              <Text style={styles.dateText}>{formatDate(request.to_date)}</Text>
            </>
          )}
        </View>
        <StatusBadge status={request.status} />
      </View>
      
      <View style={styles.reasonContainer}>
        <FileText size={14} color="#94a3b8" style={{ marginTop: 2 }} />
        <Text style={styles.reasonText} numberOfLines={2}>{request.reason}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.appliedDate}>
          Applied on {formatDate(request.created_at)}
        </Text>
      </View>
    </AppCard>
  );
};

export default function LeaveRequestScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  
  // Form fields
  const [leaveType, setLeaveType] = useState<'one-day' | 'multiple'>('one-day');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState<string>('');
  
  // UI states
  const isMounted = useRef(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  
  // Date picker states
  const [showFromDatePicker, setShowFromDatePicker] = useState<boolean>(false);
  const [showToDatePicker, setShowToDatePicker] = useState<boolean>(false);

  const minDate = getTodayDate();

  useEffect(() => {
    isMounted.current = true;
    const loadCredentials = async () => {
      const code = await getSchoolCode();
      const tid = await getTeacherId();
      if (isMounted.current) {
        setSchoolCode(code);
        setTeacherId(tid);
      }
    };
    loadCredentials();
    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
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

  useEffect(() => {
    if (schoolCode && teacherId) {
      loadHistory();
    }
  }, [schoolCode, teacherId]);

  const hasDuplicateLeave = (newFromDate: string, newToDate: string): boolean => {
    return history.some((leave) => {
      const status = (leave.status || '').toUpperCase();
      if (status === 'REJECTED') return false;
      return leave.from_date === newFromDate && leave.to_date === newToDate;
    });
  };

  const loadHistory = async () => {
    if (!schoolCode || !teacherId) return;
    setLoadingHistory(true);
    try {
      let res;
      try {
        res = await API.post('/manage/teacher/leave-requests/list', {
          school_code: schoolCode,
          teacher_id: teacherId,
        });
      } catch {
        res = await API.get('/manage/teacher/leave-requests', {
          params: { school_code: schoolCode, teacher_id: teacherId },
        });
      }
      if (isMounted.current) {
        setHistory(res.data?.items || []);
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
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const formatDateToYMD = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
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
      Alert.alert('Error', 'To date must be after from date');
      return;
    }
    if (!isValidYear(formatDateToYMD(fromDate)) || !isValidYear(formatDateToYMD(finalToDate))) {
      Alert.alert('Error', 'Please select a valid date');
      return;
    }
    if (hasDuplicateLeave(formatDateToYMD(fromDate), formatDateToYMD(finalToDate))) {
      Alert.alert('Duplicate Request', 'A leave request already exists for these dates.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for leave');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/manage/teacher/leave-requests/submit', {
        school_code: schoolCode,
        teacher_id: teacherId,
        from_date: formatDateToYMD(fromDate),
        to_date: formatDateToYMD(finalToDate),
        reason: reason.trim(),
      });

      Alert.alert('Success', 'Leave request submitted successfully');

      if (isMounted.current) {
        setFromDate(null);
        setToDate(null);
        setReason('');
        setLeaveType('one-day');
        loadHistory();
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        // Handled by global interceptor, but we should stop local processing
        return;
      }
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to submit leave request');
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Navy Hero Header */}
      <View style={styles.heroHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Leave Request</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroGreeting}>Request Time Off</Text>
          <Text style={styles.heroSubtext}>Submit and track your leave applications</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#001F3F" />}
      >
        {/* Form Card */}
        <AppCard style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <Calendar size={20} color="#001F3F" />
            <Text style={styles.cardTitle}>New Application</Text>
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeBtn, leaveType === 'one-day' && styles.typeBtnActive]}
              onPress={() => setLeaveType('one-day')}
            >
              <Text style={[styles.typeBtnText, leaveType === 'one-day' && styles.typeBtnTextActive]}>Single Day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, leaveType === 'multiple' && styles.typeBtnActive]}
              onPress={() => setLeaveType('multiple')}
            >
              <Text style={[styles.typeBtnText, leaveType === 'multiple' && styles.typeBtnTextActive]}>Multiple Days</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{leaveType === 'one-day' ? 'Date' : 'From Date'}</Text>
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowFromDatePicker(true)}>
                <Text style={fromDate ? styles.dateValue : styles.datePlaceholder}>
                  {fromDate ? formatDateToYMD(fromDate) : 'YYYY-MM-DD'}
                </Text>
                <Calendar size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {leaveType === 'multiple' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>To Date</Text>
                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowToDatePicker(true)}>
                  <Text style={toDate ? styles.dateValue : styles.datePlaceholder}>
                    {toDate ? formatDateToYMD(toDate) : 'YYYY-MM-DD'}
                  </Text>
                  <Calendar size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reason for Leave</Text>
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
            title={submitting ? 'Submitting...' : 'Submit Application'}
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
            textStyle={styles.submitButtonText}
          />
        </AppCard>

        {/* History Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Application History</Text>
          <TouchableOpacity onPress={refreshAll}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loadingHistory ? (
          <View style={styles.loaderContainer}><Loader /></View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No history found</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((request) => (
              <LeaveHistoryCard key={request.leave_id} request={request} />
            ))}
          </View>
        )}

        {showFromDatePicker && (
          <DateTimePicker
            value={fromDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => { setShowFromDatePicker(false); if(d) setFromDate(d); }}
            minimumDate={new Date()}
          />
        )}
        {showToDatePicker && (
          <DateTimePicker
            value={toDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => { setShowToDatePicker(false); if(d) setToDate(d); }}
            minimumDate={fromDate || new Date()}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroHeader: {
    backgroundColor: '#001F3F',
    height: 200,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  heroContent: {
    marginTop: 25,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  mainCard: {
    marginTop: -40,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#001F3F',
  },
  formRow: {
    flexDirection: 'row',
    gap: 15,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  dateValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  datePlaceholder: {
    fontSize: 14,
    color: '#94A3B8',
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#0F172A',
  },
  submitButton: {
    backgroundColor: '#001F3F',
    borderRadius: 12,
    height: 52,
    marginTop: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dateArrow: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reasonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  appliedDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
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
    fontWeight: '700',
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
    fontWeight: '500',
  },
});