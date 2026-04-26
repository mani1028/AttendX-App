import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/ionicons';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import { colors } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Svg, { Path } from 'react-native-svg';
import { getStudentAttendance } from '../../services/studentService';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import API from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function StudentDashboardScreen() {
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
  const [attendanceData, setAttendanceData] = useState({
    percentage: 0,
    presentDays: 0,
    absentDays: 0,
    totalDays: 0,
  });

  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
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
    { name: 'Live Class', icon: 'videocam', color: '#f5f3ff', iconColor: '#8b5cf6', screen: 'VideoMeeting', params: { roomName: 'AttendX-General-Class', displayName: userName || 'Student' } },
    { name: 'Assignments', icon: 'clipboard', color: '#fdf2f8', iconColor: '#db2777', screen: 'StudentHomework' },
    { name: 'Attendance', icon: 'list', color: '#fef2f2', iconColor: '#ef4444', screen: 'StudentAttendance' },
    { name: 'Results', icon: 'stats-chart', color: '#ecfeff', iconColor: '#06b6d4', screen: 'StudentMarks' },
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?u=mani' }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="notifications-outline" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <AppText style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <AppText style={styles.greeting}>HI {userName?.split(' ')[0] || 'Student'} 👋</AppText>
          <AppText style={styles.subGreeting}>Here's your academic overview.</AppText>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>Quick Access</AppText>
            <TouchableOpacity>
              <AppText style={styles.viewAll}>View All</AppText>
            </TouchableOpacity>
          </View>
          <View style={styles.quickAccessGrid}>
            {quickAccess.map((item, i) => (
              <TouchableOpacity
                key={`quick-${i}`}
                style={styles.gridItem}
                onPress={() => item.screen && navigation.navigate(item.screen as any, (item as any).params)}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                  <Icon name={item.icon} size={24} color={item.iconColor} />
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

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#001a3d',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    borderColor: '#001a3d',
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
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  subGreeting: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsScroll: {
    marginTop: 20,
    flexDirection: 'row',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginRight: 12,
    width: 100,
  },
  attendancePctCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  chartPlaceholder: {
    width: 100,
    height: 40,
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  viewAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  gridLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
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
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    marginTop: 2,
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
