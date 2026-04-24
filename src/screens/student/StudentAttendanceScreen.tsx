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
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import Icon from '@react-native-vector-icons/feather';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

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
  const getBadgeConfig = () => {
    const upperStatus = status?.toUpperCase() || '';
    if (upperStatus === 'PRESENT') {
      return {
        container: styles.badgePresent,
        text: styles.badgeTextPresent,
        label: 'PRESENT',
        icon: '✓',
      };
    }
    if (upperStatus === 'LATE') {
      return {
        container: styles.badgeLate,
        text: styles.badgeTextLate,
        label: 'LATE',
        icon: '⏰',
      };
    }
    if (upperStatus === 'HALF_DAY') {
      return {
        container: styles.badgeHalfDay,
        text: styles.badgeTextHalfDay,
        label: 'HALF DAY',
        icon: '½',
      };
    }
    return {
      container: styles.badgeAbsent,
      text: styles.badgeTextAbsent,
      label: 'ABSENT',
      icon: '✗',
    };
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badge, config.container]}>
      <Text style={styles.badgeIcon}>{config.icon}</Text>
      <Text style={[styles.badgeText, config.text]}>{config.label}</Text>
    </View>
  );
};

// Stat Card Component
const StatCard: React.FC<{ label: string; value: string | number; trend?: number }> = ({ 
  label, 
  value,
  trend 
}) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
    {trend !== undefined && (
      <View style={styles.trendContainer}>
        <Icon name={trend >= 0 ? "trending-up" : "trending-down"} size={12} color={trend >= 0 ? "#10b981" : "#ef4444"} />
        <Text style={[styles.trendText, { color: trend >= 0 ? "#10b981" : "#ef4444" }]}>
          {Math.abs(trend)}%
        </Text>
      </View>
    )}
  </View>
);

// MonthPicker Component
const MonthPicker: React.FC<{
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}> = ({ selectedMonth, onSelectMonth }) => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Select Month</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
        <TouchableOpacity
          style={[styles.monthChip, !selectedMonth && styles.monthChipActive]}
          onPress={() => onSelectMonth('')}
        >
          <Text style={[styles.monthChipText, !selectedMonth && styles.monthChipTextActive]}>All</Text>
        </TouchableOpacity>
        {months.map((month, index) => (
          <TouchableOpacity
            key={month}
            style={[
              styles.monthChip,
              selectedMonth === String(index + 1) && styles.monthChipActive,
            ]}
            onPress={() => onSelectMonth(String(index + 1))}
          >
            <Text
              style={[
                styles.monthChipText,
                selectedMonth === String(index + 1) && styles.monthChipTextActive,
              ]}
            >
              {month}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// YearPicker Component
const YearPicker: React.FC<{
  selectedYear: string;
  onSelectYear: (year: string) => void;
}> = ({ selectedYear, onSelectYear }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Select Year</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
        {years.map((year) => (
          <TouchableOpacity
            key={year}
            style={[
              styles.yearChip,
              selectedYear === String(year) && styles.yearChipActive,
            ]}
            onPress={() => onSelectYear(String(year))}
          >
            <Text
              style={[
                styles.yearChipText,
                selectedYear === String(year) && styles.yearChipTextActive,
              ]}
            >
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// AttendanceCard Component
const AttendanceCard: React.FC<{ record: AttendanceRecord }> = ({ record }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.attendanceCard}>
      <View style={styles.attendanceCardLeft}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateDay}>{new Date(record.attendance_date).getDate()}</Text>
          <Text style={styles.dateMonth}>
            {new Date(record.attendance_date).toLocaleDateString('en-US', { month: 'short' })}
          </Text>
        </View>
      </View>
      <View style={styles.attendanceCardMiddle}>
        <Text style={styles.attendanceClass}>
          {record.class_name || 'Class'} - {record.section_name || 'Section'}
        </Text>
        <Text style={styles.attendanceDate}>{formatDate(record.attendance_date)}</Text>
        {record.marked_by && (
          <View style={styles.markedByContainer}>
            <Icon name="user" size={12} color="#94a3b8" />
            <Text style={styles.markedByText}>by {record.marked_by}</Text>
          </View>
        )}
      </View>
      <View style={styles.attendanceCardRight}>
        <StatusBadge status={record.status || ''} />
      </View>
    </View>
  );
};

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

  const calculateAttendanceTrend = () => {
    // Calculate trend based on previous month's attendance
    const currentPercentage = summary.attendance_percentage;
    // This would normally come from API, using mock for now
    return currentPercentage > 75 ? 5 : -3;
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={["#3b82f6"]} />
        }
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#3b82f6', '#2563eb', '#1d4ed8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerContent}>
            <View style={styles.welcomeSection}>
              <View>
                <Text style={styles.welcomeGreeting}>Good {getGreeting()}! 👋</Text>
                <Text style={styles.welcomeTitle}>{userName?.split(' ')[0] || 'Student'}</Text>
                <Text style={styles.welcomeSub}>Track your attendance and academic progress</Text>
              </View>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {userName?.charAt(0) || 'S'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <Text style={styles.sectionTitle}>Attendance Overview</Text>
            <TouchableOpacity onPress={() => fetchAttendance()} style={styles.refreshIconBtn}>
              <Icon name="refresh-cw" size={18} color="#3b82f6" />
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <StatCard 
              label="Total Days" 
              value={summary.total_days} 
            />
            <StatCard 
              label="Present" 
              value={summary.present_days}
              trend={5}
            />
            <StatCard 
              label="Half Day" 
              value={summary.half_day_count || summary.late_days || 0} 
            />
            <StatCard 
              label="Absent" 
              value={summary.absent_days}
              trend={-2}
            />
            <View style={[styles.statCard, styles.statCardHighlight]}>
              <Text style={styles.statLabel}>Attendance %</Text>
              <Text style={[styles.statValue, styles.statValueHighlight]}>
                {summary.attendance_percentage}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${summary.attendance_percentage}%` }
                  ]} 
                />
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Filters Section */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>Filter Records</Text>
          <View style={styles.filtersCard}>
            <MonthPicker selectedMonth={month} onSelectMonth={setMonth} />
            <YearPicker selectedYear={year} onSelectYear={setYear} />
            
            <TouchableOpacity style={styles.applyButton} onPress={() => fetchAttendance()}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.applyButtonGradient}
              >
                <Icon name="filter" size={18} color="#fff" />
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Records Section */}
        <View style={styles.recordsSection}>
          <View style={styles.recordsHeader}>
            <Text style={styles.sectionTitle}>Attendance Records</Text>
            <Text style={styles.recordCount}>{items.length} records</Text>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loaderText}>Loading attendance records...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="calendar" size={48} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptyText}>
                No attendance records available for the selected filters
              </Text>
            </View>
          ) : (
            items.map((record, index) => (
              <AttendanceCard key={record.attendance_id || index} record={record} />
            ))
          )}
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <View style={styles.footerCard}>
            <View style={styles.footerItem}>
              <Icon name="user" size={14} color="#94a3b8" />
              <Text style={styles.footerText}>ID: {studentId || '—'}</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <Icon name="home" size={14} color="#94a3b8" />
              <Text style={styles.footerText}>School: {schoolCode || '—'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  gradientHeader: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#bfdbfe',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 13,
    color: '#bfdbfe',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  statsSection: {
    marginTop: -20,
    paddingHorizontal: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsScroll: {
    flexDirection: 'row',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: width * 0.28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardHighlight: {
    minWidth: width * 0.32,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  statValueHighlight: {
    color: '#2563eb',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  filtersSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  filtersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  monthScroll: {
    flexDirection: 'row',
  },
  monthChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  monthChipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  monthChipTextActive: {
    color: '#ffffff',
  },
  yearScroll: {
    flexDirection: 'row',
  },
  yearChip: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  yearChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  yearChipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  yearChipTextActive: {
    color: '#ffffff',
  },
  applyButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  recordsSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordCount: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  attendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  attendanceCardLeft: {
    marginRight: 16,
  },
  dateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  attendanceCardMiddle: {
    flex: 1,
  },
  attendanceClass: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  attendanceDate: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  markedByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markedByText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  attendanceCardRight: {
    marginLeft: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  badgeIcon: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgePresent: {
    backgroundColor: '#dcfce7',
  },
  badgeTextPresent: {
    color: '#15803d',
  },
  badgeLate: {
    backgroundColor: '#fef3c7',
  },
  badgeTextLate: {
    color: '#b45309',
  },
  badgeHalfDay: {
    backgroundColor: '#fef3c7',
  },
  badgeTextHalfDay: {
    color: '#b45309',
  },
  badgeAbsent: {
    backgroundColor: '#fee2e2',
  },
  badgeTextAbsent: {
    color: '#b91c1c',
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#ffffff',
    borderRadius: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  footerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
});