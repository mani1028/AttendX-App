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
  Dimensions,
  Image,
  ActivityIndicator,
  Text,
} from 'react-native';
import Animated, {
  useSharedValue,
} from 'react-native-reanimated';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {
  Percent,
  CalendarCheck2,
  UserPlus,
  Heart,
  ClipboardEdit,
  Bell,
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
import AvatarBubble from '../../components/common/AvatarBubble';
import AccountSwitcher from '../../components/common/AccountSwitcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTeacherProfile, getAssignedClasses, getAttendanceReport, getTeacherCapability } from '../../services/teacherService';
import { TeacherProfile as ApiTeacherProfile, TeacherCapability } from '../../types/api.types';
import { normalizePhotoUri } from '../../utils/normalizePhotoUri';

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

export default function TeacherDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
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
  const teacherFirstName = (userName || profile?.name || 'Teacher').split(' ')[0];

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
    { label: 'Attendance', icon: CalendarCheck2, color: Theme.colors.blue, route: 'TeacherAttendance' },
    { label: 'Records', icon: FileText, color: '#0ea5e9', route: 'TeacherViewAttendance' },
    { label: 'Vital Scan', icon: Heart, color: Theme.colors.error, route: 'TeacherVitalScan' },
    { label: 'Homework', icon: BookOpen, color: '#8b5cf6', route: 'TeacherHomeworkManagement' },
    { label: 'Marks', icon: ClipboardEdit, color: '#f59e0b', route: 'TeacherMarksEntry' },
    { label: 'Leave', icon: CalendarOff, color: Theme.colors.error, route: 'Leaves' },
    { label: 'My Attendance', icon: ClipboardList, color: '#8b5cf6', route: 'TeacherMyAttendance' },
    { label: 'Papers', icon: BookMarked, color: '#f59e0b', route: 'TeacherQuestionPapers' },
    ...(effectiveIsClassTeacher ? [
      { label: 'Face Review', icon: Scan, color: '#ec4899', route: 'TeacherFaceReview' },
      { label: 'Enrollment', icon: UserPlus, color: Theme.colors.success, route: 'TeacherStudentRegistration' },
      { label: 'Approvals', icon: BadgeCheck, color: Theme.colors.success, route: 'StudentRegistrationRequests' },
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboardData} tintColor={Theme.colors.primary} />}
      >
        <Animated.View style={[styles.headerWrapper]}>
          <LinearGradient
            colors={[Theme.colors.gradientStart, Theme.colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}
          >
            {/* Decorative circles */}
            <View style={styles.decCircle1} />
            <View style={styles.decCircle2} />

            <View style={{ paddingHorizontal: 20 }}>
              <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
                  {profilePhotoUrl && !profilePhotoError ? (
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      style={styles.avatar}
                      onError={() => setProfilePhotoError(true)}
                    />
                  ) : (
                    <AvatarBubble displayName={userName || 'T'} size={56} primaryColor={Theme.colors.card} />
                  )}
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                  <Text style={styles.welcomeText}>{greeting},</Text>
                  <Text style={styles.nameText}>{teacherFirstName} 👋</Text>
                  <Text style={styles.dateText}>{todayDateStr}</Text>
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.iconBtn}>
                  <Bell size={22} color={Theme.colors.card} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Today's Inspiration Banner */}
        <LinearGradient
          colors={['#1e3a8a', '#3b82f6']}
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
          <View style={styles.grid}>
            {quickActions.map((action, i) => {
              const ActionIcon = action.icon;
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.gridItem}
                  onPress={() => safeNavigate(navigation, action.route as any)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                    <ActionIcon size={26} color={action.color} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.actionText}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
                      onPress={() => navigation.navigate('TeacherAttendance')}
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

        <View style={{ height: insets.bottom + 140 }} />
      </ScrollView>
      <AccountSwitcher visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background },
  headerWrapper: {
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    overflow: 'hidden',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    marginHorizontal: -20,
  },
  header: {
    paddingHorizontal: 0,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { flex: 1, marginHorizontal: Theme.spacing.md },
  profileBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatar: { width: '100%', height: '100%' },
  welcomeText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  nameText: { color: Theme.colors.card, ...Theme.typography.h1, marginTop: 2 },
  dateText: { color: 'rgba(255,255,255,0.7)', ...Theme.typography.caption, marginTop: 2, fontWeight: '500' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 0 },
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

  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, justifyContent: 'space-between' },
  gridItem: {
    width: (SCREEN_WIDTH - 70) / 4,
    alignItems: 'center',
  },
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
    bottom: -30,
    left: -20,
  },
});
