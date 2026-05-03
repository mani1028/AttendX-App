import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import {
  StyleSheet,
  View,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  CheckCircle2,
  X,
  Percent,
  CalendarCheck2,
  UserPlus,
  Users2,
  Heart,
  FileEdit,
  ClipboardEdit,
  Bell,
  User,
  BookOpen,
  Clock,
  Eye
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import { colors } from '../../constants/theme';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGoBack } from '../../utils/navigationHelpers';
import { safeNavigate } from '../../utils/navigationHelpers';
import AvatarBubble from '../../components/common/AvatarBubble';
import API from '../../services/api';
import { 
  getAssignedClasses, 
  getTeacherProfile, 
  getTeacherCapability,
  getAttendanceReport,
  getBranchStats
} from '../../services/teacherService';
import teacherMock from '../../services/teacherMock';
import { TeacherProfile as ApiTeacherProfile, TeacherCapability } from '../../types/api.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TeacherProfile extends Partial<ApiTeacherProfile> {
  name: string;
  email: string;
  phone?: string;
  school_name?: string;
  branch_name?: string;
  profile_photo_url?: string;
  teacher_photograph?: string;
  is_class_teacher?: boolean;
}

interface AttendanceSummary {
  classGrade: string;
  section: string;
  date: string;
  present: number;
  absent: number;
  half_day?: number;
  total: number;
  attendancePct: number;
  total_teachers?: number;
  total_students?: number;
  total_classes?: number;
  today_attendance_pct?: number;
  today_breakdown?: {
    teachers: { present: number; absent: number; half_day: number; attendance_pct: number };
    students: { present: number; absent: number; half_day: number; attendance_pct: number };
  };
}

const formatDateLabel = (value: string) => {
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

export default function TeacherDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { userName, setTabBarVisible, isClassTeacher: authIsClassTeacher } = useAuth();
  const isMounted = useRef(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const { unreadCount, refreshUnreadCount } = useUnreadNotifications();

  // Determine effective class teacher status (from auth or profile)
  const effectiveIsClassTeacher = profile?.is_class_teacher || authIsClassTeacher;
  const teacherFirstName = (userName || profile?.name || 'Mahesh').split(' ')[0];

  const lastScrollY = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [0, -90],
    extrapolate: 'clamp',
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const responseData = await getTeacherProfile();
      if (responseData && isMounted.current) {
        // Fetch capability details if possible
        let capability: TeacherCapability | null = null;
        try {
          const schoolId = responseData.school_code || (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
          const empId = responseData.employee_id || (await AsyncStorage.getItem('employee_id')) || '';
          if (schoolId && empId) {
            capability = await getTeacherCapability(schoolId, empId);
          }
        } catch (capErr) {
          console.log('Capability fetch failed, using defaults');
        }

        setProfile({
          ...responseData,
          is_class_teacher: capability?.is_class_teacher ?? false
        });

        const directPhoto = String(responseData.profile_photo_url || responseData.teacher_photograph || '').trim();
        let resolvedPhoto = directPhoto || null;

        if (!resolvedPhoto) {
          const cachedPhoto = await AsyncStorage.getItem('profile_photo_url');
          if (cachedPhoto) {
            resolvedPhoto = cachedPhoto;
          }
        }

        if (resolvedPhoto) {
          setProfilePhotoUrl(resolvedPhoto);
          setProfilePhotoError(false);
          await AsyncStorage.setItem('profile_photo_url', resolvedPhoto);
        } else {
          const cachedPhoto = await AsyncStorage.getItem('profile_photo_url');
          if (cachedPhoto) {
            setProfilePhotoUrl(cachedPhoto);
            setProfilePhotoError(false);
          }
        }

        if (isMounted.current) {
          setAttendanceLoading(true);
        }

        const attendanceSchoolCode = String(
          responseData.school_code ||
          (await AsyncStorage.getItem('school_code')) ||
          (await AsyncStorage.getItem('schoolCode')) ||
          ''
        ).trim();
        const branchId = String(
          responseData.branch_id ||
          (await AsyncStorage.getItem('branch_id')) ||
          (await AsyncStorage.getItem('branchId')) ||
          ''
        ).trim();
        const employeeId = String(
          responseData.teacher_id ||
          responseData.employee_id ||
          (await AsyncStorage.getItem('employee_id')) ||
          (await AsyncStorage.getItem('employeeId')) ||
          ''
        ).trim();

        if (attendanceSchoolCode && branchId && employeeId) {
          try {
            // Fetch assigned classes for the schedule section
            const classes = await getAssignedClasses(attendanceSchoolCode, branchId, employeeId);
            const resolvedAssigned = (Array.isArray(classes) && classes.length > 0)
              ? classes
              : (await teacherMock.getAssignedClassesMock());

            if (isMounted.current) {
              setAssignedClasses(resolvedAssigned);
              setClassesLoading(false);
            }

            // 1. Fetch Branch-wide stats for "Today's Attendance" section
            const branchStats = await getBranchStats(attendanceSchoolCode, branchId);
            
            if (branchStats && isMounted.current) {
              const studentStats = branchStats.today_breakdown?.students || { present: 0, absent: 0, half_day: 0, attendance_pct: 0, total: 0 };
              const teacherStats = branchStats.today_breakdown?.teachers || { present: 0, absent: 0, half_day: 0, attendance_pct: 0, total: 0 };
              const cards = branchStats.cards || {};

              setAttendanceSummary({
                classGrade: 'All',
                section: 'Branch',
                date: new Date().toISOString().split('T')[0],
                present: studentStats.present || 0,
                absent: studentStats.absent || 0,
                half_day: studentStats.half_day || 0,
                total: studentStats.total || cards.total_students || 0,
                attendancePct: studentStats.attendance_pct || cards.today_attendance_pct || 0,
                total_teachers: cards.total_teachers,
                total_students: cards.total_students,
                total_classes: cards.total_classes,
                today_attendance_pct: cards.today_attendance_pct,
                today_breakdown: {
                  teachers: teacherStats,
                  students: studentStats,
                }
              });
            } else {
              // 2. Fallback: Fetch Specific Class Attendance if branch stats are missing
              const activeClass = resolvedAssigned.find((item: any) => item?.class_grade && item?.section) || resolvedAssigned[0];

              if (activeClass?.class_grade && activeClass?.section) {
                try {
                  const attendanceDate = new Date().toISOString().split('T')[0];
                  const report = await getAttendanceReport(
                    attendanceSchoolCode,
                    branchId,
                    attendanceDate,
                    activeClass.class_grade,
                    activeClass.section
                  );

                  const present = Array.isArray(report?.present) ? report.present : [];
                  const absent = Array.isArray(report?.absent) ? report.absent : [];
                  const total = present.length + absent.length;
                  const attendancePct = total > 0 ? Math.round((present.length / total) * 100) : 0;

                  if (isMounted.current) {
                    setAttendanceSummary({
                      classGrade: String(activeClass.class_grade),
                      section: String(activeClass.section),
                      date: attendanceDate,
                      present: present.length,
                      absent: absent.length,
                      total,
                      attendancePct,
                    });
                  }
                } catch (attendanceError) {
                  throw attendanceError; // Trigger outer fallback
                }
              }
            }
          } catch (classError: any) {
            if (isMounted.current) {
              console.warn('Assigned classes fetch error:', classError?.response?.status, classError?.message);
              // Show demo data as fallback
              setAttendanceSummary({
                classGrade: '1',
                section: 'A',
                date: new Date().toISOString().split('T')[0],
                present: 28,
                absent: 5,
                total: 33,
                attendancePct: 85,
              });
            }
          }
        } else if (isMounted.current) {
          console.log('Missing school code, branch ID, or employee ID');
          // Show demo data
          setAttendanceSummary({
            classGrade: '1',
            section: 'A',
            date: new Date().toISOString().split('T')[0],
            present: 28,
            absent: 5,
            total: 33,
            attendancePct: 85,
          });
        }
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Error fetching teacher profile:', error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
        setAttendanceLoading(false);
        setClassesLoading(false);
      }
    }
  }, []);

  // Set tab bar visibility on mount
  useEffect(() => {
    setTabBarVisible(true);
    return () => {
      setTabBarVisible(true);
    };
  }, [setTabBarVisible]);

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      fetchDashboardData();
      refreshUnreadCount();
      return () => {
        isMounted.current = false;
      };
    }, [fetchDashboardData, refreshUnreadCount])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
    refreshUnreadCount();
  }, [fetchDashboardData, refreshUnreadCount]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const quickActions = [
    { label: 'Mark Attendance', icon: CalendarCheck2, color: '#3b82f6', route: 'TeacherAttendance' },
    { label: 'View Attendance', icon: Eye, color: '#06b6d4', route: 'TeacherViewAttendance' },
    // Student Enrollment is a Class-Teacher only action; include only if effectiveIsClassTeacher
    ...(effectiveIsClassTeacher ? [
      { label: 'Student Enrollment', icon: UserPlus, color: '#10b981', route: 'HMStudentRegistration' },
      { label: 'Manage Profiles', icon: Users, color: '#6366f1', route: 'TeacherStudentList' }
    ] : []),
    { label: 'Vital Scan AI', icon: Heart, color: '#ef4444', route: 'TeacherVitalScan' },
    { label: 'Marks Entry', icon: ClipboardEdit, color: '#eab308', route: 'TeacherMarksEntry' },
    { label: 'Homework', icon: BookOpen, color: '#06b6d4', route: 'TeacherHomeworkManagement' },
    { label: 'Leave Request', icon: Clock, color: '#f59e0b', route: 'TeacherLeaveRequest' },
    // Class Teacher specific actions - only show for class teachers
    ...(effectiveIsClassTeacher ? [
      { label: 'Leave Approval', icon: FileEdit, color: '#7c3aed', route: 'TeacherLeaveApproval' },
    ] : []),
  ];

  const schedule = Array.isArray(assignedClasses) && assignedClasses.length > 0
    ? assignedClasses
        .filter(cls => cls !== null && cls !== undefined)
        .map((cls: any) => ({
          title: cls.subject_name || (cls.is_class_teacher ? 'Class Teacher' : 'Subject Teacher'),
          class: `Class ${cls.class_grade || '?'} • Section ${cls.section || '?'}`,
          status: 'Today',
          statusColor: '#3b82f6',
          statusBg: '#eff6ff',
        }))
    : [
        {
          title: 'No Classes',
          class: 'No assigned classes found',
          status: 'N/A',
          statusColor: '#64748b',
          statusBg: '#f1f5f9',
        },
      ];

  const attendanceStats = attendanceSummary
    ? [
        {
          label: 'Present',
          value: String(attendanceSummary.present ?? 0),
          sub: 'Today',
          icon: CheckCircle2,
          color: '#22c55e',
        },
        {
          label: 'Absent',
          value: String(attendanceSummary.absent ?? 0),
          sub: 'Today',
          icon: X,
          color: '#ef4444',
        },
        {
          label: 'Attendance %',
          value: `${attendanceSummary.attendancePct ?? 0}%`,
          sub: 'Current class',
          icon: Percent,
          color: '#3b82f6',
        },
        {
          label: 'Total Students',
          value: String(attendanceSummary.total ?? 0),
          sub: 'Today',
          icon: Users,
          color: '#8b5cf6',
        },
      ]
    : [];

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#001F3F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />


      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: handleScroll }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        <Animated.View style={[styles.navyHeader, { paddingTop: insets.top + 12, transform: [{ translateY: headerTranslate }] }]}> 
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.profileContainer} onPress={() => safeNavigate(navigation as any, 'Profile')}>
              {profilePhotoUrl && !profilePhotoError ? (
                <Image
                  source={{ uri: profilePhotoUrl }}
                  style={styles.profileImage}
                  onError={() => setProfilePhotoError(true)}
                />
              ) : (
                <AvatarBubble displayName={profile?.name || userName || 'User'} size={40} textSize={14} primaryColor={colors.accent} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Bell size={20} color="#fff" strokeWidth={1.7} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <AppText weight="bold" style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeSection}>
            {effectiveIsClassTeacher ? (
              <View style={styles.roleBadge}>
                <AppText weight="bold" style={styles.roleBadgeText}>Class Teacher</AppText>
              </View>
            ) : null}
            <AppText weight="bold" style={styles.hiText}>Hi {teacherFirstName} 👋</AppText>
            <AppText weight="semiBold" style={styles.subText}>Here&apos;s what&apos;s happening today.</AppText>
          </View>
        </Animated.View>

        <View style={styles.cardsWrap}>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" style={styles.sectionTitle}>Today&apos;s Class Attendance</AppText>
                <AppText weight="semiBold" style={styles.sectionSubTitle}>
                  {attendanceLoading
                    ? 'Loading attendance summary…'
                    : attendanceSummary
                      ? `Class ${attendanceSummary.classGrade} • Section ${attendanceSummary.section} • ${formatDateLabel(attendanceSummary.date)}`
                      : 'No assigned class attendance found for today'}
                </AppText>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('TeacherViewAttendance')}>
                <AppText weight="bold" style={styles.viewAllBtn}>View All</AppText>
              </TouchableOpacity>
            </View>

            {attendanceLoading ? (
              <View style={styles.attendanceLoadingCard}>
                <ActivityIndicator size="small" color="#001F3F" />
              </View>
            ) : attendanceStats.length > 0 ? (
              <View>
                <View style={styles.statsGrid}>
                  {attendanceStats.map((stat, index) => {
                    const isPercent = typeof stat.value === 'string' && stat.value.trim().endsWith('%');
                    const numericValue = isPercent ? stat.value.trim().replace('%', '') : stat.value;
                    return (
                      <View key={index} style={styles.statCard}>
                        <View style={[styles.statIconWrapper, { backgroundColor: `${stat.color}20` }]}>
                          <stat.icon size={22} color={stat.color} strokeWidth={2} />
                        </View>
                        <View style={styles.statContent}>
                          {isPercent ? (
                            <View style={styles.percentRow}>
                              <AppText weight="bold" style={styles.statValue}>{numericValue}</AppText>
                              <AppText weight="bold" style={styles.percentSign}>%</AppText>
                            </View>
                          ) : (
                            <AppText weight="bold" style={styles.statValue}>{stat.value}</AppText>
                          )}
                          <AppText weight="semiBold" style={styles.statLabel}>{stat.label}</AppText>
                          <AppText weight="semiBold" style={styles.statSub}>{stat.sub}</AppText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.attendanceEmptyState}>
                <AppText weight="semiBold" style={styles.attendanceEmptyText}>
                  Attendance summary will appear once a class is assigned for today.
                </AppText>
              </View>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <AppText weight="bold" style={styles.sectionTitle}>Quick Actions</AppText>
            <View style={styles.quickActionGrid}>
              {quickActions.map((action, index) => {
                if (!action || !action.icon) return null;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.actionCard}
                    onPress={() => action.route && navigation.navigate(action.route as any)}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: `${action.color || '#64748B'}10` }]}>
                      <action.icon size={24} color={action.color || '#64748B'} strokeWidth={2} />
                    </View>
                    <AppText weight="bold" style={styles.actionLabel}>{(action.label || '').replace(' ', '\n')}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <AppText weight="bold" style={styles.sectionTitle}>Today&apos;s Schedule</AppText>
            </View>

            {classesLoading ? (
              <View style={styles.attendanceLoadingCard}>
                <ActivityIndicator size="small" color="#001F3F" />
              </View>
            ) : (
              schedule.map((item, index) => (
                <View key={index} style={styles.scheduleCard}>
                  <View>
                    <AppText weight="bold" style={styles.scheduleType}>{item.title}</AppText>
                    <AppText weight="semiBold" style={styles.scheduleInfo}>{item.class}</AppText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.statusBg }]}>
                    <AppText weight="bold" style={[styles.statusLabel, { color: item.statusColor }]}>{item.status}</AppText>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#F3F6FB',
  },
  navyHeader: {
    backgroundColor: '#001F3F',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 6,
    marginBottom: 18,
    marginHorizontal: -16,
    ...Platform.select({

      android: { elevation: 6 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  profileContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#22c55e',
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  notificationBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  // ...existing code...
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#001F3F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
  },
  welcomeSection: {
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.14)',
    marginBottom: 8,
  },
  hiText: {
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: -0.7,
    lineHeight: 30,
  },
  subText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    lineHeight: 18,
  },
  roleBadgeText: {
    fontSize: 10,
    color: '#BBF7D0',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardsWrap: {
    marginTop: 2,
  },
  sectionBlock: {
    marginTop: 8,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    ...Platform.select({

      android: { elevation: 3 },

      ios: {},

    }),
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    gap: 2,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 24,
    color: '#1E293B',
    letterSpacing: -0.5,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '600',
  },
  statSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  percentSign: {
    fontSize: 14,
    color: '#1E293B',
    marginLeft: 4,
    marginBottom: 2,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    color: '#1E293B',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  sectionSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -2,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 68) / 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 9,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 2,
  },
  viewAllBtn: {
    fontSize: 13,
    color: '#3B82F6',
  },
  attendanceLoadingCard: {
    minHeight: 92,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceEmptyState: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  attendanceEmptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
  },
  scheduleType: {
    fontSize: 15,
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  scheduleInfo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusLabel: {
    fontSize: 11,
  },
});
