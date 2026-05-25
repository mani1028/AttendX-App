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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/ionicons';
import { WebView } from 'react-native-webview';
import RNFS from 'react-native-fs';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import AvatarBubble from '../../components/common/AvatarBubble';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { safeNavigate } from '../../utils/navigationHelpers';
import Svg, { Path } from 'react-native-svg';
import {
  getStudentAttendance,
  getStudentProfile,
  getStudentProfilePhotoDataUri,
  getStudentProfilePhotoUrl,
  getQuestionPapers,
  downloadQuestionPaper
} from '../../services/studentService';
import { buildApiUrl } from '../../services/api';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from '../../utils/storage';

const getStudentPhotoCacheKey = (studentId: string, schoolCode: string): string | null => {
  if (!studentId) return null;
  return `profile_photo_url:student:${schoolCode || 'unknown'}:${studentId}`;
};

const arrayBufferToBase64 = (data: ArrayBuffer): string => {
  const runtimeBuffer = (globalThis as any).Buffer;
  if (runtimeBuffer?.from) {
    return runtimeBuffer.from(data).toString('base64');
  }

  const bytes = new Uint8Array(data);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  const btoaFn = (globalThis as any).btoa;
  if (typeof btoaFn === 'function') {
    return btoaFn(binary);
  }

  throw new Error('Base64 encoder is unavailable');
};

const getStudentDashboardCacheKey = (schoolCode: string, studentId: string): string | null => {
  if (!schoolCode || !studentId) return null;
  return `student_dashboard_cache:${schoolCode}:${studentId}`;
};

const normalizeDashboardPhotoUri = (value: string | null | undefined): string | null => {
  const uri = String(value || '').trim();
  if (!uri) return null;
  if (
    uri.startsWith('data:') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('file://') ||
    uri.startsWith('content://')
  ) {
    return uri;
  }
  if (uri.startsWith('/')) {
    return buildApiUrl(uri);
  }
  if (uri.toLowerCase().startsWith('api/')) {
    return buildApiUrl(`/${uri}`);
  }
  return uri;
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
    safeNavigate(navigation as any, screen as any, params);
  };
  const [attendanceData, setAttendanceData] = useState({
    percentage: 0,
    presentDays: 0,
    absentDays: 0,
    totalDays: 0,
    halfDays: 0,
  });

  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [recentPapers, setRecentPapers] = useState<any[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const { unreadCount, refreshUnreadCount } = useUnreadNotifications();

  // Viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewingPaperUrl, setViewingPaperUrl] = useState<string | null>(null);
  const [viewingPaperTitle, setViewingPaperTitle] = useState('');
  const [loadingViewer, setLoadingViewer] = useState(false);

  const fetchData = async () => {
    let cacheUsed = false;

    try {
      refreshUnreadCount();

      const studentId = (await AsyncStorage.getItem('student_id')) || (await AsyncStorage.getItem('studentId')) || '';
      const schoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
      const cacheKey = getStudentDashboardCacheKey(schoolCode, studentId);

      if (cacheKey) {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached && isMounted.current) {
            const parsed = safeJsonParse<any>(cached, {});
            if (parsed.attendanceData) setAttendanceData(parsed.attendanceData);
            if (Array.isArray(parsed.recentAttendance)) setRecentAttendance(parsed.recentAttendance);
            if (Array.isArray(parsed.recentPapers)) setRecentPapers(parsed.recentPapers);
            cacheUsed = true;
            setLoading(false);
          }
        } catch (cacheError) {
          console.warn('Failed to load student dashboard cache:', cacheError);
        }
      }

      const [attendance, papersRes] = await Promise.all([
        getStudentAttendance(),
        getQuestionPapers(),
      ]);

      if (!isMounted.current) return;

      if (attendance) {
        const attendanceResponse = attendance as any;
        const attendanceItems = Array.isArray(attendance.items) ? attendance.items : [];
        const halfDayCount = attendanceItems.filter((item: any) => {
          const status = String(item?.status || '').toUpperCase();
          return status === 'LATE' || status === 'HALF_DAY' || status === 'HALF DAY';
        }).length;
        const totalDays = Number(
          attendanceResponse.totalDays ??
          attendanceResponse.total_days ??
          attendanceItems.length ??
          ((attendance.presentDays || 0) + (attendance.absentDays || 0) + halfDayCount)
        ) || 0;
        const attendanceData = {
          percentage: attendance.percentage || 0,
          presentDays: attendance.presentDays || 0,
          absentDays: attendance.absentDays || 0,
          totalDays,
          halfDays: Number(attendanceResponse.halfDays ?? attendanceResponse.half_days ?? halfDayCount) || 0,
        };
        setAttendanceData(attendanceData);
        if (attendanceItems.length > 0) {
          setRecentAttendance(attendanceItems);
        }

        if (cacheKey) {
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            attendanceData,
            recentAttendance: attendanceItems,
            recentPapers: [],
          }));
        }
      }

      if (papersRes?.subjects) {
        const allPapers: any[] = [];
        papersRes.subjects.forEach((sub: any) => {
          if (sub.papers) {
            sub.papers.forEach((p: any) => {
              allPapers.push({ ...p, subject_name: sub.subject_name });
            });
          }
        });
        const sortedPapers = allPapers.sort((a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        setRecentPapers(sortedPapers);

        if (cacheKey) {
          const cachedValue = await AsyncStorage.getItem(cacheKey);
          const cachedData = safeJsonParse<Record<string, any>>(cachedValue, {});
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            ...cachedData,
            recentPapers: sortedPapers,
          }));
        }
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Error fetching dashboard data:', error);
      }
      // Keep defaults on error
    } finally {
      if (isMounted.current) {
        if (!cacheUsed) {
          setLoading(false);
        }
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
        const normalizedProfilePhoto = normalizeDashboardPhotoUri(profilePhoto);

        if (normalizedProfilePhoto && isMounted.current) {
          setProfilePhotoUrl(normalizedProfilePhoto);
          setProfilePhotoError(false);
          if (scopedCacheKey) {
            await AsyncStorage.setItem(scopedCacheKey, normalizedProfilePhoto);
          }
          return;
        }

        if (scopedCacheKey) {
          const cached = await AsyncStorage.getItem(scopedCacheKey);
          const normalizedCached = normalizeDashboardPhotoUri(cached);
          if (normalizedCached && isMounted.current) {
            setProfilePhotoUrl(normalizedCached);
            setProfilePhotoError(false);
            return;
          }
        }

        const resolved = (await getStudentProfilePhotoDataUri()) || (await getStudentProfilePhotoUrl());
        const normalizedResolved = normalizeDashboardPhotoUri(resolved);
        if (normalizedResolved && isMounted.current) {
          setProfilePhotoUrl(normalizedResolved);
          setProfilePhotoError(false);
          if (scopedCacheKey) {
            await AsyncStorage.setItem(scopedCacheKey, normalizedResolved);
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

  const handleViewPaper = async (paperId: string, title: string) => {
    setLoadingViewer(true);
    setViewingPaperTitle(title);
    try {
      const buffer = await downloadQuestionPaper(paperId);
      const base64 = arrayBufferToBase64(buffer);
      const safeName = (title || `paper_${paperId}`).replace(/[^a-z0-9_.-]/gi, '_');
      const fileName = `${safeName}.pdf`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, base64, 'base64');

      // Use Share to open with an external PDF viewer (more reliable on mobile)
      try {
        const Share = require('react-native-share').default;
        const exists = await RNFS.exists(filePath);
        if (!exists) throw new Error('Written file not found');
        await Share.open({ url: Platform.OS === 'android' ? `file://${filePath}` : filePath, type: 'application/pdf', title: title || 'Question Paper' });
      } catch (shareErr) {
        const message = String(shareErr?.message || '');
        if (message.includes('User did not share') || message.includes('cancel')) {
          // user cancelled sharing - silently ignore
        } else {
          // Fallback: expose modal with WebView using data URI if Share fails
          const dataUri = `data:application/pdf;base64,${base64}`;
          setViewingPaperUrl(dataUri);
          setViewerVisible(true);
        }
      }
    } catch (error) {
      console.error('Error viewing paper:', error);
    } finally {
      setLoadingViewer(false);
    }
  };

  const stats = [
    { label: 'Total days', value: String(attendanceData.totalDays) },
    { label: 'Present', value: String(attendanceData.presentDays) },
    { label: 'Half Day', value: String(attendanceData.halfDays) },
    { label: 'Absent', value: String(attendanceData.absentDays) },
  ];

  const quickAccess = [
    { name: 'Homework', icon: 'clipboard', color: '#fdf2f8', iconColor: '#db2777', screen: 'StudentHomework' },
    { name: 'Attendance', icon: 'list', color: '#fef2f2', iconColor: '#ef4444', screen: 'StudentAttendance' },
    { name: 'Calendar', icon: 'calendar-outline', color: '#ecfdf5', iconColor: '#10b981', screen: 'CalendarManagement' },
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 180 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + 14 }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigateRoot('Profile')}>
              {profilePhotoUrl && !profilePhotoError ? (
                <Image
                  source={{ uri: profilePhotoUrl }}
                  style={styles.avatar}
                  onError={() => setProfilePhotoError(true)}
                />
              ) : (
                /* Use your initials component instead of the random URL */
                <AvatarBubble
                  displayName={userName || 'Student'}
                  size={40}
                  textSize={16}
                  primaryColor="#2563eb"
                />
              )}
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

          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <View key={`stat-${i}`} style={styles.statCard}>
                <AppText style={styles.statLabel}>{stat.label}</AppText>
                <AppText style={styles.statValue}>{stat.value}</AppText>
              </View>
            ))}
          </View>

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
              <AppText style={styles.sectionTitle}>Recent Question Papers</AppText>
              <TouchableOpacity onPress={() => navigation.navigate('StudentQuestionPapers')}>
                <AppText style={styles.viewAll}>View All</AppText>
              </TouchableOpacity>
            </View>
            {recentPapers.length > 0 ? (
              recentPapers.map((paper, index) => (
                <View key={index} style={styles.paperCardRow}>
                  <View style={[styles.activityIcon, { backgroundColor: '#eff6ff' }]}>
                    <Icon name="document-text" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.activityInfo}>
                    <AppText style={styles.activityTitle} numberOfLines={1}>{paper.title}</AppText>
                    <AppText style={styles.activityDate}>
                      {paper.subject_name} • {paper.exam_type}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    style={styles.viewPaperBtn}
                    onPress={() => handleViewPaper(paper.paper_id, paper.title)}
                  >
                    <AppText style={styles.viewPaperBtnText}>View</AppText>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.activityCard}>
                 <AppText style={styles.activityDetail}>No recent papers found.</AppText>
              </View>
            )}
          </View>

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

        <View style={{ height: insets.bottom + 140 }} />
      </ScrollView>

      {/* PDF Viewer Modal */}
      <Modal
        visible={viewerVisible}
        animationType="slide"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <View style={[styles.viewerHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              onPress={() => setViewerVisible(false)}
              style={styles.viewerCloseBtn}
            >
              <Icon name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
            <AppText style={styles.viewerTitle} numberOfLines={1}>{viewingPaperTitle}</AppText>
            <View style={{ width: 40 }} />
          </View>
          {viewingPaperUrl && (
            <WebView
              source={{ uri: viewingPaperUrl }}
              style={{ flex: 1 }}
              originWhitelist={['*']}
              scalesPageToFit
            />
          )}
        </View>
      </Modal>

      {loadingViewer && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <AppText style={styles.loaderText}>Opening paper...</AppText>
        </View>
      )}
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    width: '48%',
    minHeight: 84,
    marginBottom: 12,
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
  paperCardRow: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  viewPaperBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewPaperBtnText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  viewerCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
