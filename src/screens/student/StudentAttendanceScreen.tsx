import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AvatarBubble from '../../components/common/AvatarBubble';
import AppText from '../../components/common/AppText';
import { colors } from '../../constants/theme';

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
      <AppText style={[styles.badgeText, getTextStyle()]}>{getDisplayText()}</AppText>
    </View>
  );
};

// Stat Card Component
const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={styles.statCard}>
    <AppText style={styles.statLabel}>{label}</AppText>
    <AppText style={styles.statValue}>{value}</AppText>
  </View>
);

export default function StudentAttendanceScreen({ navigation }: any) {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  // Generate month options (1-12)
  const monthOptions = [
    { label: 'All', value: '' },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`,
    })),
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Student'}!</AppText>
            <AppText style={styles.welcomeSub}>Track your attendance and academic progress.</AppText>
          </View>
          <View style={styles.dateBadge}>
            <Icon name="calendar" size={12} color={colors.textMuted} />
            <AppText style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </AppText>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <AppText style={styles.title}>Attendance Summary</AppText>
            <AppText style={styles.subText}>{items.length} records found</AppText>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchAttendance()}>
            <Icon name="refresh-cw" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Total" value={summary.total_days} />
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
            <View style={styles.pickerWrapper}>
              <AppText style={styles.pickerLabel}>Select Month</AppText>
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
                    <AppText
                      style={[
                        styles.monthOptionText,
                        month === option.value && styles.monthOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <AppText style={styles.inputLabel}>Year</AppText>
              <TextInput
                style={styles.input}
                placeholder="Year"
                placeholderTextColor={colors.textMuted}
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
              <AppText style={styles.applyBtnText}>Apply Filters</AppText>
            </TouchableOpacity>
          </View>

          {/* Attendance Table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <AppText style={[styles.tableHeaderText, styles.colDate]}>Date</AppText>
                <AppText style={[styles.tableHeaderText, styles.colStatus]}>Status</AppText>
                <AppText style={[styles.tableHeaderText, styles.colClass]}>Class</AppText>
                <AppText style={[styles.tableHeaderText, styles.colSection]}>Section</AppText>
                <AppText style={[styles.tableHeaderText, styles.colMarkedBy]}>Marked By</AppText>
              </View>

              {/* Table Body */}
              {loading ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#6366f1" />
                </View>
              ) : items.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AppText style={styles.emptyText}>No records found</AppText>
                </View>
              ) : (
                items.map((row) => (
                  <View key={row.attendance_id} style={styles.tableRow}>
                    <AppText style={[styles.tableCell, styles.colDate]}>{row.attendance_date}</AppText>
                    <View style={styles.colStatus}>
                      <StatusBadge status={row.status || ''} />
                    </View>
                    <AppText style={[styles.tableCell, styles.colClass]}>{row.class_name || '-'}</AppText>
                    <AppText style={[styles.tableCell, styles.colSection]}>{row.section_name || '-'}</AppText>
                    <AppText style={[styles.tableCell, styles.colMarkedBy]}>{row.marked_by || '-'}</AppText>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
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
    color: colors.textPrimary,
  },
  subText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  refreshBtn: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  filterRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerWrapper: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  monthOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  monthOptionText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  monthOptionTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  applyBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  colDate: { width: 90 },
  colStatus: { width: 90 },
  colClass: { width: 70 },
  colSection: { width: 70 },
  colMarkedBy: { width: 110 },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgePresent: { backgroundColor: 'rgba(21, 128, 61, 0.15)' },
  badgeLate: { backgroundColor: 'rgba(180, 83, 9, 0.15)' },
  badgeAbsent: { backgroundColor: 'rgba(185, 28, 28, 0.15)' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextPresent: { color: '#22c55e' },
  badgeTextLate: { color: '#f59e0b' },
  badgeTextAbsent: { color: '#ef4444' },
  loaderContainer: { padding: 40, alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontWeight: '500' },
});
