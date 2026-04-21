import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';

// Types
interface AttendanceRecord {
  attendance_id: string;
  attendance_date: string;
  status: string;
  class_name?: string;
  section_name?: string;
  marked_by?: string;
}

interface AttendanceSummary {
  total_days: number;
  present_days: number;
  half_day_count: number;
  absent_days: number;
  late_days: number;
  attendance_percentage: number;
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

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getBadgeStyle = () => {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus === 'PRESENT') return styles.badgePresent;
    if (upperStatus === 'LATE') return styles.badgeLate;
    return styles.badgeAbsent;
  };

  const getTextStyle = () => {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus === 'PRESENT') return styles.badgeTextPresent;
    if (upperStatus === 'LATE') return styles.badgeTextLate;
    return styles.badgeTextAbsent;
  };

  const getDisplayText = () => {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus === 'LATE') return 'HALF DAY';
    return status || '-';
  };

  return (
    <View style={[styles.badge, getBadgeStyle()]}>
      <Text style={[styles.badgeText, getTextStyle()]}>{getDisplayText()}</Text>
    </View>
  );
};

// Stat Card Component
const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

export default function StudentAttendanceScreen() {
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [items, setItems] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total_days: 0,
    present_days: 0,
    half_day_count: 0,
    absent_days: 0,
    late_days: 0,
    attendance_percentage: 0,
  });

  // Load stored credentials
  useEffect(() => {
    const loadCredentials = async () => {
      const code = await getSchoolCode();
      const id = await getStudentId();
      setSchoolCode(code);
      setStudentId(id);
    };
    loadCredentials();
  }, []);

  // Fetch attendance when credentials are ready
  useEffect(() => {
    if (schoolCode && studentId) {
      fetchAttendance();
    }
  }, [schoolCode, studentId]);

  const fetchAttendance = async (showLoading = true) => {
    if (!schoolCode || !studentId) return;

    if (showLoading) setLoading(true);
    try {
      const params: any = {
        school_code: schoolCode,
        student_id: studentId,
      };
      if (month) params.month = month;
      if (year) params.year = year;

      const res = await API.get('/manage/student-dashboard/attendance', { params });
      setItems(res.data?.items || []);
      setSummary(
        res.data?.summary || {
          total_days: 0,
          present_days: 0,
          half_day_count: 0,
          absent_days: 0,
          late_days: 0,
          attendance_percentage: 0,
        }
      );
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setItems([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendance(false);
    setRefreshing(false);
  };

  const handleApplyFilters = () => {
    fetchAttendance();
  };

  // Generate month options (1-12)
  const monthOptions = [
    { label: 'All Months', value: '' },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`,
    })),
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>📅 Attendance</Text>
          <Text style={styles.subText}>{items.length} records</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchAttendance()}>
          <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Total Days" value={summary.total_days} />
        <StatCard label="Present" value={summary.present_days} />
        <StatCard
          label="Half Day"
          value={summary.half_day_count || summary.late_days || 0}
        />
        <StatCard label="Absent" value={summary.absent_days} />
        <StatCard label="Attendance %" value={`${summary.attendance_percentage}%`} />
      </View>

      {/* Filters Card */}
      <View style={styles.card}>
        <View style={styles.filterRow}>
          {/* Month Picker - using simplified picker */}
          <View style={styles.pickerWrapper}>
            <Text style={styles.pickerLabel}>Month</Text>
            <View style={styles.pickerContainer}>
              {monthOptions.map((option) => (
                <TouchableOpacity
                  key={option.value || 'all'}
                  style={[
                    styles.monthOption,
                    month === option.value && styles.monthOptionActive,
                  ]}
                  onPress={() => setMonth(option.value)}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      month === option.value && styles.monthOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Year Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Year</Text>
            <TextInput
              style={styles.input}
              placeholder="Year"
              placeholderTextColor="#94a3b8"
              value={year}
              onChangeText={setYear}
              keyboardType="numeric"
            />
          </View>

          {/* Apply Button */}
          <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
            <Text style={styles.applyBtnText}>🔄 Apply Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Attendance Table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
              <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
              <Text style={[styles.tableHeaderText, styles.colClass]}>Class</Text>
              <Text style={[styles.tableHeaderText, styles.colSection]}>Section</Text>
              <Text style={[styles.tableHeaderText, styles.colMarkedBy]}>Marked By</Text>
            </View>

            {/* Table Body */}
            {loading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No attendance records found</Text>
              </View>
            ) : (
              items.map((row) => (
                <View key={row.attendance_id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colDate]}>{row.attendance_date}</Text>
                  <View style={styles.colStatus}>
                    <StatusBadge status={row.status || ''} />
                  </View>
                  <Text style={[styles.tableCell, styles.colClass]}>{row.class_name || '-'}</Text>
                  <Text style={[styles.tableCell, styles.colSection]}>{row.section_name || '-'}</Text>
                  <Text style={[styles.tableCell, styles.colMarkedBy]}>{row.marked_by || '-'}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
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
    flexWrap: 'wrap',
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
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  refreshBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7edf5',
    borderRadius: 18,
    padding: 20,
    width: '18%',
    minWidth: 100,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7edf5',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 3,
  },
  filterRow: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  pickerWrapper: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
  },
  monthOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  monthOptionText: {
    fontSize: 13,
    color: '#475569',
  },
  monthOptionTextActive: {
    color: '#ffffff',
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0f172a',
  },
  applyBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe3ee',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBtnText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
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
  colDate: {
    width: 100,
  },
  colStatus: {
    width: 100,
  },
  colClass: {
    width: 80,
  },
  colSection: {
    width: 80,
  },
  colMarkedBy: {
    width: 120,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgePresent: {
    backgroundColor: '#dcfce7',
  },
  badgeLate: {
    backgroundColor: '#fef3c7',
  },
  badgeAbsent: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeTextPresent: {
    color: '#15803d',
  },
  badgeTextLate: {
    color: '#b45309',
  },
  badgeTextAbsent: {
    color: '#b91c1c',
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
  },
});