import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/feather';
import { Svg, Circle } from 'react-native-svg';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import { RootStackParamList } from '../../navigation/AppNavigator';

// Local theme bridge for consistency
const C = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  muted: colors.textMuted,
  primary: colors.primary,
  success: colors.success,
  successSoft: colors.successSoft,
  error: colors.error,
  errorSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
  accent: colors.accent,
};

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

const AttendanceRing = ({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(pct, 100)) / 100;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <AppText style={[styles.ringPercentage, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
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
  icon, 
  iconBg, 
  iconColor, 
  trend, 
  trendUp, 
  accentColor,
  onPress,
  loading 
}: any) => (
  <TouchableOpacity 
    style={[styles.statCard, { borderTopColor: accentColor || C.primary }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.cardTop}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      {trend && (
        <View style={[styles.trendBadge, trendUp ? styles.trendUp : styles.trendDown]}>
          <Icon name={trendUp ? 'arrow-up' : 'arrow-down'} size={8} color={trendUp ? C.success : C.error} />
          <AppText style={[styles.trendText, { color: trendUp ? C.success : C.error }]}>{trend}</AppText>
        </View>
      )}
    </View>
    <AppText style={styles.cardLabel}>{label}</AppText>
    {loading ? (
      <View style={styles.skeletonText} />
    ) : (
      <AppText style={[styles.cardValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
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

const BarRow = ({ label, percentage, present, total, onPress }: any) => (
  <TouchableOpacity style={styles.barRow} onPress={onPress} activeOpacity={0.7}>
    <AppText style={styles.barLabel}>{label}</AppText>
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
    <AppText style={[
      styles.barPct, 
      { 
        color: percentage >= 75 ? C.success : percentage >= 50 ? C.warning : C.error,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
      }
    ]}>
      {percentage}%
    </AppText>
    <AppText style={styles.barCount}>{present}/{total}</AppText>
  </TouchableOpacity>
);

const ClassChip = ({ label, percentage, present, total, onPress }: any) => {
  const isGood = percentage >= 75;
  return (
    <TouchableOpacity 
      style={[styles.classChip, { backgroundColor: isGood ? C.successSoft : C.errorSoft, borderColor: isGood ? C.successSoft : C.errorSoft } as any]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <AppText style={styles.chipLabel}>Class {label}</AppText>
      <AppText style={[styles.chipPct, { color: isGood ? C.success : C.error, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
        {percentage}%
      </AppText>
      <AppText style={styles.chipSub}>{present}/{total} present</AppText>
    </TouchableOpacity>
  );
};

export default function DashboardPage() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName } = useAuth();
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCredentials();
  }, []);

  useEffect(() => {
    if (schoolCode && branchId) {
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
      
      setSchoolCode(code);
      setBranchId(branch);
    } catch (err) {
      console.error('Error loading credentials:', err);
      setError('Failed to load credentials');
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
      setError('Missing school code or branch ID. Please login again.');
      setLoading(false);
      return;
    }

    setError('');

    let statsOk = false;
    let classesOk = false;

    try {
      const statsRes = await API.get('/hm/dashboard/stats', { headers: getHeaders() });
      setStats(statsRes.data);
      statsOk = true;
    } catch (err: any) {
      console.log('Stats error:', err?.response?.data || err);
    }

    try {
      const classesRes = await API.get('/hm/classes', { headers: getHeaders() });
      setClasses(classesRes.data?.items || []);
      classesOk = true;
    } catch (err: any) {
      console.log('Classes error:', err?.response?.data || err);
    }

    if (!statsOk && !classesOk) {
      setError('Unable to load dashboard data. Please check the connection.');
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const goToAttendanceView = (view: string) => {
    navigation.navigate('HMAttendance' as any);
  };

  const goToClassAttendance = (classData: ClassData) => {
    const classGrade = String(classData?.class_grade || '').trim();
    const section = String(classData?.section || '').trim();
    if (!classGrade || !section) return;
    
    navigation.navigate('HMAttendance' as any);
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

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View>
          <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'HM'}!</AppText>
          <AppText style={styles.welcomeSub}>Manage your school's daily attendance and activities.</AppText>
        </View>
        <View style={styles.dateBadge}>
          <Icon name="calendar" size={12} color={C.muted} />
          <AppText style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </AppText>
        </View>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={16} color={C.error} />
          <AppText style={styles.errorText}>⚠ {error}</AppText>
        </View>
      ) : null}

      {/* Stat Cards */}
      <View style={styles.grid4}>
        <StatCard
          label="Total Teachers"
          value={(cards.total_teachers ?? 0).toLocaleString()}
          subtext={`${teacherAtt.present ?? 0} present today`}
          icon="users"
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
          icon="user"
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
          icon="grid"
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
          icon="trending-up"
          iconBg="rgba(124, 58, 237, 0.1)"
          iconColor="#7c3aed"
          trend={(cards.today_attendance_pct ?? 0) >= 75 ? 'Good' : 'Low'}
          trendUp={(cards.today_attendance_pct ?? 0) >= 75}
          accentColor="#7c3aed"
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />
      </View>

      {/* Main Grid */}
      <View style={styles.mainGrid}>
        {/* Class-wise Attendance Bar Chart */}
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <AppText style={styles.panelTitle}>Class-wise Attendance Today</AppText>
              <AppText style={styles.panelSub}>
                {loading ? 'Loading…' : `${classes.length} sections · sorted by %`}
              </AppText>
            </View>
          </View>

          <View style={styles.barBody}>
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => (
                <View key={`bar-skeleton-${i}`} style={styles.skeletonBarRow}>
                  <View style={[styles.skeletonBox, { width: 52, height: 12 }]} />
                  <View style={[styles.skeletonBox, { flex: 1, height: 20 }]} />
                  <View style={[styles.skeletonBox, { width: 36, height: 12 }]} />
                </View>
              ))
            ) : !sortedClasses.length ? (
              <View style={styles.emptyState}>
                <AppText style={styles.emptyText}>No class data available.</AppText>
              </View>
            ) : (
              sortedClasses.map((c, i) => (
                <BarRow
                  key={`${c.class_id ?? 'na'}-${c.section ?? c.label ?? 'sec'}-${i}`}
                  label={c.label || ''}
                  percentage={c.attendance_pct ?? 0}
                  present={c.present ?? 0}
                  total={c.students_total ?? 0}
                  onPress={() => goToClassAttendance(c)}
                />
              ))
            )}
          </View>
        </View>

        {/* Attendance Breakdown Rings */}
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <AppText style={styles.panelTitle}>Attendance Breakdown</AppText>
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
                    <AppText style={styles.ringLabel}>Teachers</AppText>
                    <AppText style={[styles.ringValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                      {teacherAtt.present ?? 0}
                      <AppText style={styles.ringTotal}> / {teacherAtt.total ?? 0}</AppText>
                    </AppText>
                    <AppText style={styles.ringSub}>{teacherAtt.absent ?? 0} absent today</AppText>
                    <AppText style={[styles.ringPct, { color: (teacherAtt.attendance_pct ?? 0) >= 75 ? C.success : C.error }]}>
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
                    <AppText style={styles.ringLabel}>Students</AppText>
                    <AppText style={[styles.ringValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                      {studentAtt.present ?? 0}
                      <AppText style={styles.ringTotal}> / {studentAtt.total ?? 0}</AppText>
                    </AppText>
                    <AppText style={styles.ringSub}>{studentAtt.absent ?? 0} absent today</AppText>
                    <AppText style={[styles.ringPct, { color: (studentAtt.attendance_pct ?? 0) >= 75 ? C.success : C.error }]}>
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
                <AppText style={[styles.sumVal, { color: C.success, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {(teacherAtt.present ?? 0) + (studentAtt.present ?? 0)}
                </AppText>
                <AppText style={styles.sumLabel}>Present</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sumItem} onPress={() => goToAttendanceView('students')}>
                <AppText style={[styles.sumVal, { color: C.error, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {(teacherAtt.absent ?? 0) + (studentAtt.absent ?? 0)}
                </AppText>
                <AppText style={styles.sumLabel}>Absent</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sumItem} onPress={() => goToAttendanceView('students')}>
                <AppText style={[styles.sumVal, { color: '#7c3aed', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {cards.today_attendance_pct ?? 0}%
                </AppText>
                <AppText style={styles.sumLabel}>Overall</AppText>
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
              <AppText style={styles.panelTitle}>Section Overview</AppText>
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

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomItem}>
          <Icon name="home" size={13} color="#6366f1" />
          <AppText style={styles.bottomText}>School: <AppText style={styles.bottomStrong}>{schoolCode || '—'}</AppText></AppText>
        </View>
        <View style={styles.bottomItem}>
          <Icon name="git-branch" size={13} color="#6366f1" />
          <AppText style={styles.bottomText}>Branch: <AppText style={styles.bottomStrong}>{branchId || '—'}</AppText></AppText>
        </View>
        <View style={[styles.bottomItem, styles.liveIndicator]}>
          <View style={styles.liveDot} />
          <AppText style={styles.bottomText}>Live</AppText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  welcomeSub: {
    fontSize: 13,
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
    fontWeight: '700',
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
    fontWeight: '600',
    color: C.error,
  },
  grid4: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    borderTopWidth: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: C.bg,
  },
  trendUp: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  trendDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: C.muted,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '800',
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
    marginBottom: 24,
  },
  panel: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  panelHead: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  panelSub: {
    fontSize: 12,
    color: C.muted,
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
    fontWeight: '700',
    color: C.text,
    width: 52,
  },
  barTrack: {
    flex: 1,
    height: 16,
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: C.muted,
    marginBottom: 4,
  },
  ringValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  ringTotal: {
    fontSize: 13,
    fontWeight: '400',
    color: C.muted,
  },
  ringSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  },
  ringPct: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  ringPercentage: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: C.bg,
  },
  sumItem: {
    alignItems: 'center',
  },
  sumVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  sumLabel: {
    fontSize: 10,
    color: C.muted,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  classChip: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    width: SCREEN_WIDTH > 400 ? '47%' : '100%',
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
  },
  chipPct: {
    fontSize: 16,
    fontWeight: '800',
  },
  chipSub: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
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
    fontWeight: '700',
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
