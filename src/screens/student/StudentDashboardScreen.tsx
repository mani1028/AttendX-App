import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/ionicons';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { safeNavigate } from '../../utils/navigationHelpers';
import Svg, { Path } from 'react-native-svg';
import { getStudentAttendance, getStudentProfile, getStudentProfilePhotoDataUri, getStudentProfilePhotoUrl } from '../../services/studentService';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getStudentPhotoCacheKey = (studentId: string, schoolCode: string): string | null => {
  if (!studentId) return null;
  return `profile_photo_url:student:${schoolCode || 'unknown'}:${studentId}`;
};

export default function StudentDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName, setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const lastScrollY = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;

    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }

    lastScrollY.current = currentScrollY;
  };
  const navigateRoot = (screen: keyof RootStackParamList, params?: any) => {
    safeNavigate(navigation as any, screen, params);
  };
  const [attendanceData, setAttendanceData] = useState({
    percentage: 0,
    presentDays: 0,
    absentDays: 0,
    totalDays: 0,
  });

  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const { unreadCount, refreshUnreadCount } = useUnreadNotifications();

  const fetchData = async () => {
    try {
      refreshUnreadCount();
      const attendance = await getStudentAttendance();
      if (!isMounted.current) return;
      if (attendance) {
        setAttendanceData({
          percentage: attendance.percentage || 0,
          presentDays: attendance.presentDays || 0,
          absentDays: attendance.absentDays || 0,
          totalDays: (attendance.presentDays || 0) + (attendance.absentDays || 0),
        });
        if (attendance.items) {
          setRecentAttendance(attendance.items);
        }
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Error fetching dashboard data:', error);
      }
      // Keep defaults on error
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const loadProfilePhoto = async () => {
      try {
        const studentId = (await AsyncStorage.getItem('student_id')) || (await AsyncStorage.getItem('studentId')) || '';
        const schoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
        const scopedCacheKey = getStudentPhotoCacheKey(studentId, schoolCode);

        const freshProfile = await getStudentProfile();
        const profilePhoto = String(
          (freshProfile as any)?.profile_photo_url ||
          (freshProfile as any)?.student_photograph ||
          ''
        ).trim();

        if (profilePhoto && isMounted.current) {
          setProfilePhotoUrl(profilePhoto);
          setProfilePhotoError(false);
          if (scopedCacheKey) {
            await AsyncStorage.setItem(scopedCacheKey, profilePhoto);
          }
          return;
        }

        if (scopedCacheKey) {
          const cached = await AsyncStorage.getItem(scopedCacheKey);
          if (cached && isMounted.current) {
            setProfilePhotoUrl(cached);
            setProfilePhotoError(false);
            return;
          }
        }

        const resolved = (await getStudentProfilePhotoDataUri()) || (await getStudentProfilePhotoUrl());
        if (resolved && isMounted.current) {
          setProfilePhotoUrl(resolved);
          setProfilePhotoError(false);
          if (scopedCacheKey) {
            await AsyncStorage.setItem(scopedCacheKey, resolved);
          }
        }
      } catch {
        // Keep initials/photo fallback behavior when photo endpoint is unavailable.
      }
    };

    loadProfilePhoto();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const stats = [
    { label: 'Total days', value: String(attendanceData.totalDays) },
    { label: 'Present', value: String(attendanceData.presentDays) },
    { label: 'Half Day', value: '0' },
    { label: 'Absent', value: String(attendanceData.absentDays) },
  ];

  const quickAccess = [
    { name: 'Homework', icon: 'clipboard', color: '#fdf2f8', iconColor: '#db2777', screen: 'StudentHomework' },
    { name: 'Attendance', icon: 'list', color: '#fef2f2', iconColor: '#ef4444', screen: 'StudentAttendance' },
    { name: 'Marks', icon: 'stats-chart', color: '#ecfeff', iconColor: '#06b6d4', screen: 'StudentMarks' },
    { name: 'Leaves', icon: 'calendar', color: '#eef2ff', iconColor: '#6366f1', screen: 'StudentLeave' },
    { name: 'Fees', icon: 'wallet', color: '#fff7ed', iconColor: '#f97316', screen: 'StudentFee' },
    { name: 'Papers', icon: 'document-text', color: '#f0fdf4', iconColor: '#22c55e', screen: 'StudentQuestionPapers' },
    { name: 'Notices', icon: 'notifications', color: '#fff1f2', iconColor: '#f43f5e', screen: 'Notifications' },
    { name: 'Profile', icon: 'person', color: '#f5f3ff', iconColor: '#8b5cf6', screen: 'Profile' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#001a3d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F50" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + 14 }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigateRoot('Profile')}>
              <Image
                source={{ uri: profilePhotoUrl && !profilePhotoError ? profilePhotoUrl : 'https://i.pravatar.cc/150?u=student' }}
                style={styles.avatar}
                onError={() => setProfilePhotoError(true)}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigateRoot('Notifications')}
            >
              <Icon name="notifications-outline" size={22} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <AppText style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeSection}>
            <View>
              <AppText style={styles.greeting}>HI {userName?.split(' ')[0] || 'student'} 👋</AppText>
              <AppText style={styles.subGreeting}>Here's your academic overview.</AppText>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsGrid}
          >
            {stats.map((stat, i) => (
              <View key={`stat-${i}`} style={styles.statCard}>
                <AppText style={styles.statLabel}>{stat.label}</AppText>
                <AppText style={styles.statValue}>{stat.value}</AppText>
              </View>
            ))}
          </ScrollView>

          <View style={styles.attendancePctCard}>
            <View>
              <AppText style={styles.statLabel}>Attendance %</AppText>
              <AppText style={styles.statValue}>{attendanceData.percentage}%</AppText>
            </View>
            <View style={styles.chartPlaceholder}>
               <Svg height="40" width="100" viewBox="0 0 100 40">
                  <Path
                    d="M0 35 Q 25 35, 50 20 T 100 5"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                  />
               </Svg>
            </View>
          </View>
        </View>


        <View style={styles.contentContainer}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>Quick Access</AppText>
              {/* <TouchableOpacity>
                <AppText style={styles.viewAll}>View All</AppText>
              </TouchableOpacity> */}
            </View>
            <View style={styles.quickAccessGrid}>
                  {quickAccess.map((item, i) => (
                <TouchableOpacity
                  key={`quick-${i}`}
                  style={styles.gridItem}
                      onPress={() => item.screen && navigateRoot(item.screen as any, (item as any).params)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                    <Icon name={item.icon as any} size={24} color={item.iconColor} />
                  </View>
                  <AppText style={styles.gridLabel}>{item.name}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>Recent Activity</AppText>
              <TouchableOpacity onPress={() => navigation.navigate('StudentAttendance')}>
                <AppText style={styles.viewAll}>View All</AppText>
              </TouchableOpacity>
            </View>
            {recentAttendance.length > 0 ? (
              recentAttendance.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.activityCardRow}>
                  <View style={[styles.activityIcon, { backgroundColor: item.status?.toLowerCase() === 'present' ? '#dcfce7' : '#fee2e2' }]}>
                    <Icon
                      name={item.status?.toLowerCase() === 'present' ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={item.status?.toLowerCase() === 'present' ? "#15803d" : "#b91c1c"}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <AppText style={styles.activityTitle}>Attendance Marked</AppText>
                    <AppText style={styles.activityDate}>
                      {new Date(item.attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </AppText>
                  </View>
                  <AppText style={[styles.activityStatus, { color: item.status?.toLowerCase() === 'present' ? "#15803d" : "#b91c1c" }]}>
                    {item.status}
                  </AppText>
                </View>
              ))
            ) : (
              <View style={styles.activityCard}>
                 <AppText style={styles.activityDetail}>No recent activity found.</AppText>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: insets.bottom + 88 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f5f9',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    backgroundColor: '#001F50',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  welcomeSection: {
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#22c55e',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    borderWidth: 1,
    borderColor: '#001F50',
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
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    lineHeight: 36,
  },
  subGreeting: {
    fontSize: 14,
    color: 'rgba(248,250,252,0.68)',
    marginTop: 2,
    fontWeight: '600',
  },
  statsGrid: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
    paddingRight: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    width: 152,
    minHeight: 84,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  attendancePctCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
    lineHeight: 28,
  },
  chartPlaceholder: {
    width: 110,
    height: 40,
    justifyContent: 'center',
  },
  contentContainer: {
    marginTop: 6,
    backgroundColor: '#f3f5f9',
    paddingTop: 6,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
  },
  viewAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '700',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '24%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  activityCardRow: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  activityDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activityDetail: {
    fontSize: 12,
    color: '#64748b',
  },
});
