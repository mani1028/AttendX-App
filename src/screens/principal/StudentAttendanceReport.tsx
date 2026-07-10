import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import Loader from '../../components/common/Loader';
import { attendanceStatusLabel } from '../../utils/helpers';

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  FileText,
  User,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AppButton from '../../components/common/AppButton';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import type { RootStackParamList } from '../../navigation/types';
import {
  getPrincipalStudentAttendance,
  type PrincipalStudentAttendanceRecord,
} from '../../services/principalService';

const fmtDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateString;
  }
};

export default function StudentAttendanceReport() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PrincipalStudentAttendanceReport'>>();
  const {
    studentId,
    studentName,
    rollNumber,
    classGrade,
    section,
  } = route.params;
  const studentRef = rollNumber || studentId;
  const today = new Date().toISOString().split('T')[0];
  const { setTabBarVisible } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<PrincipalStudentAttendanceRecord[]>([]);
  const [error, setError] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(today);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const buildHeaders = useCallback((code: string, bid: string) => ({
    'X-School-Code': code,
    'x-school-code': code,
    'X-Branch-Id': bid,
    'x-branch-id': bid,
  }), []);

  const fetchReport = useCallback(async (code: string, bid: string) => {
    if (!code || !bid || !studentRef) {
      setError('Missing school context or student ID.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const rows = await getPrincipalStudentAttendance(studentRef, buildHeaders(code, bid), {
        start_date: startDate,
        end_date: endDate,
        class_grade: classGrade,
        section,
      });
      setRecords(rows);
      if (!rows.length) {
        setError('No attendance records found for the selected period.');
      }
    } catch (err: any) {
      setRecords([]);
      setError(err?.response?.data?.detail || err?.message || 'Failed to load attendance report.');
    } finally {
      setLoading(false);
    }
  }, [buildHeaders, classGrade, endDate, section, startDate, studentRef]);

  useEffect(() => {
    const load = async () => {
      const code = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode') || '';
      const bid = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId') || '';
      setSchoolCode(code);
      setBranchId(bid);
    };
    load();
  }, []);

  useEffect(() => {
    if (!schoolCode || !branchId) { return; }
    fetchReport(schoolCode, branchId);
  }, [schoolCode, branchId, studentRef]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReport(schoolCode, branchId);
    setRefreshing(false);
  }, [branchId, fetchReport, schoolCode]);

  const handleScroll = useScrollTabBar();

  const stats = {
    present: records.filter((r) => r.status === 'PRESENT').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
    total: records.length,
    percentage: records.length > 0
      ? Math.round(
        ((records.filter((r) => r.status === 'PRESENT').length
          + records.filter((r) => r.status === 'HALF_DAY').length * 0.5)
          / records.length) * 100,
      )
      : 0,
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Attendance Report"
          subtitle={`${studentName || 'Student'}${studentRef ? ` • ID: ${studentRef}` : ''}`}
          onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          rightActions={studentRef ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.profileBtn}
              onPress={() => (navigation as any).navigate('Student360', { studentId: studentRef, studentName })}
            >
              <User size={18} color={Theme.colors.card} />
            </TouchableOpacity>
          ) : undefined}
        />

        <View style={innerPageLayoutStyles.contentFront}>
          {(classGrade && section) ? (
            <View style={styles.contextBanner}>
              <AppText style={styles.contextBannerText}>
                Class {classGrade} · Section {section}
              </AppText>
            </View>
          ) : null}

          <View style={styles.selectionCard}>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
                <AppText style={styles.label}>From</AppText>
                <TouchableOpacity accessibilityRole="button" style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                  <Calendar size={18} color={Theme.colors.textSec} style={{ marginRight: 10 }} />
                  <AppText style={styles.dateInputText}>{fmtDate(startDate)}</AppText>
                </TouchableOpacity>
                {showStartPicker ? (
                  <DateTimePicker
                    value={new Date(startDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date(endDate)}
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') { setShowStartPicker(false); }
                      if (event.type === 'dismissed') {
                        setShowStartPicker(false);
                        return;
                      }
                      if (date) { setStartDate(date.toISOString().split('T')[0]); }
                    }}
                  />
                ) : null}
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <AppText style={styles.label}>To</AppText>
                <TouchableOpacity accessibilityRole="button" style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                  <Calendar size={18} color={Theme.colors.textSec} style={{ marginRight: 10 }} />
                  <AppText style={styles.dateInputText}>{fmtDate(endDate)}</AppText>
                </TouchableOpacity>
                {showEndPicker ? (
                  <DateTimePicker
                    value={new Date(endDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date(startDate)}
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') { setShowEndPicker(false); }
                      if (event.type === 'dismissed') {
                        setShowEndPicker(false);
                        return;
                      }
                      if (date) { setEndDate(date.toISOString().split('T')[0]); }
                    }}
                  />
                ) : null}
              </View>
            </View>

            <AppButton
              title={loading ? 'Loading...' : 'Filter Report'}
              onPress={() => fetchReport(schoolCode, branchId)}
              disabled={loading}
              style={styles.searchBtn}
            />
          </View>

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

          {error && !loading ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.errorText}>{error}</AppText>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingBox}>
              <Loader size="lg" label="Loading report…" />
            </View>
          ) : records.length === 0 ? (
            <View style={styles.emptyState}>
              <Filter size={48} color="#CBD5E1" />
              <AppText style={styles.emptyStateTitle}>No Records Found</AppText>
              <AppText style={styles.emptyStateSub}>
                {error || 'No attendance data for the selected period.'}
              </AppText>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <AppText style={styles.listHeaderText}>Daily Logs</AppText>
                <AppText style={styles.listHeaderCount}>{records.length} Days</AppText>
              </View>
              {records.map((record) => (
                <View key={record.date} style={styles.recordItem}>
                  <View style={styles.recordInfo}>
                    <View style={[
                      styles.recordIcon,
                      {
                        backgroundColor: record.status === 'PRESENT'
                          ? C.successSoft
                          : record.status === 'ABSENT'
                            ? C.errorSoft
                            : C.warningSoft,
                      },
                    ]}>
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
                      {record.remarks ? <AppText style={styles.recordRemarks}>{record.remarks}</AppText> : null}
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
                      {attendanceStatusLabel(record.status)}
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
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  contextBanner: {
    backgroundColor: C.primarySoft,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  contextBannerText: {
    ...Theme.typography.caption,
    color: C.primary,
    fontWeight: '600',
  },
  selectionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
    marginTop: 0,
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
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
  },
  dateInputText: {
    ...Theme.typography.body,
    color: '#1E293B',
    fontWeight: '500',
  },
  searchBtn: {
    height: 52,
    borderRadius: Theme.radius.md,
    backgroundColor: C.navy,
    marginTop: Theme.spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  summaryTile: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.xxl,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  summaryValue: {
    fontSize: Theme.typography.h2.fontSize,
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
  errorBanner: {
    backgroundColor: C.errorSoft,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: C.error,
  },
  errorText: {
    color: C.error,
    ...Theme.typography.caption,
    fontWeight: '600',
  },
  listContainer: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.xl,
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
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '800',
    color: '#1E293B',
  },
  listHeaderCount: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: Theme.colors.textSec,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
  },
  loadingBox: {
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
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
    borderRadius: Theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
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
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.radius.md,
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
    fontSize: Theme.typography.h3.fontSize,
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
