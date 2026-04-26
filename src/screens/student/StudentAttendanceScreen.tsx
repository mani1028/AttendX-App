import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { ChevronLeft, Calendar, Filter, User, School, CheckCircle2, XCircle, Clock, MinusCircle, Bell } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getStudentAttendance } from '../../services/studentService';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import { colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

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

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toUpperCase() || '';
  if (s === 'PRESENT') {
    return (
      <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
        <CheckCircle2 size={12} color="#15803d" />
        <AppText style={[styles.badgeText, { color: '#15803d' }]}>PRESENT</AppText>
      </View>
    );
  }
  if (s === 'LATE' || s === 'HALF_DAY') {
    return (
      <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
        <Clock size={12} color="#b45309" />
        <AppText style={[styles.badgeText, { color: '#b45309' }]}>{s === 'LATE' ? 'LATE' : 'HALF DAY'}</AppText>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
      <XCircle size={12} color="#b91c1c" />
      <AppText style={[styles.badgeText, { color: '#b91c1c' }]}>ABSENT</AppText>
    </View>
  );
};

const StatCard = ({ label, value, color = colors.textPrimary }: { label: string; value: string | number; color?: string }) => (
  <View style={styles.statCard}>
    <AppText style={styles.statLabel}>{label}</AppText>
    <AppText style={[styles.statValue, { color }]}>{value}</AppText>
  </View>
);

export default function StudentAttendanceScreen() {
  const navigation = useNavigation();
  const { userName, setTabBarVisible } = useAuth();

  const lastScrollY = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [items, setItems] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total_days: 0,
    present_days: 0,
    half_day_count: 0,
    absent_days: 0,
    late_days: 0,
    attendance_percentage: 0,
  });

  const months = [
    { label: 'All Months', value: '' },
    { label: 'January', value: '1' },
    { label: 'February', value: '2' },
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'June', value: '6' },
    { label: 'July', value: '7' },
    { label: 'August', value: '8' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => ({
    label: String(currentYear - i),
    value: String(currentYear - i),
  }));

  const fetchAttendance = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params: any = {};
      if (month) params.month = month;
      if (year) params.year = year;

      const res = await getStudentAttendance(params);
      setItems(res.items || []);
      setSummary({
        total_days: res.presentDays + res.absentDays,
        present_days: res.presentDays,
        half_day_count: 0, // Fallback as service doesn't specifically extract half_days yet
        absent_days: res.absentDays,
        late_days: 0,
        attendance_percentage: res.percentage,
      });
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [month, year]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <AppText style={styles.headerTitle}>Attendance</AppText>
        </View>
        <TouchableOpacity
          style={styles.notificationIcon}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Bell size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.mainCard}>
          <View style={styles.statsScroll}>
            <StatCard label="Total" value={summary.total_days} />
            <StatCard label="Present" value={summary.present_days} color="#15803d" />
            <StatCard label="Absent" value={summary.absent_days} color="#b91c1c" />
            <StatCard label="Half Day" value={summary.half_day_count || 0} color="#b45309" />
          </View>

          <View style={styles.attendancePctCard}>
            <View>
              <AppText style={styles.pctLabel}>Overall Attendance</AppText>
              <AppText style={styles.pctValue}>{summary.attendance_percentage}%</AppText>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${summary.attendance_percentage}%` }]} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.filterSection}>
          <AppText style={styles.sectionTitle}>Filter by Date</AppText>
          <View style={styles.pickerRow}>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={month}
                onValueChange={(val) => setMonth(val)}
                style={styles.picker}
                mode="dropdown"
              >
                {months.map((m) => (
                  <Picker.Item key={m.value} label={m.label} value={m.value} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={year}
                onValueChange={(val) => setYear(val)}
                style={styles.picker}
                mode="dropdown"
              >
                {years.map((y) => (
                  <Picker.Item key={y.value} label={y.label} value={y.value} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.recordsSection}>
          <View style={styles.recordsHeader}>
            <AppText style={styles.sectionTitle}>Attendance Records</AppText>
            <AppText style={styles.recordCount}>{items.length} Records</AppText>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={48} color="#cbd5e1" />
              <AppText style={styles.emptyText}>No records found for this period</AppText>
            </View>
          ) : (
            items.map((record, index) => (
              <AppCard key={record.attendance_id || index} style={styles.recordCard}>
                <View style={styles.recordDateBox}>
                  <View style={styles.dateHeader}>
                    <AppText style={styles.dateMonth}>
                      {new Date(record.attendance_date).toLocaleDateString('en-US', { month: 'short' })}
                    </AppText>
                  </View>
                  <View style={styles.dateBody}>
                    <AppText style={styles.dateDay}>{new Date(record.attendance_date).getDate()}</AppText>
                  </View>
                </View>
                <View style={styles.recordInfo}>
                  <AppText style={styles.recordTitle}>
                    {record.class_name && record.class_name.length <= 2 ? `Class ${record.class_name}` : (record.class_name || 'Class Attendance')}
                  </AppText>
                  <AppText style={styles.recordSub}>
                    {new Date(record.attendance_date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </AppText>
                </View>
                <StatusBadge status={record.status} />
              </AppCard>
            ))
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#001F3F',
    height: Platform.OS === 'ios' ? 70 : 55,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 35 : 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statsScroll: {
    flexDirection: 'row',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    flex: 1,
    marginRight: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  attendancePctCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  pctLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pctValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  progressContainer: {
    flex: 1,
    marginLeft: 15,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  filterSection: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    height: 44,
    justifyContent: 'center',
  },
  picker: {
    height: 44,
    width: '100%',
  },
  recordsSection: {
    marginTop: 10,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  recordDateBox: {
    width: 52,
    height: 58,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateHeader: {
    backgroundColor: '#001F3F',
    width: '100%',
    paddingVertical: 3,
    alignItems: 'center',
  },
  dateBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  dateMonth: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  recordSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});
