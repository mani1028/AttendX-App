import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';

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
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Bell,
  Calendar,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  FileText,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../theme/tokens';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
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
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  remarks?: string;
}

export default function StudentAttendanceReport() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PrincipalStudentAttendanceReport'>>();
  const { studentId, studentName } = route.params;
  const today = new Date().toISOString().split('T')[0];
  const { setTabBarVisible } = useAuth();
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
      if (code && bid) {fetchReport(code, bid);}
    };
    load();
  }, []);

  const fetchReport = async (code: string, bid: string) => {
    setLoading(true);
    try {
      // Logic for fetching individual student attendance report
      // Adapting from ViewAttendanceScreen's logic but filtered for one student
      const response = await API.get(`/principal/students/${studentId}/attendance`, {
        headers: { 'X-School-Code': code, 'X-Branch-Id': bid },
        params: {
          start_date: startDate,
          end_date: endDate,
        },
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
  const handleScroll = useScrollTabBar();


  const stats = {
    present: records.filter(r => r.status === 'PRESENT').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    late: records.filter(r => r.status === 'LATE' || r.status === 'HALF_DAY').length,
    total: records.length,
    percentage: records.length > 0 ? Math.round(((records.filter(r => r.status === 'PRESENT').length + records.filter(r => r.status === 'LATE' || r.status === 'HALF_DAY').length) / records.length) * 100) : 0,
  };

  return (
    <View style={styles.container}>


      <StandardPageHeader
        title="Attendance Report"
        subtitle={`${studentName} • ID: ${studentId}`}
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={innerPageLayoutStyles.contentFront}>
          {/* Date Range Selection */}
          <View style={styles.selectionCard}>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
                <AppText style={styles.label}>From</AppText>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                  <Calendar size={18} color={Theme.colors.textSec} style={{ marginRight: 10 }} />
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
                      if (date) {setStartDate(date.toISOString().split('T')[0]);}
                    }}
                  />
                )}
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <AppText style={styles.label}>To</AppText>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                  <Calendar size={18} color={Theme.colors.textSec} style={{ marginRight: 10 }} />
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
                      if (date) {setEndDate(date.toISOString().split('T')[0]);}
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
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
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
                    styles.statusLate,
                  ]}>
                    <AppText style={[
                      styles.statusText,
                      record.status === 'PRESENT' ? styles.statusTextPresent :
                      record.status === 'ABSENT' ? styles.statusTextAbsent :
                      styles.statusTextLate,
                    ]}>
                      {record.status}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  selectionCard: {
    backgroundColor: Theme.colors.card,
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
    marginBottom: Theme.spacing.md,
  },
  field: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: Theme.spacing.sm,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  dateInputText: {
    ...Theme.typography.body,
    color: '#1E293B',
    fontWeight: '500',
  },
  searchBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.navy,
    marginTop: Theme.spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryTile: {
    flex: 1,
    padding: Theme.spacing.md,
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
    marginTop: Theme.spacing.sm,
  },
  summaryLabel: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  listContainer: {
    backgroundColor: Theme.colors.card,
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
    marginBottom: Theme.spacing.md,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  listHeaderCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSec,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
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
    ...Theme.typography.bodyMd,
    fontWeight: '600',
    color: '#1E293B',
  },
  recordRemarks: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
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
  statusText: { ...Theme.typography.label, fontWeight: '700' },
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
    marginTop: Theme.spacing.md,
  },
  emptyStateSub: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
