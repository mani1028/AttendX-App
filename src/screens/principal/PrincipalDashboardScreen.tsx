import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, Platform, DimensionValue, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
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
import { principalDashboardStyles as styles } from '../../components/principal/principalDashboard/principalDashboardStyles';

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
    shadowColor: Theme.colors.text,
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
  if (pct === 0) { return C.colors.sky; }
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
  { label: 'Face Review', route: 'PrincipalFaceReview', icon: Scan, color: C.colors.violet, bg: C.colors.violetLight },
  { label: 'Calendar', route: 'PrincipalCalendarManagement', icon: CalendarIcon, color: C.colors.blue, bg: C.colors.blueLight },
  { label: 'Promotion', route: 'PrincipalStudentPromotion', icon: GraduationCap, color: C.success, bg: C.colors.greenLight },
  { label: 'Visitors', route: 'VisitorDashboard', icon: Users, color: C.info, bg: C.colors.skyLight },
  { label: 'Export', route: 'PrincipalDataExport', icon: FileDown, color: C.warning, bg: C.colors.amberLight },
  { label: 'Exams', route: 'PrincipalExams', icon: ClipboardList, color: C.primary, bg: C.primarySoft },
  { label: 'Notices', route: 'PrincipalAnnouncements', icon: Megaphone, color: C.colors.red, bg: C.colors.redLight },
  { label: 'Leaves', route: 'PrincipalTeacherLeaves', icon: CalendarIcon, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { label: 'Requests', route: 'PrincipalTeacherRegistrationRequests', icon: UserPlus, color: C.success, bg: C.colors.greenLight },
  { label: 'Student 360', route: 'Student360', icon: Eye, color: C.colors.violet, bg: C.colors.violetLight },
  { label: 'Settings', route: 'PrincipalSettings', icon: Settings, color: C.textSec, bg: C.bgAlt },
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
        showsVerticalScrollIndicator={false}
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
          iconColor={C.colors.blue}
          onPress={() => goToAttendanceView('teachers')}
          loading={loading}
        />

        <StatCard
          label="Students"
          value={(cards.total_students ?? 0).toLocaleString()}
          subtext={`${studentAtt.present ?? 0} present today`}
          icon={User}
          iconColor={C.success}
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />

        <StatCard
          label="Classes"
          value={(cards.total_classes ?? 0).toLocaleString()}
          subtext={`${classes.length} sections`}
          icon={Grid}
          iconColor={C.colors.violet}
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
                  <View style={[styles.toolIcon, { backgroundColor: action.bg }]}>
                    <IconComponent size={18} color={action.color} />
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
