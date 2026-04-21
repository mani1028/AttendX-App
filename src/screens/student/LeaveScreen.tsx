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
interface Teacher {
  teacher_id: string;
  teacher_full_name: string;
}

interface LeaveRequest {
  leave_id: string;
  teacher_full_name?: string;
  teacher_id?: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getStudentId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('student_id');
  return id || (await AsyncStorage.getItem('studentId')) || '';
};

const getParentId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('parent_id');
  return id || (await AsyncStorage.getItem('parentId')) || '';
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

  return (
    <View style={[styles.badge, getStatusStyle()]}>
      <Text style={[styles.badgeText, getTextStyle()]}>
        {status?.toUpperCase() || 'PENDING'}
      </Text>
    </View>
  );
};

export default function LeaveScreen() {
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [parentId, setParentId] = useState<string>('');
  
  // Form fields
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  // UI states
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  
  // Date picker states
  const [showFromDatePicker, setShowFromDatePicker] = useState<boolean>(false);
  const [showToDatePicker, setShowToDatePicker] = useState<boolean>(false);

  // Load stored credentials
  useEffect(() => {
    const loadCredentials = async () => {
      const code = await getSchoolCode();
      const sid = await getStudentId();
      const pid = await getParentId();
      setSchoolCode(code);
      setStudentId(sid);
      setParentId(pid);
    };
    loadCredentials();
  }, []);

  // Load data when credentials are ready
  useEffect(() => {
    if (schoolCode && studentId) {
      loadTeachers();
      loadHistory();
    }
  }, [schoolCode, studentId]);

  const loadTeachers = async () => {
    if (!schoolCode || !studentId) return;

    setLoadingTeachers(true);
    try {
      const res = await API.get('/manage/student-dashboard/teachers-for-leave', {
        params: {
          school_code: schoolCode,
          student_id: studentId,
        },
      });
      const teachersData = res.data?.items || [];
      setTeachers(teachersData);
      if (teachersData.length > 0) {
        setTeacherId(teachersData[0].teacher_id);
      }
    } catch (error) {
      console.error('Failed to load teachers', error);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const loadHistory = async () => {
    if (!schoolCode || !studentId) return;

    try {
      const res = await API.get('/manage/student-dashboard/leave-requests', {
        params: {
          school_code: schoolCode,
          student_id: studentId,
        },
      });
      setHistory(res.data?.items || []);
    } catch (error) {
      console.error('Failed to load leave history', error);
      setHistory([]);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadTeachers(), loadHistory()]);
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!teacherId) {
      Alert.alert('Error', 'Please select a teacher');
      return;
    }

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
    try {
      await API.post('/manage/student-dashboard/leave-requests', {
        school_code: schoolCode,
        student_id: studentId,
        parent_id: parentId ? Number(parentId) : null,
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

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      setFromDate(selectedDate);
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
            <Text style={styles.subText}>{history.length} records</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadHistory}>
            <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Two Column Layout */}
        <View style={styles.grid}>
          {/* Apply Leave Form */}
          <AppCard style={styles.formCard}>
            <Text style={styles.cardTitle}>Apply Leave</Text>
            <View style={styles.formBody}>
              {/* Teacher Selection */}
              <View style={styles.field}>
                <Text style={styles.label}>Select Teacher</Text>
                {loadingTeachers ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : teachers.length === 0 ? (
                  <Text style={styles.noDataText}>No teachers available</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.teacherChipContainer}>
                      {teachers.map((teacher) => (
                        <TouchableOpacity
                          key={teacher.teacher_id}
                          style={[
                            styles.teacherChip,
                            teacherId === teacher.teacher_id && styles.teacherChipActive,
                          ]}
                          onPress={() => setTeacherId(teacher.teacher_id)}
                        >
                          <Text
                            style={[
                              styles.teacherChipText,
                              teacherId === teacher.teacher_id && styles.teacherChipTextActive,
                            ]}
                          >
                            {teacher.teacher_full_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>

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
                  placeholder="Enter reason for leave..."
                  placeholderTextColor="#94a3b8"
                  textAlignVertical="top"
                />
              </View>

              {/* Submit Button */}
              <AppButton
                title={submitting ? 'Submitting...' : 'Submit Leave Request'}
                onPress={handleSubmit}
                disabled={submitting || teachers.length === 0}
                style={styles.submitBtn}
              />
            </View>
          </AppCard>

          {/* Leave History */}
          <AppCard style={styles.historyCard}>
            <Text style={styles.cardTitle}>Leave History</Text>
            {history.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No leave requests found</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colTeacher]}>Teacher</Text>
                    <Text style={[styles.tableHeaderText, styles.colFrom]}>From</Text>
                    <Text style={[styles.tableHeaderText, styles.colTo]}>To</Text>
                    <Text style={[styles.tableHeaderText, styles.colReason]}>Reason</Text>
                    <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
                  </View>

                  {/* Table Rows */}
                  {history.map((row) => (
                    <View key={row.leave_id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.colTeacher]}>
                        {row.teacher_full_name || row.teacher_id || '-'}
                      </Text>
                      <Text style={[styles.tableCell, styles.colFrom]}>
                        {formatDisplayDate(row.from_date)}
                      </Text>
                      <Text style={[styles.tableCell, styles.colTo]}>
                        {formatDisplayDate(row.to_date)}
                      </Text>
                      <Text style={[styles.tableCell, styles.colReason]} numberOfLines={2}>
                        {row.reason}
                      </Text>
                      <View style={[styles.tableCell, styles.colStatus]}>
                        <StatusBadge status={row.status} />
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </AppCard>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
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
    marginLeft: 8,
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  refreshBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'column',
    gap: 22,
  },
  formCard: {
    padding: 0,
    overflow: 'hidden',
  },
  historyCard: {
    padding: 0,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    padding: 18,
    paddingBottom: 0,
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
  teacherChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teacherChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
    marginRight: 8,
    marginBottom: 8,
  },
  teacherChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  teacherChipText: {
    fontSize: 14,
    color: '#475569',
  },
  teacherChipTextActive: {
    color: '#ffffff',
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  tableCell: {
    fontSize: 14,
    color: '#0f172a',
  },
  colTeacher: {
    width: 120,
  },
  colFrom: {
    width: 90,
  },
  colTo: {
    width: 90,
  },
  colReason: {
    width: 150,
  },
  colStatus: {
    width: 90,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeApproved: {
    backgroundColor: '#dcfce7',
  },
  badgeRejected: {
    backgroundColor: '#fee2e2',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextApproved: {
    color: '#15803d',
  },
  badgeTextRejected: {
    color: '#b91c1c',
  },
  badgeTextPending: {
    color: '#b45309',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
  },
  noDataText: {
    color: '#94a3b8',
    fontSize: 14,
    paddingVertical: 8,
  },
});