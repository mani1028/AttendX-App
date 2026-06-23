import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MOCK_ATTENDANCE: Record<string, 'present' | 'absent' | 'leave'> = {};
(() => {
  for (let i = 1; i <= 30; i++) {
    const key = `2026-06-${String(i).padStart(2, '0')}`;
    if (i === 5 || i === 12 || i === 19) MOCK_ATTENDANCE[key] = 'absent';
    else if (i === 8 || i === 22) MOCK_ATTENDANCE[key] = 'leave';
    else if (i <= 23) MOCK_ATTENDANCE[key] = 'present';
  }
})();

const MOCK_MONTHLY_STATS = {
  present: 18,
  absent: 3,
  leave: 2,
  totalDays: 23,
  percentage: 78.26,
};

export default function TeacherMyAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(5);
  const [currentYear, setCurrentYear] = useState(2026);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return Theme.colors.success;
      case 'absent': return Theme.colors.error;
      case 'leave': return Theme.colors.warning;
      default: return Theme.colors.border;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <AppText weight="bold" style={styles.headerTitle}>My Attendance</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <AppCard style={styles.monthNavCard}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
            <ChevronLeft size={20} color={Theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.monthInfo}>
            <AppText weight="bold" style={styles.monthTitle}>{MONTHS[currentMonth]}</AppText>
            <AppText style={styles.yearTitle}>{currentYear}</AppText>
          </View>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
            <ChevronRight size={20} color={Theme.colors.text} />
          </TouchableOpacity>
        </AppCard>

        <AppCard style={styles.calendarCard}>
          <View style={styles.daysHeader}>
            {DAYS.map((day) => (
              <AppText key={day} weight="semibold" style={styles.dayLabel}>{day}</AppText>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = MOCK_ATTENDANCE[dateKey];
              const isToday = isCurrentMonth && day === today.getDate();

              return (
                <View key={day} style={styles.dayCell}>
                  <View style={[
                    styles.dayCircle,
                    isToday && styles.todayCircle,
                    status && { backgroundColor: getStatusColor(status) },
                  ]}>
                    <AppText
                      weight={isToday ? 'bold' : 'regular'}
                      style={[styles.dayNumber, isToday && styles.todayText, status ? styles.statusText : undefined]}
                    >
                      {day}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        </AppCard>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.success }]} />
            <AppText style={styles.legendText}>Present</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.error }]} />
            <AppText style={styles.legendText}>Absent</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.warning }]} />
            <AppText style={styles.legendText}>Leave</AppText>
          </View>
        </View>

        <AppCard style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <CalendarCheck size={20} color={Theme.colors.primary} />
            <AppText weight="bold" style={styles.statsTitle}>Monthly Summary</AppText>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, { backgroundColor: '#f0fdf4' }]}>
              <CheckCircle size={20} color={Theme.colors.success} />
              <AppText weight="bold" style={styles.statValue}>{MOCK_MONTHLY_STATS.present}</AppText>
              <AppText style={styles.statLabel}>Present</AppText>
            </View>
            <View style={[styles.statItem, { backgroundColor: '#fef2f2' }]}>
              <XCircle size={20} color={Theme.colors.error} />
              <AppText weight="bold" style={styles.statValue}>{MOCK_MONTHLY_STATS.absent}</AppText>
              <AppText style={styles.statLabel}>Absent</AppText>
            </View>
            <View style={[styles.statItem, { backgroundColor: '#fff7ed' }]}>
              <Clock size={20} color={Theme.colors.warning} />
              <AppText weight="bold" style={styles.statValue}>{MOCK_MONTHLY_STATS.leave}</AppText>
              <AppText style={styles.statLabel}>Leave</AppText>
            </View>
          </View>
          <View style={styles.attendanceBar}>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { width: `${MOCK_MONTHLY_STATS.percentage}%`, backgroundColor: Theme.colors.primary }]} />
            </View>
            <AppText weight="bold" style={styles.barText}>{MOCK_MONTHLY_STATS.percentage}%</AppText>
          </View>
        </AppCard>

        <AppCard style={styles.detailCard}>
          <AppText weight="bold" style={styles.detailTitle}>Recent Activity</AppText>
          <View style={styles.detailRow}>
            <View style={[styles.detailDot, { backgroundColor: Theme.colors.success }]} />
            <AppText style={styles.detailDate}>23 Jun 2026</AppText>
            <AppText weight="semibold" style={styles.detailStatus}>Present</AppText>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.detailDot, { backgroundColor: Theme.colors.warning }]} />
            <AppText style={styles.detailDate}>22 Jun 2026</AppText>
            <AppText weight="semibold" style={styles.detailStatus}>Leave</AppText>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.detailDot, { backgroundColor: Theme.colors.success }]} />
            <AppText style={styles.detailDate}>21 Jun 2026</AppText>
            <AppText weight="semibold" style={styles.detailStatus}>Present</AppText>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.detailDot, { backgroundColor: Theme.colors.error }]} />
            <AppText style={styles.detailDate}>19 Jun 2026</AppText>
            <AppText weight="semibold" style={styles.detailStatus}>Absent</AppText>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.detailDot, { backgroundColor: Theme.colors.success }]} />
            <AppText style={styles.detailDate}>18 Jun 2026</AppText>
            <AppText weight="semibold" style={styles.detailStatus}>Present</AppText>
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadow.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: Theme.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  monthNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: Theme.spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthInfo: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  yearTitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  calendarCard: {
    padding: 16,
    marginBottom: Theme.spacing.md,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.sm,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: Theme.colors.primary,
  },
  dayNumber: {
    fontSize: 13,
    color: Theme.colors.text,
  },
  todayText: {
    color: Theme.colors.primary,
  },
  statusText: {
    color: '#ffffff',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: Theme.spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  statsCard: {
    padding: 20,
    marginBottom: Theme.spacing.md,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Theme.spacing.md,
  },
  statsTitle: {
    fontSize: 16,
    color: Theme.colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: Theme.radius.lg,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    color: Theme.colors.text,
  },
  statLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  attendanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barText: {
    fontSize: 14,
    color: Theme.colors.primary,
    minWidth: 48,
    textAlign: 'right',
  },
  detailCard: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 16,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    gap: 12,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailDate: {
    flex: 1,
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  detailStatus: {
    fontSize: 14,
    color: Theme.colors.text,
  },
});
