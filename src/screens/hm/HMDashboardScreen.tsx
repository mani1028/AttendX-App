import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const T = {
  bg: '#f0f2f7',
  surface: '#ffffff',
  surfaceAlt: '#f7f9fc',
  border: '#e4e9f2',
  text: '#0d1b2a',
  textSec: '#4a5568',
  textMuted: '#8898aa',
  blue: '#2563eb',
  blueLight: '#dbeafe',
  green: '#059669',
  greenLight: '#d1fae5',
  amber: '#d97706',
  amberLight: '#fef3c7',
  violet: '#7c3aed',
  violetLight: '#ede9fe',
  red: '#dc2626',
  redLight: '#fee2e2',
};

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
        <Text style={[styles.ringPercentage, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
          {Math.round(pct)}%
        </Text>
      </View>
      <View style={{ transform: [{ rotate: '-90deg' }] }}>
        <svg width={size} height={size} viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={T.border}
            strokeWidth="10"
          />
          <circle
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
        </svg>
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
  delay,
  onPress,
  loading 
}: any) => (
  <TouchableOpacity 
    style={[styles.statCard, { borderTopColor: accentColor || T.blue }]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.cardTop}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      {trend && (
        <View style={[styles.trendBadge, trendUp ? styles.trendUp : styles.trendDown]}>
          <Icon name={trendUp ? 'arrow-up' : 'arrow-down'} size={8} color={trendUp ? T.green : T.red} />
          <Text style={[styles.trendText, { color: trendUp ? T.green : T.red }]}>{trend}</Text>
        </View>
      )}
    </View>
    <Text style={styles.cardLabel}>{label}</Text>
    {loading ? (
      <View style={styles.skeletonText} />
    ) : (
      <Text style={[styles.cardValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
        {value}
      </Text>
    )}
    {loading ? (
      <View style={[styles.skeletonText, { width: '60%', marginTop: 8 }]} />
    ) : (
      <Text style={styles.cardSub}>{subtext}</Text>
    )}
  </TouchableOpacity>
);

const BarRow = ({ label, percentage, present, total, onPress }: any) => (
  <TouchableOpacity style={styles.barRow} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.barLabel}>{label}</Text>
    <View style={styles.barTrack}>
      <View 
        style={[
          styles.barFill, 
          { 
            width: `${percentage}%`,
            backgroundColor: percentage >= 75 ? T.green : percentage >= 50 ? T.amber : T.red
          }
        ]} 
      />
    </View>
    <Text style={[
      styles.barPct, 
      { 
        color: percentage >= 75 ? T.green : percentage >= 50 ? T.amber : T.red,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
      }
    ]}>
      {percentage}%
    </Text>
    <Text style={styles.barCount}>{present}/{total}</Text>
  </TouchableOpacity>
);

const ClassChip = ({ label, percentage, present, total, onPress }: any) => {
  const isGood = percentage >= 75;
  return (
    <TouchableOpacity 
      style={[styles.classChip, { backgroundColor: isGood ? T.greenLight : T.redLight, borderColor: isGood ? '#bbf7d0' : '#fecaca' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.chipLabel}>Class {label}</Text>
      <Text style={[styles.chipPct, { color: isGood ? T.green : T.red, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
        {percentage}%
      </Text>
      <Text style={styles.chipSub}>{present}/{total} present</Text>
    </TouchableOpacity>
  );
};

export default function DashboardPage() {
  const navigation = useNavigation();
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
    navigation.navigate('Attendance', { view });
  };

  const goToClassAttendance = (classData: ClassData) => {
    const classGrade = String(classData?.class_grade || '').trim();
    const section = String(classData?.section || '').trim();
    if (!classGrade || !section) return;
    
    navigation.navigate('Attendance', { 
      view: 'students',
      class_grade: classGrade,
      section: section
    });
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Good {getGreeting()}, Head Master 👋</Text>
          <Text style={styles.subtitle}>Here's what's happening at your school today</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.datePill}>
            <Icon name="calendar" size={12} color="#fff" />
            <Text style={styles.datePillText}>{today}</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadDashboardData}>
            <Icon name="refresh-cw" size={12} color={T.textSec} />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={16} color={T.red} />
          <Text style={styles.errorText}>⚠ {error}</Text>
        </View>
      ) : null}

      {/* Stat Cards */}
      <View style={styles.grid4}>
        <StatCard
          label="Total Teachers"
          value={(cards.total_teachers ?? 0).toLocaleString()}
          subtext={`${teacherAtt.present ?? 0} present today`}
          icon="users"
          iconBg={T.blueLight}
          iconColor={T.blue}
          trend="Live"
          trendUp={true}
          accentColor={T.blue}
          onPress={() => goToAttendanceView('teachers')}
          loading={loading}
        />

        <StatCard
          label="Total Students"
          value={(cards.total_students ?? 0).toLocaleString()}
          subtext={`${studentAtt.present ?? 0} present today`}
          icon="user"
          iconBg={T.greenLight}
          iconColor={T.green}
          trend="Live"
          trendUp={true}
          accentColor={T.green}
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />

        <StatCard
          label="Active Classes"
          value={(cards.total_classes ?? 0).toLocaleString()}
          subtext={`${classes.length} sections tracked`}
          icon="grid"
          iconBg={T.amberLight}
          iconColor={T.amber}
          trend="Active"
          trendUp={true}
          accentColor={T.amber}
          onPress={() => goToAttendanceView('students')}
          loading={loading}
        />

        <StatCard
          label="Today's Attendance"
          value={`${cards.today_attendance_pct ?? 0}%`}
          subtext="teachers + students combined"
          icon="trending-up"
          iconBg={T.violetLight}
          iconColor={T.violet}
          trend={(cards.today_attendance_pct ?? 0) >= 75 ? 'Good' : 'Low'}
          trendUp={(cards.today_attendance_pct ?? 0) >= 75}
          accentColor={T.violet}
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
              <Text style={styles.panelTitle}>Class-wise Attendance Today</Text>
              <Text style={styles.panelSub}>
                {loading ? 'Loading…' : `${classes.length} sections · sorted by %`}
              </Text>
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
                <Text style={styles.emptyText}>No class data available.</Text>
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
              <Text style={styles.panelTitle}>Attendance Breakdown</Text>
              <Text style={styles.panelSub}>{breakdown.date || today}</Text>
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
                  <AttendanceRing pct={teacherAtt.attendance_pct ?? 0} color={T.blue} />
                  <View style={styles.ringInfo}>
                    <Text style={styles.ringLabel}>Teachers</Text>
                    <Text style={[styles.ringValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                      {teacherAtt.present ?? 0}
                      <Text style={styles.ringTotal}> / {teacherAtt.total ?? 0}</Text>
                    </Text>
                    <Text style={styles.ringSub}>{teacherAtt.absent ?? 0} absent today</Text>
                    <Text style={[styles.ringPct, { color: (teacherAtt.attendance_pct ?? 0) >= 75 ? T.green : T.red }]}>
                      {teacherAtt.attendance_pct ?? 0}% attendance
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.ringRow} 
                  onPress={() => goToAttendanceView('students')}
                  activeOpacity={0.7}
                >
                  <AttendanceRing pct={studentAtt.attendance_pct ?? 0} color={T.green} />
                  <View style={styles.ringInfo}>
                    <Text style={styles.ringLabel}>Students</Text>
                    <Text style={[styles.ringValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                      {studentAtt.present ?? 0}
                      <Text style={styles.ringTotal}> / {studentAtt.total ?? 0}</Text>
                    </Text>
                    <Text style={styles.ringSub}>{studentAtt.absent ?? 0} absent today</Text>
                    <Text style={[styles.ringPct, { color: (studentAtt.attendance_pct ?? 0) >= 75 ? T.green : T.red }]}>
                      {studentAtt.attendance_pct ?? 0}% attendance
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {!loading && (
            <View style={styles.summaryStrip}>
              <TouchableOpacity style={styles.sumItem} onPress={() => goToAttendanceView('students')}>
                <Text style={[styles.sumVal, { color: T.green, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {(teacherAtt.present ?? 0) + (studentAtt.present ?? 0)}
                </Text>
                <Text style={styles.sumLabel}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sumItem} onPress={() => goToAttendanceView('students')}>
                <Text style={[styles.sumVal, { color: T.red, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {(teacherAtt.absent ?? 0) + (studentAtt.absent ?? 0)}
                </Text>
                <Text style={styles.sumLabel}>Absent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sumItem} onPress={() => goToAttendanceView('students')}>
                <Text style={[styles.sumVal, { color: T.violet, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {cards.today_attendance_pct ?? 0}%
                </Text>
                <Text style={styles.sumLabel}>Overall</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Section Overview */}
      {(loading || classes.length > 0) && (
        <View style={[styles.panel, { marginBottom: 20 }]}>
          <View style={styles.panelHead}>
            <View>
              <Text style={styles.panelTitle}>Section Overview</Text>
              <Text style={styles.panelSub}>
                {loading ? 'Loading sections…' : `${classes.length} sections · green ≥ 75% · red < 75%`}
              </Text>
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
          <Icon name="home" size={13} color={T.blue} />
          <Text style={styles.bottomText}>School: <Text style={styles.bottomStrong}>{schoolCode || '—'}</Text></Text>
        </View>
        <View style={styles.bottomItem}>
          <Icon name="git-branch" size={13} color={T.blue} />
          <Text style={styles.bottomText}>Branch: <Text style={styles.bottomStrong}>{branchId || '—'}</Text></Text>
        </View>
        <View style={styles.bottomItem}>
          <Icon name="shield" size={13} color={T.blue} />
          <Text style={styles.bottomText}>Role: <Text style={styles.bottomStrong}>Head Master</Text></Text>
        </View>
        <View style={[styles.bottomItem, styles.liveIndicator]}>
          <View style={styles.liveDot} />
          <Text style={styles.bottomText}>Live</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: T.textMuted,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.blue,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  datePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textSec,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.redLight,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: T.red,
  },
  grid4: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: T.border,
    padding: 20,
    borderTopWidth: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendUp: {
    backgroundColor: T.greenLight,
  },
  trendDown: {
    backgroundColor: T.redLight,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: T.textMuted,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -1,
  },
  cardSub: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 8,
  },
  skeletonText: {
    height: 16,
    backgroundColor: T.border,
    borderRadius: 8,
    marginTop: 4,
  },
  mainGrid: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
  },
  panel: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: T.border,
    overflow: 'hidden',
  },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: T.border,
    backgroundColor: T.surfaceAlt,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.text,
  },
  panelSub: {
    fontSize: 12,
    color: T.textMuted,
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
    color: T.text,
    width: 52,
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: T.surfaceAlt,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barPct: {
    fontSize: 11,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  barCount: {
    fontSize: 11,
    color: T.textMuted,
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
    borderBottomColor: T.border,
  },
  ringInfo: {
    flex: 1,
  },
  ringLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: T.textMuted,
    marginBottom: 4,
  },
  ringValue: {
    fontSize: 22,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -1,
  },
  ringTotal: {
    fontSize: 14,
    fontWeight: '400',
    color: T.textMuted,
  },
  ringSub: {
    fontSize: 11,
    color: T.textMuted,
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
    color: T.text,
  },
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1.5,
    borderTopColor: T.border,
    backgroundColor: T.surfaceAlt,
  },
  sumItem: {
    alignItems: 'center',
  },
  sumVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  sumLabel: {
    fontSize: 10,
    color: T.textMuted,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  classChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    width: SCREEN_WIDTH > 400 ? '47%' : '100%',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: T.text,
    marginBottom: 6,
  },
  chipPct: {
    fontSize: 18,
    fontWeight: '800',
  },
  chipSub: {
    fontSize: 10,
    color: T.textMuted,
    marginTop: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomText: {
    fontSize: 12,
    color: T.textSec,
  },
  bottomStrong: {
    fontWeight: '700',
    color: T.text,
  },
  liveIndicator: {
    marginLeft: 'auto',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.green,
    shadowColor: T.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: T.textMuted,
  },
  skeletonBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonBox: {
    backgroundColor: T.border,
    borderRadius: 8,
  },
  skeletonRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  skeletonClassChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    padding: 14,
    width: SCREEN_WIDTH > 400 ? '47%' : '100%',
  },
});