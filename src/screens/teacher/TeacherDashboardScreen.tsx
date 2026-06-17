import React, { useRef, useState, useCallback } from 'react';
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
  Text,
} from 'react-native';
import Animated, {
  useSharedValue
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
  CalendarOff
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/theme';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import type { RootStackParamList } from '../../navigation/types';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { safeNavigate } from '../../utils/navigationHelpers';
import AvatarBubble from '../../components/common/AvatarBubble';
import AccountSwitcher from '../../components/common/AccountSwitcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTeacherProfile, getAssignedClasses, getAttendanceReport } from '../../services/teacherService';
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

export default function TeacherDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { userName, setTabBarVisible, isClassTeacher: authIsClassTeacher } = useAuth();
  const isMounted = useRef(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [capability] = useState<TeacherCapability | null | undefined>(undefined);
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
  const lastScrollY = useRef(0);

  const effectiveIsClassTeacher = (capability !== undefined)
    ? Boolean(capability?.is_class_teacher)
    : Boolean(profile?.is_class_teacher || authIsClassTeacher);
  const teacherFirstName = (userName || profile?.name || 'Teacher').split(' ')[0];

  const fetchDashboardData = useCallback(async () => {
    try {
      const responseData = await getTeacherProfile();
      if (responseData && isMounted.current) {
        setProfile(responseData);
        if (responseData.profile_photo_url) {
          setProfilePhotoUrl(responseData.profile_photo_url);
        }

        const schoolCode = responseData.school_code || (await AsyncStorage.getItem('school_code')) || '';
        const branchId = responseData.branch_id || (await AsyncStorage.getItem('branch_id')) || '';
        const employeeId = responseData.employee_id || (await AsyncStorage.getItem('employee_id')) || '';

        if (schoolCode && branchId && employeeId) {
          try {
            const classes = await getAssignedClasses(schoolCode, branchId, employeeId);
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
    { label: 'Attendance', icon: CalendarCheck2, color: '#3b82f6', route: 'TeacherAttendance' },
    { label: 'Records', icon: FileText, color: '#0ea5e9', route: 'TeacherViewAttendance' },
    { label: 'Vital Scan', icon: Heart, color: '#ef4444', route: 'TeacherVitalScan' },
    { label: 'Homework', icon: BookOpen, color: '#8b5cf6', route: 'TeacherHomeworkManagement' },
    { label: 'Face Review', icon: Scan, color: '#ec4899', route: 'TeacherFaceReview' },
    { label: 'Marks', icon: ClipboardEdit, color: '#f59e0b', route: 'TeacherMarksEntry' },
    { label: 'Leave', icon: CalendarOff, color: '#ef4444', route: 'Leaves' },
    ...(effectiveIsClassTeacher ? [
      { label: 'Enrollment', icon: UserPlus, color: '#10b981', route: 'TeacherStudentRegistration' },
      { label: 'Approvals', icon: BadgeCheck, color: '#059669', route: 'StudentRegistrationRequests' },
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
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboardData} tintColor={Theme.colors.primary} />}
      >
        <Animated.View style={[styles.headerWrapper]}>
          <LinearGradient
            colors={['#1E3A8A', '#3B82F6']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={[styles.header, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
                {profilePhotoUrl ? (
                  <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
                ) : (
                  <AvatarBubble displayName={userName || 'T'} size={40} primaryColor="#FFF" />
                )}
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={styles.welcomeText}>{greeting},</Text>
                <Text style={styles.nameText}>{teacherFirstName} 👋</Text>
                <Text style={styles.dateText}>{todayDateStr}</Text>
              </View>

              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.iconBtn}>
                <Bell size={22} color="#FFF" />
                {unreadCount > 0 && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Unified Analytics Card */}
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
                <View style={[styles.miniDot, { backgroundColor: '#059669' }]} />
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

        <View style={{ height: insets.bottom + 140 }} />
      </ScrollView>
      <AccountSwitcher visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  headerWrapper: {
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    marginHorizontal: -20,
  },
  header: {
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { flex: 1, marginHorizontal: 16 },
  profileBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.4)' 
  },
  avatar: { width: '100%', height: '100%' },
  welcomeText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  nameText: { color: '#FFF', fontSize: 28, fontWeight: '800', marginTop: 2 },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2, fontWeight: '500' },
  iconBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  unreadDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#1E3A8A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 0 },
  section: { marginBottom: 26 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 22, color: '#0F172A', fontWeight: '800' },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  linkText: { color: '#3B82F6', fontSize: 14, fontWeight: '700', marginRight: 2 },
  
  /* Unified Analytics Card Styles */
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  analyticsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  analyticsLabel: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  analyticsMainValue: { fontSize: 36, color: '#1E293B', fontWeight: '800', marginTop: 4 },
  analyticsIconWrap: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  progressBarContainer: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, marginTop: 20, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 5 },
  analyticsDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  analyticsBottomRow: { flexDirection: 'row', justifyContent: 'space-around' },
  analyticsStatBox: { flexDirection: 'row', alignItems: 'center' },
  miniDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  analyticsStatValue: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  analyticsStatLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },

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
    marginBottom: 8
  },
  actionText: {
    fontSize: 11,
    color: '#1E293B',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 14
  },
});
