import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react-native';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { getTeacherMyAttendance } from '../../services/teacherService';
import { getAttendanceDisplayStatus, getSessionDisplayStatus } from '../../utils/attendanceDisplayHelper';
import { resolveApiErrorMessage } from '../../utils/helpers';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { Theme, C } from '../../theme/tokens';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'NO_RECORD';

interface AttendanceDay {
  date: string;
  status: AttendanceStatus;
  session1_status?: string;
  session2_status?: string;
  dailySessions: number;
}

interface MonthlyStats {
  total: number;
  present: number;
  halfDay: number;
  absent: number;
  leave: number;
  percentage: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  PRESENT: { bg: C.colors.successBg, text: C.colors.success },
  ABSENT: { bg: C.colors.errorBg, text: C.colors.error },
  HALF_DAY: { bg: C.colors.warningBg, text: C.colors.warning },
  LEAVE: { bg: C.colors.blueLight, text: C.colors.blue },
  HOLIDAY: { bg: C.colors.backgroundAlt, text: C.colors.textMuted },
  NO_RECORD: { bg: 'transparent', text: C.colors.textMuted },
};

function normalizeDayRecord(item: any): AttendanceDay | null {
  const date = String(item?.date || item?.attendance_date || '').trim();
  if (!date) {
    return null;
  }

  const dailySessions =
    Number(item?.dailySessions ?? item?.sessions_per_day ?? item?.daily_sessions) ||
    (item?.session2_status ? 2 : 1);

  const display = getAttendanceDisplayStatus(item, dailySessions);
  let status: AttendanceStatus = 'NO_RECORD';

  switch (display.status) {
    case 'PRESENT':
      status = 'PRESENT';
      break;
    case 'ABSENT':
      status = 'ABSENT';
      break;
    case 'HALF_DAY':
      status = 'HALF_DAY';
      break;
    default:
      if (String(item?.status || '').toUpperCase() === 'LEAVE') {
        status = 'LEAVE';
      } else if (String(item?.status || '').toUpperCase() === 'HOLIDAY') {
        status = 'HOLIDAY';
      }
      break;
  }

  return {
    date,
    status,
    session1_status: item?.session1_status,
    session2_status: item?.session2_status,
    dailySessions,
  };
}

function filterByMonth(records: AttendanceDay[], month: Date): AttendanceDay[] {
  const monthStr = String(month.getMonth() + 1).padStart(2, '0');
  const yearStr = String(month.getFullYear());
  const prefix = `${yearStr}-${monthStr}`;
  return records.filter(r => r.date.startsWith(prefix));
}

function calculateStats(data: AttendanceDay[]): MonthlyStats {
  const stats = data.reduce(
    (acc, curr) => {
      if (curr.status === 'PRESENT') {
        acc.present++;
      } else if (curr.status === 'HALF_DAY') {
        acc.halfDay++;
      } else if (curr.status === 'ABSENT') {
        acc.absent++;
      } else if (curr.status === 'LEAVE') {
        acc.leave++;
      }
      return acc;
    },
    { present: 0, halfDay: 0, absent: 0, leave: 0 },
  );

  const total = stats.present + stats.halfDay + stats.absent + stats.leave;
  const effectivePresent = stats.present + stats.halfDay * 0.5;
  const percentage = total > 0 ? ((effectivePresent / total) * 100).toFixed(1) : '0';

  return { total, ...stats, percentage };
}

export default function TeacherMyAttendanceScreen() {
  const navigation = useNavigation<any>();
  const canGoBack = navigation.canGoBack();
  const isMounted = useRef(true);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState<MonthlyStats>({
    total: 0,
    present: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    percentage: '0',
  });

  const loadAttendance = useCallback(async (month: Date, showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const schoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const employeeId =
        (await AsyncStorage.getItem('teacher_id')) ||
        (await AsyncStorage.getItem('teacherId')) ||
        (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
        '';

      if (!schoolCode || !employeeId) {
        if (!isMounted.current) {
          return;
        }
        setAttendance([]);
        setStats({ total: 0, present: 0, halfDay: 0, absent: 0, leave: 0, percentage: '0' });
        setLoadError('Could not identify your account. Please log in again.');
        return;
      }

      const monthStr = String(month.getMonth() + 1).padStart(2, '0');
      const yearStr = String(month.getFullYear());

      const raw = await getTeacherMyAttendance({
        school_code: schoolCode,
        employee_id: employeeId,
        month: monthStr,
        year: yearStr,
      });

      if (!isMounted.current) {
        return;
      }

      const normalized = raw
        .map(normalizeDayRecord)
        .filter((item): item is AttendanceDay => item !== null);

      const monthData = filterByMonth(normalized, month);
      setAttendance(monthData);
      setStats(calculateStats(monthData));
    } catch (error) {
      console.error('Failed to load teacher attendance:', error);
      if (!isMounted.current) {
        return;
      }
      setAttendance([]);
      setStats({ total: 0, present: 0, halfDay: 0, absent: 0, leave: 0, percentage: '0' });
      setLoadError(
        resolveApiErrorMessage(error, 'Could not load your attendance. Pull down to retry.'),
      );
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadAttendance(currentMonth);
    return () => {
      isMounted.current = false;
    };
  }, [currentMonth, loadAttendance]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const shiftMonth = (delta: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const markedDates = useMemo(() => {
    const marked: Record<string, any> = {};

    attendance.forEach(item => {
      const colors = statusColors[item.status] || statusColors.NO_RECORD;
      marked[item.date] = {
        customStyles: {
          container: {
            backgroundColor: colors.bg,
            borderRadius: 10,
            justifyContent: 'center',
            alignItems: 'center',
          },
          text: {
            color: colors.text,
            fontWeight: '600',
          },
        },
      };
    });

    marked[selectedDate] = {
      ...marked[selectedDate],
      customStyles: {
        container: {
          backgroundColor: C.colors.primary,
          borderRadius: 10,
          elevation: 3,
          shadowColor: C.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          justifyContent: 'center',
          alignItems: 'center',
        },
        text: {
          color: Theme.colors.card,
          fontWeight: 'bold',
        },
      },
    };

    return marked;
  }, [attendance, selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendance(currentMonth, false);
  };

  const handleMonthChange = (monthData: { year: number; month: number }) => {
    setCurrentMonth(new Date(monthData.year, monthData.month - 1, 1));
  };

  const selectedRecord = attendance.find(a => a.date === selectedDate);
  const selectedStatus = selectedRecord?.status || 'NO_RECORD';

  const sessionInfo = selectedRecord
    ? getSessionDisplayStatus(selectedRecord as unknown as Record<string, unknown>, selectedRecord.dailySessions)
    : null;

  const recentActivity = useMemo(
    () =>
      [...attendance]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [attendance],
  );

  const headerSubtitle = loading
    ? 'Loading attendance...'
    : loadError
      ? 'Unable to load data'
      : monthLabel;

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.colors.primary} />
        }
      >
        <StandardPageHeader
          title="My Attendance"
          subtitle={headerSubtitle}
          onBackPress={canGoBack ? () => navigation.goBack() : () => navigation.navigate('TeacherDashboard')}
          showBack={canGoBack}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={onRefresh}
              accessibilityLabel="Refresh attendance"
            >
              <RefreshCw size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />
        <View style={[innerPageLayoutStyles.scrollBody, styles.pageBody]}>
          {loadError ? (
            <AppCard style={styles.errorCard}>
              <AlertCircle size={32} color={Theme.colors.error} />
              <AppText weight="semibold" style={styles.errorTitle}>Could not load attendance</AppText>
              <AppText style={styles.errorText}>{loadError}</AppText>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadAttendance(currentMonth)}>
                <AppText weight="semibold" style={styles.retryBtnText}>Try again</AppText>
              </TouchableOpacity>
            </AppCard>
          ) : (
            <>
              <View style={styles.monthNav}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.monthNavBtn}
                  onPress={() => shiftMonth(-1)}
                >
                  <ChevronLeft size={20} color={C.colors.primary} />
                </TouchableOpacity>
                <AppText weight="bold" style={styles.monthNavLabel}>{monthLabel}</AppText>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.monthNavBtn}
                  onPress={() => shiftMonth(1)}
                >
                  <ChevronRight size={20} color={C.colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.statsOverview}>
                <View style={styles.percentageCircle}>
                  <Text style={styles.percentageValue}>{stats.percentage}%</Text>
                  <Text style={styles.percentageLabel}>This month</Text>
                </View>
                <View style={styles.statsDivider} />
                <View style={styles.statsRight}>
                  <View style={styles.statRow}>
                    <View style={[styles.statDot, { backgroundColor: C.colors.success }]} />
                    <Text style={styles.statLabel}>Present:</Text>
                    <Text style={styles.statValue}>{stats.present}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <View style={[styles.statDot, { backgroundColor: C.colors.warning }]} />
                    <Text style={styles.statLabel}>Half day:</Text>
                    <Text style={styles.statValue}>{stats.halfDay}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <View style={[styles.statDot, { backgroundColor: C.colors.error }]} />
                    <Text style={styles.statLabel}>Absent:</Text>
                    <Text style={styles.statValue}>{stats.absent}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <View style={[styles.statDot, { backgroundColor: C.colors.blue }]} />
                    <Text style={styles.statLabel}>On leave:</Text>
                    <Text style={styles.statValue}>{stats.leave}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.calendarCard}>
                <Calendar
                  current={selectedDate}
                  onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
                  onMonthChange={handleMonthChange}
                  markingType="custom"
                  markedDates={markedDates}
                  enableSwipeMonths
                  hideExtraDays
                  theme={{
                    backgroundColor: C.colors.card,
                    calendarBackground: C.colors.card,
                    textSectionTitleColor: C.colors.textMuted,
                    selectedDayBackgroundColor: C.colors.primary,
                    selectedDayTextColor: C.colors.card,
                    todayTextColor: C.colors.primary,
                    dayTextColor: C.colors.text,
                    textDisabledColor: C.colors.border,
                    arrowColor: C.colors.primary,
                    monthTextColor: C.colors.text,
                    textDayFontWeight: '500',
                    textMonthFontWeight: '700',
                    textDayHeaderFontWeight: '600',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 12,
                    todayBackgroundColor: `${C.colors.primary}10`,
                  }}
                  style={styles.calendar}
                />
              </View>

              <View style={styles.detailsCard}>
                <View style={styles.detailsHeader}>
                  <Text style={styles.detailsTitle}>Daily Summary</Text>
                  <Text style={styles.detailsDate}>
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.statusBox}>
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusLabel}>Attendance Status</Text>
                    <Text
                      style={[
                        styles.statusValue,
                        { color: statusColors[selectedStatus]?.text || C.colors.textMuted },
                      ]}
                    >
                      {selectedStatus.replace('_', ' ')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: statusColors[selectedStatus]?.text || C.colors.textMuted },
                    ]}
                  />
                </View>

                {sessionInfo && selectedRecord && selectedRecord.dailySessions > 1 && (
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionChip}>
                      <Text style={styles.sessionLabel}>Session 1</Text>
                      <Text style={styles.sessionValue}>{sessionInfo.session1.label}</Text>
                    </View>
                    <View style={styles.sessionChip}>
                      <Text style={styles.sessionLabel}>Session 2</Text>
                      <Text style={styles.sessionValue}>{sessionInfo.session2.label}</Text>
                    </View>
                  </View>
                )}
              </View>

              {recentActivity.length > 0 && (
                <AppCard style={styles.recentCard}>
                  <AppText weight="bold" style={styles.recentTitle}>Recent Activity</AppText>
                  {recentActivity.map(item => {
                    const colors = statusColors[item.status] || statusColors.NO_RECORD;
                    return (
                      <View key={item.date} style={styles.recentRow}>
                        <View style={[styles.recentDot, { backgroundColor: colors.text }]} />
                        <AppText style={styles.recentDate}>
                          {new Date(item.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </AppText>
                        <AppText weight="semibold" style={styles.recentStatus}>
                          {item.status.replace('_', ' ')}
                        </AppText>
                      </View>
                    );
                  })}
                </AppCard>
              )}

              <View style={styles.legendCard}>
                <Text style={styles.legendTitle}>LEGEND</Text>
                <View style={styles.legendGrid}>
                  {[
                    { label: 'Present', bg: C.colors.successBg },
                    { label: 'Absent', bg: C.colors.errorBg },
                    { label: 'Half Day', bg: C.colors.warningBg },
                    { label: 'Leave', bg: C.colors.blueLight },
                    { label: 'Holiday', bg: C.colors.backgroundAlt },
                  ].map(item => (
                    <View key={item.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.bg }]} />
                      <Text style={styles.legendText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {loading && !refreshing && !loadError && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={C.colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  pageBody: {},
  errorCard: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  errorTitle: { color: Theme.colors.text, fontSize: 16, marginTop: 4 },
  errorText: { color: Theme.colors.textMuted, textAlign: 'center', ...Theme.typography.body },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
  },
  retryBtnText: { color: Theme.colors.card },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.colors.card,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 16,
    ...C.shadow.sm,
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavLabel: {
    fontSize: 16,
    color: C.colors.text,
  },
  statsOverview: {
    flexDirection: 'row',
    backgroundColor: C.colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    ...C.shadow.sm,
    marginBottom: 20,
  },
  percentageCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: C.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageValue: {
    ...Theme.typography.h3,
    color: C.colors.text,
  },
  percentageLabel: {
    fontSize: 10,
    color: C.colors.textMuted,
  },
  statsDivider: {
    width: 1,
    height: 60,
    backgroundColor: C.colors.border,
    marginHorizontal: 25,
  },
  statsRight: {
    flex: 1,
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Theme.spacing.sm,
  },
  statLabel: {
    fontSize: 13,
    color: C.colors.textMuted,
    flex: 1,
  },
  statValue: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: C.colors.text,
  },
  calendarCard: {
    backgroundColor: C.colors.card,
    borderRadius: 20,
    padding: 10,
    marginBottom: 20,
    ...C.shadow.sm,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 20,
    backgroundColor: C.colors.card,
  },
  detailsCard: {
    backgroundColor: C.colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...C.shadow.sm,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.border,
    paddingBottom: 10,
  },
  detailsTitle: {
    ...Theme.typography.h4,
    color: C.colors.text,
  },
  detailsDate: {
    fontSize: 13,
    color: C.colors.textMuted,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.colors.background,
    borderRadius: 12,
    padding: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: C.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sessionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  sessionChip: {
    flex: 1,
    backgroundColor: C.colors.background,
    borderRadius: 12,
    padding: 12,
  },
  sessionLabel: {
    fontSize: 11,
    color: C.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sessionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.colors.text,
  },
  recentCard: {
    padding: 20,
    marginBottom: 20,
  },
  recentTitle: {
    fontSize: 16,
    color: C.colors.text,
    marginBottom: Theme.spacing.md,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.border,
    gap: 12,
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentDate: {
    flex: 1,
    ...Theme.typography.body,
    color: C.colors.textSec,
  },
  recentStatus: {
    fontSize: 14,
    color: C.colors.text,
  },
  legendCard: {
    backgroundColor: C.colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...C.shadow.sm,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '30%',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: C.colors.textSec,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
