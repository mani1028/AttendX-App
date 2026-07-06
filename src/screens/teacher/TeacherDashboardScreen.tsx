import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import LinearGradient from 'react-native-linear-gradient';
import {
  Percent,
  CalendarCheck2,
  UserPlus,
  Heart,
  ClipboardEdit,
  BookOpen,
  BadgeCheck,
  Scan,
  ChevronRight,
  FileText,
  CalendarOff,
  ClipboardList,
  BookMarked,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import type { RootStackParamList } from '../../navigation/types';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { safeNavigate } from '../../utils/navigationHelpers';
import AccountSwitcher from '../../components/common/AccountSwitcher';
import DashboardHeroHeader from '../../components/dashboard/DashboardHeroHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import QuickActionGrid, { QuickActionItem } from '../../components/dashboard/QuickActionGrid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTeacherProfile, getAssignedClasses, getAttendanceReport, getTeacherCapability } from '../../services/teacherService';
import { TeacherProfile as ApiTeacherProfile, TeacherCapability } from '../../types/api.types';
import { normalizePhotoUri } from '../../utils/normalizePhotoUri';

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

export default function TeacherDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tabBarScrollPadding = useTabBarScrollPadding();
  const { userName, setTabBarVisible, isClassTeacher: authIsClassTeacher } = useAuth();

  const isMounted = useRef(true);
  const lastScrollY = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('profile_photo_url').then(url => {
      const normalized = normalizePhotoUri(url);
      if (normalized && isMounted.current) { setProfilePhotoUrl(normalized); }
    }).catch(() => { });
  }, []);
  const [capability, setCapability] = useState<TeacherCapability | null | undefined>(undefined);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const { unreadCount, refreshUnreadCount } = useUnreadNotifications();
  const [attendanceStats, setAttendanceStats] = useState<{
    present: number;
    absent: number;
    rate: number;
    className: string;
    section: string;
  }>({
    present: 0,
    absent: 0,
    rate: 0,
    className: '',
    section: '',
  });
  const scrollY = useSharedValue(0);
  const effectiveIsClassTeacher = (capability !== undefined)
    ? Boolean(capability?.is_class_teacher)
    : Boolean(profile?.is_class_teacher || authIsClassTeacher);

  const fetchDashboardData = useCallback(async () => {
    try {
      const responseData = await getTeacherProfile();
      if (responseData && isMounted.current) {
        setProfile(responseData);
        const resolvedPhoto = responseData.profile_photo_url || responseData.teacher_photograph;
        const normalizedPhoto = normalizePhotoUri(resolvedPhoto);
        if (normalizedPhoto) {
          setProfilePhotoUrl(normalizedPhoto);
          setProfilePhotoError(false);
          AsyncStorage.setItem('profile_photo_url', normalizedPhoto).catch(() => { });
        }

        const schoolCode = responseData.school_code || (await AsyncStorage.getItem('school_code')) || '';
        const branchId = responseData.branch_id || (await AsyncStorage.getItem('branch_id')) || '';
        const employeeId = responseData.employee_id || (await AsyncStorage.getItem('employee_id')) || '';

        if (schoolCode && employeeId) {
          try {
            const cap = await getTeacherCapability(schoolCode, employeeId);
            if (cap && cap.user && isMounted.current) {
              setCapability(cap.user);
            }
          } catch (err) {
            console.error('Error fetching teacher capability:', err);
          }
        }

        if (schoolCode && branchId && employeeId) {
          try {
            const classes = await getAssignedClasses(schoolCode, branchId, employeeId);
            if (isMounted.current) {
              setAssignedClasses(classes);
            }
            const targetClass = classes.find(c => c.class_grade && c.section) || classes[0];
            if (targetClass && targetClass.class_grade && targetClass.section) {
              const todayDateYMD = new Date().toISOString().split('T')[0];
              const report = await getAttendanceReport(
                schoolCode,
                branchId,
                todayDateYMD,
                targetClass.class_grade,
                targetClass.section
              );

              const presentList = Array.isArray(report?.present) ? report.present : [];
              const absentList = Array.isArray(report?.absent) ? report.absent : [];
              const total = presentList.length + absentList.length;
              const rate = total > 0 ? Math.round((presentList.length / total) * 100) : 0;

              if (isMounted.current) {
                setAttendanceStats({
                  present: presentList.length,
                  absent: absentList.length,
                  rate,
                  className: targetClass.class_grade,
                  section: targetClass.section,
                });
              }
            }
          } catch (err) {
            console.error('Error fetching stats for dashboard:', err);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      fetchDashboardData();
      refreshUnreadCount();
      setTabBarVisible(true);
      return () => { isMounted.current = false; };
    }, [fetchDashboardData, refreshUnreadCount, setTabBarVisible])
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    scrollY.value = currentScrollY;
    if (currentScrollY > lastScrollY.current + 20 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 20) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const quickActions = [
    { label: 'Attendance', icon: CalendarCheck2, bg: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', route: 'TeacherAttendance' },
    { label: 'Records', icon: FileText, bg: 'rgba(14, 165, 233, 0.08)', color: '#0ea5e9', route: 'TeacherViewAttendance' },
    { label: 'Vital Scan', icon: Heart, bg: 'rgba(220, 38, 38, 0.08)', color: '#dc2626', route: 'TeacherVitalScan' },
    { label: 'Homework', icon: BookOpen, bg: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6', route: 'TeacherHomeworkManagement' },
    { label: 'Marks', icon: ClipboardEdit, bg: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', route: 'TeacherMarksEntry' },
    { label: 'Leave', icon: CalendarOff, bg: 'rgba(244, 63, 94, 0.08)', color: '#f43f5e', route: 'TeacherLeaveRequest' },
    { label: 'My Attendance', icon: ClipboardList, bg: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed', route: 'TeacherMyAttendance' },
    { label: 'Papers', icon: BookMarked, bg: 'rgba(249, 115, 22, 0.08)', color: '#f97316', route: 'TeacherQuestionPapers' },
    ...(effectiveIsClassTeacher ? [
      { label: 'Face Review', icon: Scan, bg: 'rgba(236, 72, 153, 0.08)', color: '#ec4899', route: 'TeacherFaceReview' },
      { label: 'Enrollment', icon: UserPlus, bg: 'rgba(34, 197, 94, 0.08)', color: '#22c55e', route: 'TeacherStudentRegistration' },
      { label: 'Approvals', icon: BadgeCheck, bg: 'rgba(6, 182, 212, 0.08)', color: '#06b6d4', route: 'StudentRegistrationRequests' },
    ] : []),
  ];

  const todayDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>


      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarScrollPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboardData} tintColor={Theme.colors.primary} />}
      >
        <DashboardHeroHeader
          userName={userName || profile?.name || 'Teacher'}
          greetingLine={greeting.toUpperCase()}
          subtitle={todayDateStr}
          unreadCount={unreadCount}
          onAvatarPress={() => navigation.navigate('Profile')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          photoUri={profilePhotoUrl}
          photoError={profilePhotoError}
          onPhotoError={() => setProfilePhotoError(true)}
          fullBleed
        />

        <View style={innerPageLayoutStyles.contentFront}>
        {/* Today's Inspiration Banner */}
        <LinearGradient
          colors={[HEADER_CONSTANTS.GRADIENT_START, HEADER_CONSTANTS.GRADIENT_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quoteBanner}
        >
          <View style={styles.quoteHeader}>
            <Sparkles size={16} color="rgba(255,255,255,0.8)" style={{ marginRight: 6 }} />
            <Text style={styles.quoteLabel}>Today's Inspiration</Text>
          </View>
          <Text style={styles.quoteText}>
            "Education is the most powerful weapon which you can use to change the world."
          </Text>
          <Text style={styles.quoteAuthor}>— Nelson Mandela</Text>
        </LinearGradient>

        {/* Unified Analytics Card */}
        {effectiveIsClassTeacher && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {attendanceStats.className ? `Class ${attendanceStats.className}-${attendanceStats.section} Overview` : 'Overview'}
              </Text>
              <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => navigation.navigate('TeacherViewAttendance')}>
                <Text style={styles.linkText}>Details</Text>
                <ChevronRight size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            <View style={styles.analyticsCard}>
              <View style={styles.analyticsTop}>
                <View>
                  <Text style={styles.analyticsLabel}>Attendance Rate</Text>
                  <Text style={styles.analyticsMainValue}>{attendanceStats.rate}%</Text>
                </View>
                <View style={[styles.analyticsIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Percent size={24} color="#2563EB" />
                </View>
              </View>

              {/* Simple Horizontal Progress Bar instead of ring for robustness */}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${attendanceStats.rate}%` }]} />
              </View>

              <View style={styles.analyticsDivider} />

              <View style={styles.analyticsBottomRow}>
                <View style={styles.analyticsStatBox}>
                  <View style={[styles.miniDot, { backgroundColor: Theme.colors.success }]} />
                  <View>
                    <Text style={styles.analyticsStatValue}>{attendanceStats.present}</Text>
                    <Text style={styles.analyticsStatLabel}>Present</Text>
                  </View>
                </View>

                <View style={styles.analyticsStatBox}>
                  <View style={[styles.miniDot, { backgroundColor: '#DC2626' }]} />
                  <View>
                    <Text style={styles.analyticsStatValue}>{attendanceStats.absent}</Text>
                    <Text style={styles.analyticsStatLabel}>Absent</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={{ height: 12 }} />
          <QuickActionGrid>
            {quickActions.map((action, i) => {
              const ActionIcon = action.icon;
              return (
                <QuickActionItem key={i}>
                  <TouchableOpacity
                    style={styles.gridItemInner}
                    onPress={() => safeNavigate(navigation, action.route as any)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                      <ActionIcon size={26} color={action.color} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.actionText}>{action.label}</Text>
                  </TouchableOpacity>
                </QuickActionItem>
              );
            })}
          </QuickActionGrid>
        </View>

        {/* Quick Stats Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={{ height: 12 }} />
          <View style={styles.statsRow}>
            <View style={[styles.statsCard, { borderLeftColor: '#3B82F6' }]}>
              <Users size={20} color="#3B82F6" />
              <Text style={styles.statsValue}>{assignedClasses.length || 0}</Text>
              <Text style={styles.statsLabel}>Classes</Text>
            </View>
            <View style={[styles.statsCard, { borderLeftColor: '#8B5CF6' }]}>
              <BookOpen size={20} color="#8B5CF6" />
              <Text style={styles.statsValue}>{new Set(assignedClasses.map((c: any) => c.subject_name).filter(Boolean)).size || 0}</Text>
              <Text style={styles.statsLabel}>Subjects</Text>
            </View>
            {effectiveIsClassTeacher && (
              <View style={[styles.statsCard, { borderLeftColor: attendanceStats.rate >= 75 ? Theme.colors.success : '#EF4444' }]}>
                <Percent size={20} color={attendanceStats.rate >= 75 ? Theme.colors.success : '#EF4444'} />
                <Text style={styles.statsValue}>{attendanceStats.rate}%</Text>
                <Text style={styles.statsLabel}>Rate</Text>
              </View>
            )}
          </View>
        </View>


        {/* My Classes & Subjects Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Classes & Subjects</Text>
          </View>
          <View style={{ height: 4 }} />
          {assignedClasses.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={280 + 16}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={styles.classesScrollContent}
            >
              {assignedClasses.map((item, idx) => (
                <View key={idx} style={styles.classCard}>
                  <View style={styles.classCardHeader}>
                    <View style={styles.classBadge}>
                      <BookOpen size={14} color="#1e3a8a" />
                      <Text style={styles.classBadgeText}>Grade {item.class_grade}-{item.section}</Text>
                    </View>
                    <View style={styles.subjectBadge}>
                      <Text style={styles.subjectBadgeText}>{item.subject_name || 'General'}</Text>
                    </View>
                  </View>

                  <Text style={styles.classCardTitle}>
                    Class {item.class_grade} ({item.section})
                  </Text>

                  <View style={styles.classCardStats}>
                    <View style={styles.classCardStatItem}>
                      <Text style={styles.classCardStatLabel}>Main Subject</Text>
                      <Text style={styles.classCardStatValue}>{item.subject_name || 'General'}</Text>
                    </View>
                  </View>

                  <View style={styles.classCardDivider} />

                  <View style={styles.classCardFooter}>
                    <TouchableOpacity
                      style={[styles.classCardBtn, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => navigation.navigate('TeacherViewAttendance', {
                        class_grade: String(item.class_grade || ''),
                        section: String(item.section || ''),
                      })}
                    >
                      <CalendarCheck2 size={14} color="#3B82F6" />
                      <Text style={[styles.classCardBtnText, { color: '#3B82F6' }]}>Attendance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.classCardBtn, { backgroundColor: '#F5F3FF' }]}
                      onPress={() => navigation.navigate('TeacherMarksEntry')}
                    >
                      <ClipboardEdit size={14} color="#8B5CF6" />
                      <Text style={[styles.classCardBtnText, { color: '#8B5CF6' }]}>Marks</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noClassesCard}>
              <BookMarked size={28} color="#94A3B8" />
              <Text style={styles.noClassesTitle}>No classes assigned</Text>
              <Text style={styles.noClassesDesc}>Contact the school administrator to assign classes.</Text>
            </View>
          )}
        </View>

        </View>
      </ScrollView>
      <AccountSwitcher visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background },
  gridItemInner: { alignItems: 'center', width: '100%' },
  scrollContent: { paddingHorizontal: HEADER_CONSTANTS.DASHBOARD_HORIZONTAL, paddingTop: 0 },
  section: { marginBottom: 26 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 22, color: Theme.colors.text, fontWeight: '800' },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: Theme.spacing.sm, borderRadius: 20 },
  linkText: { color: '#3B82F6', ...Theme.typography.body, fontWeight: '700', marginRight: 2 },

  /* Unified Analytics Card Styles */
  analyticsCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  analyticsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  analyticsLabel: { ...Theme.typography.body, color: Theme.colors.textSec, fontWeight: '600' },
  analyticsMainValue: { fontSize: 36, color: '#1E293B', fontWeight: '800', marginTop: Theme.spacing.xs },
  analyticsIconWrap: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  progressBarContainer: { height: 10, backgroundColor: Theme.colors.background, borderRadius: 5, marginTop: 20, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 5 },
  analyticsDivider: { height: 1, backgroundColor: Theme.colors.background, marginVertical: 20 },
  analyticsBottomRow: { flexDirection: 'row', justifyContent: 'space-around' },
  analyticsStatBox: { flexDirection: 'row', alignItems: 'center' },
  miniDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  analyticsStatValue: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  analyticsStatLabel: { fontSize: 13, color: Theme.colors.textSec, fontWeight: '600', marginTop: 2 },

  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  actionText: {
    ...Theme.typography.label,
    color: '#1E293B',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 14,
  },

  /* Today's Inspiration Banner Styles */
  quoteBanner: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 26,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  quoteText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 8,
  },

  /* My Classes Slider Styles */
  classesScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 16,
  },
  classCard: {
    width: 280,
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  classBadgeText: {
    color: '#1e3a8a',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  subjectBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subjectBadgeText: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '600',
  },
  classCardTitle: {
    fontSize: 18,
    color: Theme.colors.text,
    fontWeight: '800',
    marginBottom: 6,
  },
  classCardStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  classCardStatItem: {
    flex: 1,
  },
  classCardStatLabel: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  classCardStatValue: {
    fontSize: 13,
    color: Theme.colors.textSec,
    fontWeight: '700',
    marginTop: 2,
  },
  classCardDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 12,
  },
  classCardFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  classCardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  classCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noClassesCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  noClassesTitle: {
    fontSize: 16,
    color: Theme.colors.text,
    fontWeight: '700',
    marginTop: 8,
  },
  noClassesDesc: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  /* Quick Stats Summary */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    gap: 4,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  statsLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
