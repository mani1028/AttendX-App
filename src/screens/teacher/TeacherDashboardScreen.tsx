import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
  Dimensions,
  Image,
  ActivityIndicator
} from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
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
  ChevronRight,
  User,
  Briefcase,
  BookOpen,
  Mail,
  Hash,
  Video
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import { colors } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import API from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTeacherProfile, getTeacherProfilePhotoDataUri, getTeacherProfilePhotoUrl } from '../../services/teacherService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TeacherProfile {
  name: string;
  employee_id: string;
  designation: string;
  department_subject: string;
  email: string;
}

export default function TeacherDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName, setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const { unreadCount, refreshUnreadCount } = useUnreadNotifications();

  const lastScrollY = useRef(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      refreshUnreadCount();
      const responseData = await getTeacherProfile();
      if (responseData && isMounted.current) {
        setProfile(responseData);

        const teacherId = String(responseData.teacher_id || responseData.employee_id || '').trim();
        const schoolCode = String(responseData.school_code || '').trim();
        const scopedPhotoKey = teacherId ? `profile_photo_url:teacher:${schoolCode || 'unknown'}:${teacherId}` : null;

        if (scopedPhotoKey) {
          const scopedCachedPhoto = await AsyncStorage.getItem(scopedPhotoKey);
          if (scopedCachedPhoto) {
            setProfilePhotoUrl(scopedCachedPhoto);
            setProfilePhotoError(false);
          }
        } else {
          const cachedProfilePhoto = await AsyncStorage.getItem('profile_photo_url');
          if (cachedProfilePhoto) {
            setProfilePhotoUrl(cachedProfilePhoto);
            setProfilePhotoError(false);
          }
        }

        const directPhoto = String(responseData.profile_photo_url || responseData.teacher_photograph || '').trim();
        const normalizedDirectPhoto =
          directPhoto.startsWith('data:') ||
          directPhoto.startsWith('http://') ||
          directPhoto.startsWith('https://') ||
          directPhoto.startsWith('file://') ||
          directPhoto.startsWith('content://')
            ? directPhoto
            : (/^[A-Za-z0-9+/=_-]{80,}$/.test(directPhoto.replace(/\s+/g, ''))
                ? `data:image/jpeg;base64,${directPhoto.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')}`
                : directPhoto || null);

        const resolvedPhoto =
          normalizedDirectPhoto ||
          (await getTeacherProfilePhotoDataUri(teacherId, schoolCode)) ||
          (await getTeacherProfilePhotoUrl(teacherId, schoolCode)) ||
          null;

        if (resolvedPhoto) {
          setProfilePhotoUrl(resolvedPhoto);
          setProfilePhotoError(false);
          await AsyncStorage.setItem('profile_photo_url', resolvedPhoto);
          if (scopedPhotoKey) {
            await AsyncStorage.setItem(scopedPhotoKey, resolvedPhoto);
          }
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
      }
    }
  }, []);

  useEffect(() => {
    setTabBarVisible(true);
    isMounted.current = true;
    fetchDashboardData();
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, [fetchDashboardData, setTabBarVisible]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const stats = [
    { label: 'Total Students', value: '120', sub: 'All Classes', icon: Users, color: '#6366f1' },
    { label: 'Present Today', value: '112', sub: 'Live', icon: CheckCircle2, color: '#10b981' },
    { label: 'Absent Today', value: '8', sub: 'Total', icon: X, color: '#ef4444' },
    { label: 'Attendance %', value: '93%', sub: 'Avg', icon: Percent, color: '#f59e0b' },
  ];

  const quickActions = [
    { label: 'Mark Attendance', icon: CalendarCheck2, color: '#3b82f6', route: 'TeacherAttendance' },
    { label: 'Student Enrollment', icon: UserPlus, color: '#10b981', route: 'TeacherRegisterPublic' },
    { label: 'Manage Profiles', icon: Users2, color: '#8b5cf6', route: 'TeacherStudentList' },
    { label: 'Vital Scan AI', icon: Heart, color: '#ef4444', route: 'TeacherVitalScan' },
    { label: 'Leave Approval', icon: FileEdit, color: '#f59e0b', route: 'TeacherLeaveApproval' },
    { label: 'Question Paper', icon: ClipboardEdit, color: '#10b981', route: 'TeacherMarksEntry' },
  ];

  const schedule = [
    { title: 'Upcoming', class: 'Class 1 • Section A', status: 'Upcoming', statusColor: '#10b981', statusBg: '#f0fdf4' },
    { title: 'Completed', class: 'Class 1 • Section A', status: 'Finished', statusColor: '#f59e0b', statusBg: '#fffbeb' },
  ];

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#001F3F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Dark Navy Background Header */}
      <View style={styles.navyHeader} />

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {/* Profile & Notification */}
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.profileContainer}
            onPress={() => navigation.navigate('Profile')}
          >
            <Image
              source={{ uri: profilePhotoUrl && !profilePhotoError ? profilePhotoUrl : 'https://avatar.iran.liara.run/public/31' }}
              style={styles.profileImage}
              onError={() => setProfilePhotoError(true)}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell size={24} color="#fff" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <AppText weight="bold" style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <AppText weight="bold" style={styles.hiText}>Hi {userName?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Mahesh'} 👋</AppText>
          <AppText weight="semiBold" style={styles.subText}>Here's What's happening today.</AppText>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: stat.color + '15' }]}>
                <stat.icon size={22} color={stat.color} />
              </View>
              <View style={styles.statContent}>
                <AppText weight="bold" style={styles.statValue}>{stat.value}</AppText>
                <AppText weight="semiBold" style={styles.statLabel}>{stat.label}</AppText>
                <AppText weight="semiBold" style={styles.statSub}>{stat.sub}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <AppText weight="bold" style={styles.sectionTitle}>Quick Actions</AppText>
        </View>
        <View style={styles.quickActionGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionCard,
                action.label === 'Vital Scan AI' && styles.actionCardHighlighted
              ]}
              onPress={() => action.route && navigation.navigate(action.route as any)}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.color + '10' }]}>
                <action.icon size={24} color={action.color} strokeWidth={2} />
              </View>
              <AppText weight="bold" style={styles.actionLabel}>{action.label.replace(' ', '\n')}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Schedule */}
        <View style={styles.sectionHeader}>
          <AppText weight="bold" style={styles.sectionTitle}>Today's Schedule</AppText>
          <TouchableOpacity onPress={() => {}}>
            <AppText weight="bold" style={styles.viewAllBtn}>View All</AppText>
          </TouchableOpacity>
        </View>

        {schedule.map((item, index) => (
          <View key={index} style={styles.scheduleCard}>
            <View>
              <AppText weight="bold" style={styles.scheduleType}>{item.title}</AppText>
              <AppText weight="semiBold" style={styles.scheduleInfo}>{item.class}</AppText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.statusBg }]}>
              <AppText weight="bold" style={[styles.statusLabel, { color: item.statusColor }]}>{item.status}</AppText>
            </View>
          </View>
        ))}

        {/* Teacher Profile Section (Moved from top as requested) */}
        <AppText weight="bold" style={styles.sectionTitle}>Your Profile</AppText>
        <View style={styles.profileDetailsCard}>
          <View style={styles.profileInfoGrid}>
            <View style={styles.profileInfoItem}>
              <View style={[styles.infoIconWrapper, { backgroundColor: '#eef2ff' }]}>
                <Hash size={14} color="#6366f1" />
              </View>
              <View>
                <AppText weight="semiBold" style={styles.infoLabel}>Employee ID</AppText>
                <AppText weight="bold" style={styles.infoValue}>{profile?.employee_id || 'T-1002'}</AppText>
              </View>
            </View>
            <View style={styles.profileInfoItem}>
              <View style={[styles.infoIconWrapper, { backgroundColor: '#f0fdf4' }]}>
                <Briefcase size={14} color="#22c55e" />
              </View>
              <View>
                <AppText weight="semiBold" style={styles.infoLabel}>Designation</AppText>
                <AppText weight="bold" style={styles.infoValue}>{profile?.designation || 'Sr. Teacher'}</AppText>
              </View>
            </View>
            <View style={styles.profileInfoItem}>
              <View style={[styles.infoIconWrapper, { backgroundColor: '#fff7ed' }]}>
                <BookOpen size={14} color="#f97316" />
              </View>
              <View>
                <AppText weight="semiBold" style={styles.infoLabel}>Department</AppText>
                <AppText weight="bold" style={styles.infoValue}>{profile?.department_subject || 'Science'}</AppText>
              </View>
            </View>
            <View style={styles.profileInfoItem}>
              <View style={[styles.infoIconWrapper, { backgroundColor: '#fef2f2' }]}>
                <Mail size={14} color="#ef4444" />
              </View>
              <View>
                <AppText weight="semiBold" style={styles.infoLabel}>Email</AppText>
                <AppText weight="bold" style={styles.infoValue} numberOfLines={1}>{profile?.email || 'teacher@school.com'}</AppText>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  navyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: '#001F3F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#34D399',
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    marginBottom: 28,
  },
  hiText: {
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (SCREEN_WIDTH - 55) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  statIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statContent: {
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 2,
  },
  statSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 22,
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 85) / 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  actionCardHighlighted: {
    borderColor: '#3B82F6',
    borderWidth: 1.5,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 10,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 2,
  },
  profileDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  viewAllBtn: {
    fontSize: 16,
    color: '#3B82F6',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
  },
  scheduleType: {
    fontSize: 18,
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  scheduleInfo: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  statusLabel: {
    fontSize: 13,
  },
});
