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
  const { unreadCount, refreshUnreadCount } = useUnreadNotifications();

  const lastScrollY = useRef(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      refreshUnreadCount();
      const response = await API.get('profile/details');
      if (response.data && isMounted.current) {
        setProfile(response.data);
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
    { label: 'Total Students', value: '120', sub: 'All Classes', icon: Users, color: '#818cf8' },
    { label: 'Present Today', value: '112', sub: 'Live', icon: CheckCircle2, color: '#34d399' },
    { label: 'Absent Today', value: '8', sub: 'Total', icon: X, color: '#f87171' },
    { label: 'Attendance %', value: '93%', sub: 'Avg', icon: Percent, color: '#fbbf24' },
  ];

  const quickActions = [
    { label: 'Mark Attendance', icon: CalendarCheck2, color: '#3b82f6', route: 'TeacherAttendance' },
    { label: 'Live Class', icon: Video, color: '#8b5cf6', route: 'VideoMeeting', params: { roomName: 'AttendX-General-Class', displayName: userName || profile?.name || 'Teacher' } },
    { label: 'Enrollment', icon: UserPlus, color: '#10b981', route: 'TeacherRegisterPublic', params: { school_code: '', branch_id: '' } },
    { label: 'Manage Profiles', icon: Users2, color: '#6366f1', route: 'TeacherStudentList' },
    { label: 'Vital Scan AI', icon: Heart, color: '#ef4444', route: 'TeacherVitalScan' },
    { label: 'Leave Approval', icon: FileEdit, color: '#f59e0b', route: 'TeacherLeaveApproval' },
    { label: 'Question Paper', icon: ClipboardEdit, color: '#10b981', route: 'TeacherMarksEntry' },
    { label: 'My Profile', icon: User, color: '#64748b', route: 'Profile' },
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
              source={{ uri: 'https://avatar.iran.liara.run/public/31' }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell size={24} color="#fff" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <AppText style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <AppText style={styles.hiText}>Hi {userName?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Teacher'} 👋</AppText>
          <AppText style={styles.subText}>Here's What's happening today.</AppText>
        </View>

        {/* Profile Details Card - Same like Student Dashboard overview */}
        <View style={styles.profileDetailsCard}>
          <View style={styles.profileInfoGrid}>
            <View style={styles.profileInfoItem}>
              <View style={[styles.infoIconWrapper, { backgroundColor: '#eef2ff' }]}>
                <Hash size={16} color="#6366f1" />
              </View>
              <View>
                <AppText style={styles.infoLabel}>Employee ID</AppText>
                <AppText style={styles.infoValue}>{profile?.employee_id || 'T-1002'}</AppText>
              </View>
            </View>
            <View style={styles.profileInfoItem}>
              <View style={[styles.infoIconWrapper, { backgroundColor: '#f0fdf4' }]}>
                <Briefcase size={16} color="#22c55e" />
              </View>
              <View>
                <AppText style={styles.infoLabel}>Designation</AppText>
                <AppText style={styles.infoValue}>{profile?.designation || 'Sr. Teacher'}</AppText>
              </View>
            </View>
            <View style={styles.profileInfoItem}>
              <View style={[styles.infoIconWrapper, { backgroundColor: '#fff7ed' }]}>
                <BookOpen size={16} color="#f97316" />
              </View>
              <View>
                <AppText style={styles.infoLabel}>Department</AppText>
                <AppText style={styles.infoValue}>{profile?.department_subject || 'Science'}</AppText>
              </View>
            </View>
            <View style={styles.profileInfoItem}>
              <View style={[styles.infoIconWrapper, { backgroundColor: '#fef2f2' }]}>
                <Mail size={16} color="#ef4444" />
              </View>
              <View>
                <AppText style={styles.infoLabel}>Email</AppText>
                <AppText style={styles.infoValue} numberOfLines={1}>{profile?.email || 'teacher@school.com'}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: stat.color + '10' }]}>
                <stat.icon size={20} color={stat.color} />
              </View>
              <AppText style={styles.statValue}>{stat.value}</AppText>
              <AppText style={styles.statLabel}>{stat.label}</AppText>
              <AppText style={styles.statSub}>{stat.sub}</AppText>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <AppText style={styles.sectionTitle}>Quick Actions</AppText>
        <View style={styles.quickActionGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.route as any, action.params)}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.color + '08' }]}>
                <action.icon size={26} color={action.color} />
              </View>
              <AppText style={styles.actionLabel}>{action.label.replace(' ', '\n')}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Schedule */}
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>Today's Schedule</AppText>
          <TouchableOpacity>
            <AppText style={styles.viewAllBtn}>View All</AppText>
          </TouchableOpacity>
        </View>

        {schedule.map((item, index) => (
          <View key={index} style={styles.scheduleCard}>
            <View>
              <AppText style={styles.scheduleType}>{item.title}</AppText>
              <AppText style={styles.scheduleInfo}>{item.class}</AppText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.statusBg }]}>
              <AppText style={[styles.statusLabel, { color: item.statusColor }]}>{item.status}</AppText>
            </View>
          </View>
        ))}

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
    height: 380,
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
    marginBottom: 20,
  },
  profileContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#34D399',
    padding: 3,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
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
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#001F3F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  welcomeSection: {
    marginBottom: 20,
  },
  hiText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    fontWeight: '500',
  },
  profileDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  profileInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  profileInfoItem: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  statSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 36,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 76) / 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 18,
  },
  viewAllBtn: {
    fontSize: 16,
    fontWeight: '800',
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
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  scheduleInfo: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
