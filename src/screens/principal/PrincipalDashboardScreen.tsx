import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  DimensionValue,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, RefreshCw, Calendar as CalendarIcon, Users, User, Grid, TrendingUp, Home, GitBranch, AlertCircle, BarChart3, ClipboardList, Megaphone, Settings } from 'lucide-react-native';
import { Svg, Circle } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import API from '../../services/api';
import * as principalService from '../../services/principalService';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import { Principal_THEME as C } from '../../constants/principalTheme';
import AppText from '../../components/common/AppText';
import type { RootStackParamList } from '../../navigation/types';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QUICK_ACTION_COLUMNS = 4;
const QUICK_ACTION_GRID_GAP = 12;
const QUICK_ACTION_PANEL_HORIZONTAL = 16;
const QUICK_ACTION_CARD_HORIZONTAL = 16;
const QUICK_ACTION_ITEM_WIDTH = '24%';

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

const AttendanceRing = ({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(pct, 100)) / 100;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <AppText weight="bold" style={[styles.ringPercentage, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
          {Math.round(pct)}%
        </AppText>
      </View>
      <View style={{ transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <Circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={C.border}
            strokeWidth="10"
          />
          <Circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </View>
  );
};

const StatCard = ({ 
  label, 
  value, 
  subtext, 
  icon: IconComponent,
  iconBg, 
  iconColor, 
  trend, 
  trendUp, 
  onPress,
  loading 
}: any) => {
  const badgeColor = trendUp ? C.success : C.error;
  const badgeBg = trendUp ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)';
  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <IconComponent size={20} color={iconColor} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: badgeBg }]}>
            <View style={[styles.trendDot, { backgroundColor: badgeColor }]} />
            <AppText weight="bold" style={[styles.trendText, { color: badgeColor }]}>{trend}</AppText>
          </View>
        )}
      </View>
      <AppText style={styles.cardLabel} weight="bold">{label}</AppText>
      {loading ? (
        <View style={styles.skeletonText} />
      ) : (
        <AppText weight="bold" style={[styles.cardValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
          {value}
        </AppText>
      )}
      {loading ? (
        <View style={[styles.skeletonText, { width: '60%', marginTop: 8 }]} />
      ) : (
        <AppText style={styles.cardSub}>{subtext}</AppText>
      )}
    </TouchableOpacity>
  );
};

const BarRow = ({ label, percentage, present, total, onPress }: any) => (
  <TouchableOpacity style={styles.barRow} onPress={onPress} activeOpacity={0.8}>
    <AppText style={styles.barLabel} weight="bold">{label}</AppText>
    <View style={styles.barTrack}>
      <View 
        style={[
          styles.barFill, 
          { 
            width: (percentage + '%') as DimensionValue,
            backgroundColor: percentage >= 75 ? C.success : percentage >= 50 ? C.warning : C.error
          }
        ]} 
      />
    </View>
    <AppText
      weight="bold"
      style={[
        styles.barPct,
        {
          color: percentage >= 75 ? C.success : percentage >= 50 ? C.warning : C.error,
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
        }
      ]}
    >
      {percentage}%
    </AppText>
    <AppText style={styles.barCount}>{present}/{total}</AppText>
  </TouchableOpacity>
);

const ClassChip = ({ label, percentage, present, total, onPress }: any) => {
  const isGood = percentage >= 75;
  const statusColor = isGood ? C.success : percentage >= 50 ? C.warning : C.error;
  return (
    <TouchableOpacity 
      style={[styles.classChip, { borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.classChipHeader}>
        <AppText style={styles.chipLabel} weight="bold">{label}</AppText>
        <AppText weight="bold" style={[styles.chipPct, { color: statusColor, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
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
  { label: 'Teachers', route: 'PrincipalTeacherManagement', icon: Users, bg: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' },
  { label: 'Students', route: 'PrincipalStudentManagement', icon: User, bg: 'rgba(34, 197, 94, 0.08)', color: '#22c55e' },
  { label: 'Attendance', route: 'PrincipalAttendance', icon: CalendarIcon, bg: 'rgba(249, 115, 22, 0.08)', color: '#f97316' },
  { label: 'Exams', route: 'PrincipalExams', icon: ClipboardList, bg: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed' },
  { label: 'Reports', route: 'PrincipalReports', icon: BarChart3, bg: 'rgba(14, 165, 233, 0.08)', color: '#0ea5e9' },
  { label: 'Notices', route: 'PrincipalAnnouncements', icon: Megaphone, bg: 'rgba(236, 72, 153, 0.08)', color: '#ec4899' },
  { label: 'Settings', route: 'PrincipalSettings', icon: Settings, bg: 'rgba(100, 116, 139, 0.08)', color: '#64748b' },
  { label: 'Profile', route: 'Profile', icon: User, bg: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6' },
  { label: 'Teacher Leaves', route: 'TeacherLeaveApproval', icon: CalendarIcon, bg: 'rgba(234, 88, 12, 0.08)', color: '#ea580c' },
] as const;

export default function PrincipalDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName, setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const lastScrollY = useRef(0);
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
        AsyncStorage.getItem(classesKey)
      ]);

      if (!isMounted.current) return;

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

    if (isMounted.current) setError('');

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
      if (err?.response?.status === 401) return;
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
      if (err?.response?.status === 401) return;
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
    navigation.navigate('PrincipalAttendance' as any);
  };

  const goToClassAttendance = (classData: ClassData) => {
    const classGrade = String(classData?.class_grade || '').trim();
    const section = String(classData?.section || '').trim();
    if (!classGrade || !section) return;
    
    navigation.navigate('PrincipalAttendance' as any);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const cards = stats?.cards || {};
  const breakdown = stats?.today_breakdown || {};
  const teacherAtt = breakdown?.teachers || {};
  const studentAtt = breakdown?.students || {};
  const sortedClasses = [...classes].sort((a, b) => (b.attendance_pct ?? 0) - (a.attendance_pct ?? 0));
  const userInitial = (userName || 'Principal').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} />
        }
      >
        <LinearGradient 
          colors={['#1E3A8A', '#3B82F6']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[
            styles.heroHeader,
            {
              paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets),
              borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
              borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
              paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM + 40,
            }
          ]}
        >
          <View style={[styles.heroTopRow, { marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={styles.profileAvatar}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Profile')}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <AppText style={styles.profileAvatarText} weight="bold">{userInitial}</AppText>
              </TouchableOpacity>
              <View>
                <AppText style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', letterSpacing: 0.5 }} weight="semibold">
                  GOOD {getGreeting().toUpperCase()}
                </AppText>
                <AppText style={{ fontSize: 18, color: '#ffffff' }} weight="bold">
                  {((userName || 'Principal').split(' ')[0]).replace(/^\w/, (c) => c.toUpperCase())} 👋
                </AppText>
              </View>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.refreshIconBtn} onPress={() => navigation.navigate('Notifications')}>
                <Bell size={18} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <AppText style={styles.badgeText} weight="bold">{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh} disabled={loading}>
                <RefreshCw size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Welcome Section (Inside Gradient) */}
          <View style={[styles.welcomeSection, { paddingTop: 10, paddingBottom: 20 }]}>
            <View>
              <AppText style={[styles.welcomeTitle, { color: '#ffffff' }]} weight="bold">Daily control center</AppText>
              <AppText style={[styles.welcomeSub, { color: 'rgba(255,255,255,0.8)' }]}>Manage your school&apos;s activities from one place.</AppText>
            </View>
            <View style={[styles.dateBadge, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }]}>
              <CalendarIcon size={12} color="#ffffff" />
              <AppText style={[styles.dateText, { color: '#ffffff' }]} weight="bold">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </AppText>
            </View>
          </View>
        </LinearGradient>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={18} color={C.error} />
          <AppText style={styles.errorText} weight="semibold">{error}</AppText>
        </View>
      ) : null}

      {/* Stat Cards */}
      <View style={styles.grid4}>
        <StatCard
          label="Total Teachers"
          value={(cards.total_teachers ?? 0).toLocaleString()}
          subtext={`${teacherAtt.present ?? 0} present today`}
          icon={Users}
          iconBg={C.primary + '15'}
          iconColor={C.primary}
          trend="Live"
          trendUp={true}
          accentColor={C.primary}
          onPress={() => goToAttendanceView('teachers')}
          loading={loading}
        />

        <StatCard
          label="Total Students"
          value={(cards.total_students ?? 0).toLocaleString()}
          subtext={`${studentAtt.present ?? 0} present today`}
          icon={User}
          iconBg={C.successSoft}
          iconColor={C.success}
          trend="Live"
          trendUp={true}
          accentColor={C.success}
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />

        <StatCard
          label="Active Classes"
          value={(cards.total_classes ?? 0).toLocaleString()}
          subtext={`${classes.length} sections tracked`}
          icon={Grid}
          iconBg={C.warningSoft}
          iconColor={C.warning}
          trend="Active"
          trendUp={true}
          accentColor={C.warning}
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />

        <StatCard
          label="Today's Attendance"
          value={`${cards.today_attendance_pct ?? 0}%`}
          subtext="combined percentage"
          icon={TrendingUp}
          iconBg="rgba(124, 58, 237, 0.1)"
          iconColor="#7c3aed"
          trend={(cards.today_attendance_pct ?? 0) >= 75 ? 'Good' : 'Low'}
          trendUp={(cards.today_attendance_pct ?? 0) >= 75}
          accentColor="#7c3aed"
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />
      </View>

      <View style={styles.quickAccessPanel}>
        <View style={styles.panelHead}>
          <View>
            <AppText style={styles.panelTitle} weight="bold">Quick Access</AppText>
            <AppText style={styles.panelSub}>Jump straight to the core Principal tools.</AppText>
          </View>
        </View>

        <View style={styles.quickActionGrid}>
          {QUICK_ACTIONS.map((action) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity
                key={action.label}
                style={styles.quickActionItem}
                onPress={() => navigation.navigate(action.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
                  <IconComponent size={18} color={action.color} />
                </View>
                <AppText style={styles.quickActionLabel} weight="semibold">
                  {action.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main Grid */}
      <View style={styles.mainGrid}>
        {/* Attendance Breakdown Rings */}
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <AppText style={styles.panelTitle} weight="bold">Attendance Breakdown</AppText>
              <AppText style={styles.panelSub}>{breakdown.date || today}</AppText>
            </View>
          </View>

          <View style={styles.ringGrid}>
            {loading ? (
              [1, 2].map(i => (
                <View key={`ring-skeleton-${i}`} style={styles.skeletonRingRow}>
                  <View style={[styles.skeletonBox, { width: 80, height: 80, borderRadius: 40 }]} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={[styles.skeletonBox, { width: '50%', height: 11 }]} />
                    <View style={[styles.skeletonBox, { width: '65%', height: 28 }]} />
                    <View style={[styles.skeletonBox, { width: '40%', height: 10 }]} />
                    <View style={[styles.skeletonBox, { width: '55%', height: 10 }]} />
                  </View>
                </View>
              ))
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.ringRow} 
                  onPress={() => goToAttendanceView('teachers')}
                  activeOpacity={0.7}
                >
                  <AttendanceRing pct={teacherAtt.attendance_pct ?? 0} color={C.primary} />
                  <View style={styles.ringInfo}>
                    <AppText style={styles.ringLabel} weight="bold">Teachers</AppText>
                    <AppText weight="bold" style={[styles.ringValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                      {teacherAtt.present ?? 0}
                      <AppText style={styles.ringTotal}> / {teacherAtt.total ?? 0}</AppText>
                    </AppText>
                    <AppText style={styles.ringSub}>{teacherAtt.absent ?? 0} absent today</AppText>
                    <AppText weight="bold" style={[styles.ringPct, { color: (teacherAtt.attendance_pct ?? 0) >= 75 ? C.success : C.error }]}>
                      {teacherAtt.attendance_pct ?? 0}% attendance
                    </AppText>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.ringRow} 
                  onPress={() => goToAttendanceView('students')}
                  activeOpacity={0.7}
                >
                  <AttendanceRing pct={studentAtt.attendance_pct ?? 0} color={C.success} />
                  <View style={styles.ringInfo}>
                    <AppText style={styles.ringLabel} weight="bold">Students</AppText>
                    <AppText weight="bold" style={[styles.ringValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                      {studentAtt.present ?? 0}
                      <AppText style={styles.ringTotal}> / {studentAtt.total ?? 0}</AppText>
                    </AppText>
                    <AppText style={styles.ringSub}>{studentAtt.absent ?? 0} absent today</AppText>
                    <AppText weight="bold" style={[styles.ringPct, { color: (studentAtt.attendance_pct ?? 0) >= 75 ? C.success : C.error }]}>
                      {studentAtt.attendance_pct ?? 0}% attendance
                    </AppText>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {!loading && (
            <View style={styles.summaryStrip}>
              <TouchableOpacity style={styles.sumItem} onPress={() => goToAttendanceView('students')}>
                <AppText weight="bold" style={[styles.sumVal, { color: C.success, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {(teacherAtt.present ?? 0) + (studentAtt.present ?? 0)}
                </AppText>
                <AppText style={styles.sumLabel}>Present</AppText>
              </TouchableOpacity>
              
              <View style={styles.sumDivider} />
              
              <TouchableOpacity style={styles.sumItem} onPress={() => goToAttendanceView('students')}>
                <AppText weight="bold" style={[styles.sumVal, { color: C.error, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {(teacherAtt.absent ?? 0) + (studentAtt.absent ?? 0)}
                </AppText>
                <AppText style={styles.sumLabel}>Absent</AppText>
              </TouchableOpacity>
              
              <View style={styles.sumDivider} />
              
              <TouchableOpacity style={styles.sumItem} onPress={() => goToAttendanceView('students')}>
                <AppText weight="bold" style={[styles.sumVal, { color: '#7c3aed', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {cards.today_attendance_pct ?? 0}%
                </AppText>
                <AppText style={styles.sumLabel} weight="semibold">Overall</AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Section Overview */}
      {(loading || classes.length > 0) && (
        <View style={[styles.panel, { marginBottom: 20, marginHorizontal: 16 }]}>
          <View style={styles.panelHead}>
            <View>
              <AppText style={styles.panelTitle} weight="bold">Section Overview</AppText>
              <AppText style={styles.panelSub}>
                {loading ? 'Loading sections…' : `${classes.length} sections tracked`}
              </AppText>
            </View>
          </View>

          {loading ? (
            <View style={styles.classGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <View key={`class-grid-skeleton-${i}`} style={styles.skeletonClassChip}>
                  <View style={[styles.skeletonBox, { width: '55%', height: 12, alignSelf: 'center', marginBottom: 8 }]} />
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

      {/* Bottom Spacer for Tab Bar */}
      <View style={{ height: insets.bottom + 140 }} />
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
    color: '#ffffff',
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
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: C.navy,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  heroHeader: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 10,
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
    color: '#fff',
    fontSize: 18,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroCopy: {
    gap: 4,
    marginTop: 4,
  },
  heroGreetingLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroGreetingName: {
    fontSize: 28,
    color: '#ffffff',
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  welcomeTitle: {
    fontSize: 18,
    color: C.text,
  },
  welcomeSub: {
    fontSize: 12,
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
    fontSize: 12,
    color: C.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.errorSoft,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.errorSoft,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: C.error,
  },
  grid4: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: -30,
    marginBottom: 18,
  },
  statCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    width: '48%',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trendText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: C.muted,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 24,
    color: C.text,
  },
  cardSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 6,
  },
  skeletonText: {
    height: 16,
    backgroundColor: C.border,
    borderRadius: 8,
    marginTop: 4,
  },
  mainGrid: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 18,
  },
  quickAccessPanel: {
    backgroundColor: C.card,
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  panel: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  panelHead: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  panelTitle: {
    fontSize: 14,
    color: C.text,
  },
  panelSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
    rowGap: 16,
  },
  quickActionItem: {
    width: QUICK_ACTION_ITEM_WIDTH,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    color: C.text,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 2,
  },
  barBody: {
    padding: 16,
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    fontSize: 12,
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
    width: 36,
    textAlign: 'right',
  },
  barCount: {
    fontSize: 11,
    color: C.muted,
    width: 52,
    textAlign: 'right',
  },
  ringGrid: {
    flexDirection: 'column',
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  ringInfo: {
    flex: 1,
  },
  ringLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: C.muted,
    marginBottom: 4,
  },
  ringValue: {
    fontSize: 20,
    color: C.text,
  },
  ringTotal: {
    fontSize: 13,
    color: C.muted,
  },
  ringSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  },
  ringPct: {
    fontSize: 12,
    marginTop: 4,
  },
  ringPercentage: {
    fontSize: 18,
    color: C.text,
  },
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  sumDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.border,
    alignSelf: 'center',
  },
  sumItem: {
    alignItems: 'center',
  },
  sumVal: {
    fontSize: 16,
  },
  sumLabel: {
    fontSize: 10,
    color: C.muted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  classChip: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    width: SCREEN_WIDTH > 400 ? '48%' : '100%',
    backgroundColor: C.card,
  },
  chipLabel: {
    fontSize: 14,
    color: C.text,
  },
  chipPct: {
    fontSize: 14,
  },
  chipSub: {
    fontSize: 11,
    color: C.muted,
  },
  classChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTrackCompact: {
    width: '100%',
    height: 6,
    backgroundColor: '#e4e9f2',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
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
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomText: {
    fontSize: 11,
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
    padding: 24,
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
    padding: 16,
  },
  skeletonClassChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    width: SCREEN_WIDTH > 400 ? '47%' : '100%',
  },
});
