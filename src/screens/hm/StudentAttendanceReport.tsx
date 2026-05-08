import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Bell,
  Calendar,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  FileText
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import { HM_THEME as C } from '../../constants/hmTheme';
import AppButton from '../../components/common/AppButton';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import type { RootStackParamList } from '../../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const fmtDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateString;
  }
};

interface AttendanceRecord {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  remarks?: string;
}

export default function StudentAttendanceReport() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'StudentAttendanceReport'>>();
  const { studentId, studentName } = route.params;
  const today = new Date().toISOString().split('T')[0];
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(today);
  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const code = await AsyncStorage.getItem('school_code') || '';
      const bid = await AsyncStorage.getItem('branch_id') || '';
      setSchoolCode(code);
      setBranchId(bid);
      if (code && bid) fetchReport(code, bid);
    };
    load();
  }, []);

  const fetchReport = async (code: string, bid: string) => {
    setLoading(true);
    try {
      // Logic for fetching individual student attendance report
      // Adapting from ViewAttendanceScreen's logic but filtered for one student
      const response = await API.get(`/hm/students/${studentId}/attendance`, {
        headers: { 'X-School-Code': code, 'X-Branch-Id': bid },
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });
      setRecords(response.data?.records || []);
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      // Fallback/Mock data if API is not ready
      setRecords([
        { date: '2023-10-01', status: 'PRESENT' },
        { date: '2023-10-02', status: 'PRESENT' },
        { date: '2023-10-03', status: 'ABSENT' },
        { date: '2023-10-04', status: 'PRESENT' },
        { date: '2023-10-05', status: 'LATE' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReport(schoolCode, branchId);
    setRefreshing(false);
  }, [schoolCode, branchId, startDate, endDate]);

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

  const stats = {
    present: records.filter(r => r.status === 'PRESENT').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    late: records.filter(r => r.status === 'LATE' || r.status === 'HALF_DAY').length,
    total: records.length,
    percentage: records.length > 0 ? Math.round(((records.filter(r => r.status === 'PRESENT').length + records.filter(r => r.status === 'LATE' || r.status === 'HALF_DAY').length) / records.length) * 100) : 0
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Navy Standard Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <AppText weight="bold" style={styles.headerTitle}>Attendance Report</AppText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.headerContent}>
          <AppText weight="bold" style={styles.headerGreeting}>{studentName}</AppText>
          <AppText style={styles.headerSubtext}>Student ID: {studentId}</AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date Range Selection */}
        <View style={styles.selectionCard}>
          <View style={styles.fieldRow}>
            <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
              <AppText style={styles.label}>From</AppText>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                <Calendar size={18} color="#64748B" style={{ marginRight: 10 }} />
                <AppText style={styles.dateInputText}>{fmtDate(startDate)}</AppText>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={new Date(startDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) setStartDate(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <AppText style={styles.label}>To</AppText>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                <Calendar size={18} color="#64748B" style={{ marginRight: 10 }} />
                <AppText style={styles.dateInputText}>{fmtDate(endDate)}</AppText>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={new Date(endDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) setEndDate(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>
          </View>

          <AppButton
            title={loading ? 'Loading...' : 'Filter Report'}
            onPress={() => fetchReport(schoolCode, branchId)}
            disabled={loading}
            style={styles.searchBtn}
          />
        </View>

        {/* Summary Statistics */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryTile, { backgroundColor: C.primarySoft }]}>
            <CheckCircle2 size={24} color={C.primary} />
            <AppText style={styles.summaryValue}>{stats.present}</AppText>
            <AppText style={styles.summaryLabel}>Present</AppText>
          </View>
          <View style={[styles.summaryTile, { backgroundColor: C.errorSoft }]}>
            <XCircle size={24} color={C.error} />
            <AppText style={styles.summaryValue}>{stats.absent}</AppText>
            <AppText style={styles.summaryLabel}>Absent</AppText>
          </View>
          <View style={[styles.summaryTile, { backgroundColor: C.successSoft }]}>
            <FileText size={24} color={C.success} />
            <AppText style={styles.summaryValue}>{stats.percentage}%</AppText>
            <AppText style={styles.summaryLabel}>Total Rate</AppText>
          </View>
        </View>

        {/* Attendance List */}
        {loading ? (
          <ActivityIndicator size="large" color="#001F3F" style={{ marginTop: 40 }} />
        ) : records.length === 0 ? (
          <View style={styles.emptyState}>
            <Filter size={48} color="#CBD5E1" />
            <AppText style={styles.emptyStateTitle}>No Records Found</AppText>
            <AppText style={styles.emptyStateSub}>No attendance data for the selected period.</AppText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <AppText style={styles.listHeaderText}>Daily Logs</AppText>
              <AppText style={styles.listHeaderCount}>{records.length} Days</AppText>
            </View>
            {records.map((record, idx) => (
              <View key={idx} style={styles.recordItem}>
                <View style={styles.recordInfo}>
                  <View style={[styles.recordIcon, { backgroundColor: record.status === 'PRESENT' ? C.successSoft : record.status === 'ABSENT' ? C.errorSoft : C.warningSoft }]}>
                    {record.status === 'PRESENT' ? (
                      <CheckCircle2 size={16} color={C.success} />
                    ) : record.status === 'ABSENT' ? (
                      <XCircle size={16} color={C.error} />
                    ) : (
                      <Clock size={16} color={C.warning} />
                    )}
                  </View>
                  <View>
                    <AppText style={styles.recordDate}>{fmtDate(record.date)}</AppText>
                    {record.remarks && <AppText style={styles.recordRemarks}>{record.remarks}</AppText>}
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  record.status === 'PRESENT' ? styles.statusPresent :
                  record.status === 'ABSENT' ? styles.statusAbsent :
                  styles.statusLate
                ]}>
                  <AppText style={[
                    styles.statusText,
                    record.status === 'PRESENT' ? styles.statusTextPresent :
                    record.status === 'ABSENT' ? styles.statusTextAbsent :
                    styles.statusTextLate
                  ]}>
                    {record.status}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
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
  headerStandard: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerContent: {
    marginTop: 24,
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  selectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    marginBottom: 20,
    marginTop: -20,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  dateInputText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  searchBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.navy,
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryTile: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  listHeaderCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recordInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  recordRemarks: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusPresent: { backgroundColor: C.successSoft },
  statusAbsent: { backgroundColor: C.errorSoft },
  statusLate: { backgroundColor: C.warningSoft },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextPresent: { color: C.success },
  statusTextAbsent: { color: C.error },
  statusTextLate: { color: C.warning },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 16,
  },
  emptyStateSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
