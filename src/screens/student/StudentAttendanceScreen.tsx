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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

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
    if (upperStatus === 'LATE' || upperStatus === 'HALF_DAY') return styles.badgeLate;
    return styles.badgeAbsent;
  };

  const getTextStyle = () => {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus === 'PRESENT') return styles.badgeTextPresent;
    if (upperStatus === 'LATE' || upperStatus === 'HALF_DAY') return styles.badgeTextLate;
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
  const { userName } = useAuth();
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
  }, [schoolCode, studentId, month, year]);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  // Generate month options (1-12)
  const monthOptions = [
    { label: 'All Months', value: '' },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`,
    })),
  ];

  // Year options (last 5 years to next 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => ({
    label: String(currentYear - 5 + i),
    value: String(currentYear - 5 + i),
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Student'}!</Text>
          <Text style={styles.welcomeSub}>Track your attendance and academic progress.</Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeIcon}>📅</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📊 Attendance</Text>
          <Text style={styles.subText}>{items.length} records found</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchAttendance()}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid - 5 cards as in web version */}
      <View style={styles.statsGrid}>
        <StatCard label="Total Days" value={summary.total_days} />
        <StatCard label="Present" value={summary.present_days} />
        <StatCard label="Half Day" value={summary.half_day_count || summary.late_days || 0} />
        <StatCard label="Absent" value={summary.absent_days} />
        <StatCard label="Attendance %" value={`${summary.attendance_percentage}%`} />
      </View>

      {/* Filters Card */}
      <AppCard style={styles.filterCard}>
        <View style={styles.filterRow}>
          {/* Month Picker */}
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {monthOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value || 'all'}
                    style={[
                      styles.filterChip,
                      month === option.value && styles.filterChipActive,
                    ]}
                    onPress={() => setMonth(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        month === option.value && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Year Picker - Changed to chips for better UX */}
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {yearOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      year === option.value && styles.filterChipActive,
                    ]}
                    onPress={() => setYear(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        year === option.value && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Apply Button */}
          <TouchableOpacity style={styles.applyBtn} onPress={() => fetchAttendance()}>
            <Text style={styles.applyBtnText}>🔄 Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </AppCard>

      {/* Attendance Table */}
      <AppCard style={styles.tableCard}>
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
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No records found</Text>
                <Text style={styles.emptyText}>No attendance records available for selected filters</Text>
              </View>
            ) : (
              items.map((row) => (
                <View key={row.attendance_id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colDate]}>{row.attendance_date}</Text>
                  <View style={[styles.tableCell, styles.colStatus]}>
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
      </AppCard>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>👨‍🎓 Student ID: {studentId || '—'}</Text>
        <Text style={styles.footerText}>🏫 School: {schoolCode || '—'}</Text>
      </View>
    </ScrollView>
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
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  welcomeSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateBadgeIcon: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subText: {
    color: '#64748b',
    fontSize: 13,
  },
  refreshBtn: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  refreshBtnText: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7edf5',
    borderRadius: 16,
    padding: 14,
    width: '18%',
    minWidth: 90,
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  statValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  filterCard: {
    padding: 16,
    marginBottom: 16,
  },
  filterRow: {
    marginBottom: 0,
  },
  filterField: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 14,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  applyBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  tableCard: {
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  tableCell: {
    // Shared with a View status cell; keep this style View-safe.
  },
  colDate: { width: 90 },
  colStatus: { width: 90 },
  colClass: { width: 70 },
  colSection: { width: 70 },
  colMarkedBy: { width: 110 },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
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
    fontSize: 11,
    fontWeight: '700',
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
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
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
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
  },
});