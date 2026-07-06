import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  DimensionValue,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import { Calendar as CalendarIcon, Users, User, UserPlus, Grid, TrendingUp, AlertCircle, ClipboardList, Megaphone, Settings, Eye, Scan, FileDown, GraduationCap } from 'lucide-react-native';
import API from '../../services/api';
import * as principalService from '../../services/principalService';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import type { RootStackParamList } from '../../navigation/types';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { safeNavigate } from '../../utils/navigationHelpers';
import DashboardHeroHeader from '../../components/dashboard/DashboardHeroHeader';
import QuickActionGrid, { QuickActionItem } from '../../components/dashboard/QuickActionGrid';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ClassData {
  class_id?: string;
  class_grade?: string;
  section?: string;
  label?: string;
  students_total?: number;
  present?: number;
  attendance_pct?: number;
}

interface StatsData {
  cards?: {
    total_teachers?: number;
    total_students?: number;
    total_classes?: number;
    today_attendance_pct?: number;
  };
  today_breakdown?: {
    date?: string;
    teachers?: {
      total?: number;
      present?: number;
      absent?: number;
      attendance_pct?: number;
    };
    students?: {
      total?: number;
      present?: number;
      absent?: number;
      attendance_pct?: number;
    };
  };
}

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});

const AttendanceMetric = ({
  label,
  pct,
  present,
  total,
  absent,
  color,
  onPress,
}: {
  label: string;
  pct: number;
  present: number;
  total: number;
  absent: number;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.metricCard} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.metricTop}>
      <AppText style={styles.metricLabel} weight="semibold">{label}</AppText>
      <AppText weight="bold" style={[styles.metricPct, { color }]}>{Math.round(pct)}%</AppText>
    </View>
    <View style={styles.metricBarTrack}>
      <View style={[styles.metricBarFill, { width: `${Math.min(pct, 100)}%` as DimensionValue, backgroundColor: color }]} />
    </View>
    <AppText style={styles.metricValue} weight="bold">{present}<AppText style={styles.metricValueMuted}> / {total}</AppText></AppText>
    <AppText style={styles.metricSub}>{absent} absent</AppText>
  </TouchableOpacity>
);

const pctColor = (pct: number): string => {
  if (pct === 0) { return C.muted; }
  if (pct >= 75) { return C.success; }
  if (pct >= 50) { return C.warning; }
  return C.error;
};

const StatCard = ({
  label,
  value,
  subtext,
  icon: IconComponent,
  iconColor,
  onPress,
  loading,
}: any) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.iconBox, { backgroundColor: `${iconColor}12` }]}>
      <IconComponent size={18} color={iconColor} />
    </View>
    <View style={styles.statCopy}>
      <AppText style={styles.cardLabel} weight="medium">{label}</AppText>
      {loading ? (
        <View style={styles.skeletonText} />
      ) : (
        <AppText weight="bold" style={styles.cardValue}>{value}</AppText>
      )}
      {!loading ? <AppText style={styles.cardSub} numberOfLines={1}>{subtext}</AppText> : null}
    </View>
  </TouchableOpacity>
);

const BarRow = ({ label, percentage, present, total, onPress }: any) => (
  <TouchableOpacity style={styles.barRow} onPress={onPress} activeOpacity={0.8}>
    <AppText style={styles.barLabel} weight="semibold">{label}</AppText>
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          {
            width: (percentage + '%') as DimensionValue,
            backgroundColor: pctColor(percentage),
          },
        ]}
      />
    </View>
    <AppText
      weight="bold"
      style={[
        styles.barPct,
        {
          color: pctColor(percentage),
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        },
      ]}
    >
      {percentage}%
    </AppText>
    <AppText style={styles.barCount}>{present}/{total}</AppText>
  </TouchableOpacity>
);

const ClassChip = ({ label, percentage, present, total, onPress }: any) => {
  const statusColor = pctColor(percentage);
  return (
    <TouchableOpacity
      style={styles.classChip}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.classChipHeader}>
        <AppText style={styles.chipLabel} weight="bold">{label}</AppText>
        <AppText weight="bold" style={[styles.chipPct, { color: statusColor }]}>
          {percentage}%
        </AppText>
      </View>

      <View style={styles.progressTrackCompact}>
        <View style={[styles.progressFillCompact, { width: `${percentage}%`, backgroundColor: statusColor }]} />
      </View>

      <AppText style={styles.chipSub} numberOfLines={1}>{present}/{total} present</AppText>
    </TouchableOpacity>
  );
};

const QUICK_ACTIONS = [
  { label: 'Face Review', route: 'PrincipalFaceReview', icon: Scan },
  { label: 'Calendar', route: 'PrincipalCalendarManagement', icon: CalendarIcon },
  { label: 'Promotion', route: 'PrincipalStudentPromotion', icon: GraduationCap },
  { label: 'Visitors', route: 'VisitorDashboard', icon: Users },
  { label: 'Export', route: 'PrincipalDataExport', icon: FileDown },
  { label: 'Exams', route: 'PrincipalExams', icon: ClipboardList },
  { label: 'Notices', route: 'PrincipalAnnouncements', icon: Megaphone },
  { label: 'Leaves', route: 'PrincipalTeacherLeaves', icon: CalendarIcon },
  { label: 'Requests', route: 'PrincipalTeacherRegistrationRequests', icon: UserPlus },
  { label: 'Student 360', route: 'Student360', icon: Eye },
  { label: 'Settings', route: 'PrincipalSettings', icon: Settings },
] as const;

export default function PrincipalDashboardScreen() {
  const tabBarScrollPadding = useTabBarScrollPadding();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName, setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { unreadCount } = useUnreadNotifications();

  useEffect(() => {
    loadCredentials();

    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, []);
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    if (schoolCode && branchId) {
      loadCachedData();
      loadDashboardData();
    }
  }, [schoolCode, branchId]);

  const loadCredentials = async () => {
    try {
      const code = await AsyncStorage.getItem('school_code') ||
        await AsyncStorage.getItem('schoolCode') ||
        await AsyncStorage.getItem('school_id') ||
        await AsyncStorage.getItem('schoolId') || '';

      const branch = await AsyncStorage.getItem('branch_id') ||
        await AsyncStorage.getItem('branchId') ||
        await AsyncStorage.getItem('branch_code') ||
        await AsyncStorage.getItem('branchCode') || '';

      if (isMounted.current) {
        setSchoolCode(code);
        setBranchId(branch);
      }
    } catch (err) {
      console.error('Error loading credentials:', err);
      setError('Failed to load credentials');
    }
  };

  const loadCachedData = async () => {
    try {
      const statsKey = `principal_stats_${schoolCode}_${branchId}`;
      const classesKey = `principal_classes_${schoolCode}_${branchId}`;

      const [cachedStats, cachedClasses] = await Promise.all([
        AsyncStorage.getItem(statsKey),
        AsyncStorage.getItem(classesKey),
      ]);

      if (!isMounted.current) {return;}

      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
      }
      if (cachedClasses) {
        setClasses(JSON.parse(cachedClasses));
      }

      if (cachedStats || cachedClasses) {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
    }
  };

  const getHeaders = () => ({
    'X-School-Code': schoolCode,
    'x-school-code': schoolCode,
    'X-Branch-Id': branchId,
    'x-branch-id': branchId,
  });

  const loadDashboardData = async () => {
    if (!schoolCode || !branchId) {
      if (isMounted.current) {
        setError('Missing school code or branch ID. Please login again.');
        setLoading(false);
      }
      return;
    }

    if (isMounted.current) {setError('');}

    let statsOk = false;
    let classesOk = false;

    try {
      const statsData = await principalService.getPrincipalStats(getHeaders());
      if (isMounted.current) {
        setStats(statsData);
        statsOk = true;
      }

      // Cache stats
      await AsyncStorage.setItem(`principal_stats_${schoolCode}_${branchId}`, JSON.stringify(statsData));
    } catch (err: any) {
      if (err?.response?.status === 401) {return;}
      console.log('Stats error:', err?.response?.data || err);
    }

    try {
      const classesData = await principalService.getPrincipalClasses(getHeaders());
      if (isMounted.current) {
        setClasses(classesData);
        classesOk = true;
      }

      // Cache classes
      await AsyncStorage.setItem(`principal_classes_${schoolCode}_${branchId}`, JSON.stringify(classesData));
    } catch (err: any) {
      if (err?.response?.status === 401) {return;}
      console.log('Classes error:', err?.response?.data || err);
    }

    if (isMounted.current) {
      if (!statsOk && !classesOk) {
        setError('Unable to load dashboard data. Please check the connection.');
      }

      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const goToAttendanceView = (view: string) => {
    safeNavigate(navigation, 'PrincipalAttendance');
  };

  const goToClassAttendance = (classData: ClassData) => {
    const classGrade = String(classData?.class_grade || '').trim();
    const section = String(classData?.section || '').trim();
    if (!classGrade || !section) {return;}

    safeNavigate(navigation, 'PrincipalAttendance');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {return 'Morning';}
    if (hour < 17) {return 'Afternoon';}
    return 'Evening';
  };

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const headerDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const cards = stats?.cards || {};
  const breakdown = stats?.today_breakdown || {};
  const teacherAtt = breakdown?.teachers || {};
  const studentAtt = breakdown?.students || {};
  const sortedClasses = [...classes].sort((a, b) => (b.attendance_pct ?? 0) - (a.attendance_pct ?? 0));

  return (
    <View style={styles.container}>


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarScrollPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} />
        }
      >
        <DashboardHeroHeader
          userName={userName || 'Principal'}
          greetingLine={`Good ${getGreeting()}`}
          greetingUppercase={false}
          showWave={false}
          subtitle={schoolCode ? `${schoolCode} · ${headerDate}` : headerDate}
          unreadCount={unreadCount}
          onAvatarPress={() => safeNavigate(navigation, 'Profile')}
          onNotificationsPress={() => safeNavigate(navigation, 'Notifications')}
          fullBleed
        />

        <View style={[innerPageLayoutStyles.contentFront, styles.dashboardSheet]}>
      {error ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={18} color={C.error} />
          <AppText style={styles.errorText} weight="semibold">{error}</AppText>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <AppText style={styles.sectionTitle} weight="bold">Overview</AppText>
        <View style={styles.grid4}>
        <StatCard
          label="Teachers"
          value={(cards.total_teachers ?? 0).toLocaleString()}
          subtext={`${teacherAtt.present ?? 0} present today`}
          icon={Users}
          iconColor={C.primary}
          onPress={() => goToAttendanceView('teachers')}
          loading={loading}
        />

        <StatCard
          label="Students"
          value={(cards.total_students ?? 0).toLocaleString()}
          subtext={`${studentAtt.present ?? 0} present today`}
          icon={User}
          iconColor={C.primary}
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />

        <StatCard
          label="Classes"
          value={(cards.total_classes ?? 0).toLocaleString()}
          subtext={`${classes.length} sections`}
          icon={Grid}
          iconColor={C.primary}
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />

        <StatCard
          label="Attendance"
          value={`${cards.today_attendance_pct ?? 0}%`}
          subtext="Today combined"
          icon={TrendingUp}
          iconColor={pctColor(cards.today_attendance_pct ?? 0)}
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />
        </View>

        <View style={styles.overviewDivider} />

        {loading ? (
          <View style={styles.attendanceRow}>
            {[1, 2].map(i => (
              <View key={`metric-skel-${i}`} style={[styles.metricCard, styles.metricSkeleton]} />
            ))}
          </View>
        ) : (
          <View style={styles.attendanceRow}>
            <AttendanceMetric
              label="Teachers"
              pct={teacherAtt.attendance_pct ?? 0}
              present={teacherAtt.present ?? 0}
              total={teacherAtt.total ?? 0}
              absent={teacherAtt.absent ?? 0}
              color={C.primary}
              onPress={() => goToAttendanceView('teachers')}
            />
            <AttendanceMetric
              label="Students"
              pct={studentAtt.attendance_pct ?? 0}
              present={studentAtt.present ?? 0}
              total={studentAtt.total ?? 0}
              absent={studentAtt.absent ?? 0}
              color={C.success}
              onPress={() => goToAttendanceView('students')}
            />
          </View>
        )}

        {!loading && (
          <View style={styles.summaryStrip}>
            <View style={styles.sumItem}>
              <AppText weight="bold" style={[styles.sumVal, { color: (teacherAtt.present ?? 0) + (studentAtt.present ?? 0) > 0 ? C.success : C.muted }]}>
                {(teacherAtt.present ?? 0) + (studentAtt.present ?? 0)}
              </AppText>
              <AppText style={styles.sumLabel}>Present</AppText>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.sumItem}>
              <AppText weight="bold" style={[styles.sumVal, { color: (teacherAtt.absent ?? 0) + (studentAtt.absent ?? 0) > 0 ? C.error : C.muted }]}>
                {(teacherAtt.absent ?? 0) + (studentAtt.absent ?? 0)}
              </AppText>
              <AppText style={styles.sumLabel}>Absent</AppText>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.sumItem}>
              <AppText weight="bold" style={[styles.sumVal, { color: pctColor(cards.today_attendance_pct ?? 0) }]}>
                {cards.today_attendance_pct ?? 0}%
              </AppText>
              <AppText style={styles.sumLabel}>Overall</AppText>
            </View>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <AppText style={styles.sectionTitle} weight="bold">Tools</AppText>
        <QuickActionGrid style={styles.toolsGrid} columns={3}>
          {QUICK_ACTIONS.map((action) => {
            const IconComponent = action.icon;
            return (
              <QuickActionItem key={action.label} columns={3}>
                <TouchableOpacity
                  style={styles.toolItem}
                  onPress={() => safeNavigate(navigation, action.route as any)}
                  activeOpacity={0.75}
                >
                  <View style={styles.toolIcon}>
                    <IconComponent size={18} color={C.primary} />
                  </View>
                  <AppText style={styles.toolLabel} weight="medium" numberOfLines={2}>
                    {action.label}
                  </AppText>
                </TouchableOpacity>
              </QuickActionItem>
            );
          })}
        </QuickActionGrid>
      </View>

      {/* Section Overview */}
      {(loading || classes.length > 0) && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View>
              <AppText style={styles.sectionTitle} weight="bold">Sections</AppText>
              <AppText style={styles.sectionSub}>
                {loading ? 'Loading…' : `${classes.length} active`}
              </AppText>
            </View>
          </View>

          {loading ? (
            <View style={styles.classGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <View key={`class-grid-skeleton-${i}`} style={styles.skeletonClassChip}>
                  <View style={[styles.skeletonBox, { width: '55%', height: 12, alignSelf: 'center', marginBottom: Theme.spacing.sm }]} />
                  <View style={[styles.skeletonBox, { width: '45%', height: 22, alignSelf: 'center', marginBottom: 6 }]} />
                  <View style={[styles.skeletonBox, { width: '60%', height: 10, alignSelf: 'center' }]} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.classGrid}>
              {classes.map((c, i) => {
                const pct = c.attendance_pct ?? 0;
                return (
                  <ClassChip
                    key={`${c.class_id ?? 'na'}-${c.section ?? c.label ?? 'sec'}-${i}`}
                    label={c.label || ''}
                    percentage={pct}
                    present={c.present ?? 0}
                    total={c.students_total ?? 0}
                    onPress={() => goToClassAttendance(c)}
                  />
                );
              })}
            </View>
          )}
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
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: Theme.colors.card,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HEADER_CONSTANTS.DASHBOARD_HORIZONTAL,
  },
  dashboardSheet: {
    marginTop: -20,
    marginHorizontal: -HEADER_CONSTANTS.DASHBOARD_HORIZONTAL,
    paddingHorizontal: HEADER_CONSTANTS.DASHBOARD_HORIZONTAL,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  overviewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  sectionHead: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    color: C.text,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    marginBottom: 12,
  },
  toolsGrid: {
    marginTop: 12,
  },
  toolItem: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 6,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 58, 138, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  toolLabel: {
    fontSize: 11,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: 14,
  },
  attendanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  metricCard: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 12,
    gap: 5,
  },
  metricSkeleton: {
    minHeight: 108,
    backgroundColor: C.border,
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: C.muted,
  },
  metricPct: {
    fontSize: 18,
    letterSpacing: -0.5,
  },
  metricBarTrack: {
    height: 5,
    backgroundColor: C.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricValue: {
    fontSize: 20,
    color: C.text,
    letterSpacing: -0.3,
  },
  metricValueMuted: {
    fontSize: 14,
    color: C.muted,
    fontWeight: '500',
  },
  metricSub: {
    fontSize: 11,
    color: C.muted,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  profileAvatarText: {
    color: Theme.colors.card,
    fontSize: 18,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroCopy: {
    gap: 4,
    marginTop: Theme.spacing.xs,
  },
  heroGreetingLabel: {
    ...Theme.typography.caption,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.5,
  },
  heroGreetingName: {
    fontSize: 28,
    color: Theme.colors.card,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: 20,
    paddingBottom: Theme.spacing.sm,
    marginBottom: 12,
    marginTop: Theme.spacing.xs,
  },
  welcomeTitle: {
    fontSize: 18,
    color: C.text,
  },
  welcomeSub: {
    ...Theme.typography.caption,
    color: C.muted,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateText: {
    ...Theme.typography.caption,
    color: C.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.errorSoft,
    marginBottom: Theme.spacing.md,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.errorSoft,
  },
  errorText: {
    flex: 1,
    ...Theme.typography.body,
    color: C.error,
  },
  grid4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 10,
    width: '48.5%',
  },
  statCopy: {
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 11,
    color: C.muted,
  },
  cardValue: {
    fontSize: 20,
    color: C.text,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  cardSub: {
    fontSize: 10,
    color: C.textSec,
    marginTop: 1,
  },
  skeletonText: {
    height: 16,
    backgroundColor: C.border,
    borderRadius: 8,
    marginTop: Theme.spacing.xs,
  },
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  barBody: {
    padding: Theme.spacing.md,
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    ...Theme.typography.caption,
    color: C.text,
    width: 52,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: C.bg,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barPct: {
    fontSize: 11,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  barCount: {
    fontSize: 11,
    color: C.muted,
    width: 52,
    textAlign: 'right',
  },
  sumDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
    alignSelf: 'center',
  },
  sumItem: {
    alignItems: 'center',
    minWidth: 72,
  },
  sumVal: {
    fontSize: 17,
    letterSpacing: -0.3,
  },
  sumLabel: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
    fontWeight: '500',
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  classChip: {
    borderRadius: 12,
    padding: 12,
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: C.bg,
  },
  chipLabel: {
    fontSize: 14,
    color: C.text,
    fontWeight: '600',
  },
  chipPct: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  classChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  progressTrackCompact: {
    width: '100%',
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFillCompact: {
    height: '100%',
    borderRadius: 3,
  },
  progressTrack: {
    width: 72,
    height: 8,
    backgroundColor: C.bg,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomText: {
    ...Theme.typography.label,
    color: C.muted,
  },
  bottomStrong: {
    color: C.text,
  },
  liveIndicator: {
    marginLeft: 'auto',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.success,
  },
  emptyState: {
    padding: Theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
  },
  skeletonBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonBox: {
    backgroundColor: C.border,
    borderRadius: 6,
  },
  skeletonRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: Theme.spacing.md,
  },
  skeletonClassChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    width: SCREEN_WIDTH > 400 ? '47%' : '100%',
  },
  decCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -40,
  },
  decCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20,
    left: 60,
  },
});
