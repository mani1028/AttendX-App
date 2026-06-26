import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Bell,
  ChevronDown,
  ClipboardList,
  CalendarDays,
  FileText,
  BarChart3,
  CheckCircle2,
  XCircle,
  X,
  FileBox,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import RNFS from 'react-native-fs';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import AvatarBubble from '../../components/common/AvatarBubble';

import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import type { RootStackParamList } from '../../navigation/types';
import { safeNavigate } from '../../utils/navigationHelpers';
import Svg, { Path } from 'react-native-svg';
import {
  getStudentAttendance,
  getStudentProfile,
  getStudentProfilePhotoDataUri,
  getStudentProfilePhotoUrl,
  getQuestionPapers,
  downloadQuestionPaper,
} from '../../services/studentService';
import { normalizePhotoUri } from '../../utils/normalizePhotoUri';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from '../../utils/storage';
import AccountSwitcher from '../../components/common/AccountSwitcher';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getStudentPhotoCacheKey = (studentId: string, schoolCode: string): string | null => {
  if (!studentId) {return null;}
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
  if (!schoolCode || !studentId) {return null;}
  return `student_dashboard_cache:${schoolCode}:${studentId}`;
};

export default function StudentDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName, setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const handleScroll = useScrollTabBar();

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
      // First check if we actually have auth token and student role before fetching
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('role') || await AsyncStorage.getItem('userRole');
      if (!token || role?.toLowerCase() !== 'student') {
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
        return; // Prevent unauthorized requests if not a student
      }

      refreshUnreadCount();

      const studentId = ((await AsyncStorage.getItem('student_id')) || (await AsyncStorage.getItem('studentId')) || '').trim();
      const schoolCode = ((await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '').trim();
      const cacheKey = getStudentDashboardCacheKey(schoolCode, studentId);

      if (cacheKey) {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached && isMounted.current) {
            const parsed = safeJsonParse<any>(cached, {});
            if (parsed.attendanceData) {setAttendanceData(parsed.attendanceData);}
            if (Array.isArray(parsed.recentAttendance)) {setRecentAttendance(parsed.recentAttendance);}
            if (Array.isArray(parsed.recentPapers)) {setRecentPapers(parsed.recentPapers);}
            cacheUsed = true;
            setLoading(false);
          }
        } catch (cacheError) {
          console.warn('Failed to load student dashboard cache:', cacheError);
        }
      }

      const [attendanceResult, papersResResult] = await Promise.allSettled([
        getStudentAttendance(),
        getQuestionPapers(),
      ]);

      if (!isMounted.current) {return;}

      const updatedCacheData: any = {};

      if (attendanceResult.status === 'fulfilled' && attendanceResult.value) {
        const attendance = attendanceResult.value;
        const attendanceItems = Array.isArray(attendance.items) ? attendance.items : [];
        const newAttendanceData = {
          percentage: attendance.percentage || 0,
          presentDays: attendance.presentDays || 0,
          absentDays: attendance.absentDays || 0,
          totalDays: attendance.totalDays || 0,
          halfDays: attendance.halfDays || 0,
        };
        setAttendanceData(newAttendanceData);
        const limitedAttendance = attendanceItems
          .sort((a, b) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime())
          .slice(0, 10);

        if (attendanceItems.length > 0) {
          setRecentAttendance(limitedAttendance);
        }
        updatedCacheData.attendanceData = newAttendanceData;
        updatedCacheData.recentAttendance = limitedAttendance;
      } else if (attendanceResult.status === 'rejected') {
        console.warn('Failed to fetch student attendance:', attendanceResult.reason);
      }

      if (papersResResult.status === 'fulfilled' && papersResResult.value?.subjects) {
        const papersRes = papersResResult.value;
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
        const limitedPapers = sortedPapers.slice(0, 2);
        setRecentPapers(limitedPapers);
        updatedCacheData.recentPapers = limitedPapers;
      } else if (papersResResult.status === 'rejected') {
        console.warn('Failed to fetch question papers:', papersResResult.reason);
      }

      if (cacheKey && Object.keys(updatedCacheData).length > 0) {
        const cachedValue = await AsyncStorage.getItem(cacheKey);
        const currentCached = safeJsonParse<Record<string, any>>(cachedValue, {});
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          ...currentCached,
          ...updatedCacheData,
        }));
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
        const studentId = ((await AsyncStorage.getItem('student_id')) || (await AsyncStorage.getItem('studentId')) || '').trim();
        const schoolCode = ((await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '').trim();
        const scopedCacheKey = getStudentPhotoCacheKey(studentId, schoolCode);

        const freshProfile = await getStudentProfile();
        const profilePhoto = String(
          (freshProfile as any)?.profile_photo_url ||
          (freshProfile as any)?.student_photograph ||
          ''
        ).trim();
        const normalizedProfilePhoto = normalizePhotoUri(profilePhoto);

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
          const normalizedCached = normalizePhotoUri(cached);
          if (normalizedCached && isMounted.current) {
            setProfilePhotoUrl(normalizedCached);
            setProfilePhotoError(false);
            return;
          }
        }

        const resolved = (await getStudentProfilePhotoDataUri()) || (await getStudentProfilePhotoUrl());
        const normalizedResolved = normalizePhotoUri(resolved);
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
      const dataUri = `data:application/pdf;base64,${base64}`;

      // Use Share to open with an external PDF viewer (more reliable on mobile)
      try {
        const Share = require('react-native-share').default;

        await Share.open({
          url: dataUri,
          type: 'application/pdf',
          title: title || 'Question Paper',
          failOnCancel: false,
        });
      } catch (shareErr) {
        const message = String((shareErr as any)?.message || '');
        if (message.includes('User did not share') || message.includes('cancel')) {
          // user cancelled sharing - silently ignore
        } else {
          // Fallback: expose modal with WebView using data URI if Share fails
          setViewingPaperUrl(dataUri);
          setViewerVisible(true);
        }
      }
    } catch (error: any) {
      console.error('Error viewing paper:', error);
      Alert.alert('Download Failed', error.message || 'Could not open the question paper. Please try again later.');
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
    { name: 'Homework', icon: ClipboardList, color: '#EEF2FF', iconColor: '#2563EB', screen: 'StudentHomework' },
    { name: 'Attendance', icon: CheckCircle2, color: '#FEF2F2', iconColor: '#DC2626', screen: 'StudentAttendance' },
    { name: 'Holidays', icon: CalendarDays, color: '#F0FDF4', iconColor: '#16A34A', screen: 'PrincipalCalendarManagement' },
    { name: 'Marks', icon: BarChart3, color: '#FFFBEB', iconColor: '#D97706', screen: 'StudentMarks' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={C.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>


      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 180, paddingHorizontal: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={[Theme.colors.gradientStart, Theme.colors.gradientEnd]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[styles.headerContent, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets), overflow: 'hidden' }]}
        >
          {/* Decorative circles */}
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

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
                  size={44}
                  textSize={18}
                  primaryColor={Theme.colors.card}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigateRoot('Notifications')}
            >
              <Bell size={22} color={Theme.colors.card} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeSection}>
            <TouchableOpacity
              style={styles.headerInfoContainer}
              onPress={() => setSwitcherVisible(true)}
              activeOpacity={0.7}
            >
              <View>
                <View style={styles.greetingRow}>
                  <AppText style={styles.greeting}>HI {userName?.split(' ')[0]?.toUpperCase() || 'STUDENT'} 👋</AppText>
                  <ChevronDown size={18} color={Theme.colors.card} style={styles.chevronIcon} />
                </View>
                <AppText style={styles.subGreeting}>Here's your academic overview.</AppText>
              </View>
            </TouchableOpacity>
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
                    d="M5 30 Q 30 30, 60 15 T 95 5"
                    fill="none"
                    stroke={C.colors.blue}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
               </Svg>
            </View>
          </View>
        </LinearGradient>


        <View style={styles.contentContainer}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>Recent Question Papers</AppText>
              <TouchableOpacity onPress={() => navigation.navigate('StudentQuestionPapers')}>
                <AppText style={styles.viewAll}>View All →</AppText>
              </TouchableOpacity>
            </View>
            {recentPapers.length > 0 ? (
              recentPapers.map((paper, index) => (
                <View key={index} style={styles.paperCardRow}>
                  <View style={[styles.activityIcon, { backgroundColor: C.colors.blueLight }]}>
                    <FileText size={22} color={C.colors.blue} />
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
            </View>
            <View style={styles.quickAccessGrid}>
                  {quickAccess.map((item, i) => {
                    const IconComponent = item.icon;
                    return (
                <TouchableOpacity
                  key={`quick-${i}`}
                  style={styles.gridItem}
                      onPress={() => item.screen && navigateRoot(item.screen as any, (item as any).params)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                    <IconComponent size={24} color={item.iconColor} />
                  </View>
                  <AppText style={styles.gridLabel}>{item.name}</AppText>
                </TouchableOpacity>
              );})}
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
              recentAttendance.map((item, index) => (
                <View key={index} style={styles.activityCardRow}>
                  <View style={[styles.activityIcon, { backgroundColor: item.status?.toLowerCase() === 'present' ? C.colors.successBg : C.colors.errorBg }]}>
                    {item.status?.toLowerCase() === 'present' ? (
                      <CheckCircle2 size={22} color={C.colors.success} />
                    ) : (
                      <XCircle size={22} color={C.colors.error} />
                    )}
                  </View>
                  <View style={styles.activityInfo}>
                    <AppText style={styles.activityTitle}>Attendance Marked</AppText>
                    <AppText style={styles.activityDate}>
                      {new Date(item.attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </AppText>
                  </View>
                  <AppText style={[styles.activityStatus, { color: item.status?.toLowerCase() === 'present' ? C.colors.success : C.colors.error }]}>
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
              <X size={24} color={C.colors.text} />
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
          <ActivityIndicator size="large" color={C.colors.blue} />
          <AppText style={styles.loaderText}>Opening paper...</AppText>
        </View>
      )}

      <AccountSwitcher
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    backgroundColor: C.colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 40,
    marginBottom: 20,
    marginHorizontal: -20,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeSection: {
    marginBottom: 10,
  },
  headerInfoContainer: {
    alignSelf: 'flex-start',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronIcon: {
    marginLeft: 6,
    opacity: 0.8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.colors.background,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 },
  greeting: {
    ...Theme.typography.h1,
    color: C.colors.background,
    lineHeight: 32,
  },
  subGreeting: {
    ...Theme.typography.body,
    color: C.colors.backgroundAlt + 'AD', // ~0.68 opacity
    marginTop: 2,
    fontWeight: '600',
  },
  statsGrid: {
    marginTop: Theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: C.colors.card,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    width: '46%',
    marginBottom: Theme.spacing.md,
    ...C.shadow.sm,
  },
  attendancePctCard: {
    backgroundColor: C.colors.card,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    ...C.shadow.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    ...Theme.typography.body,
    color: '#6B7280',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  chartPlaceholder: {
    width: 110,
    height: 40,
    justifyContent: 'center',
  },
  contentContainer: {
    backgroundColor: C.colors.background,
  },
  section: {
    paddingTop: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.colors.text,
    lineHeight: 24,
  },
  viewAll: {
    ...Theme.typography.bodyMd,
    color: C.colors.blue,
    fontWeight: '700',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (SCREEN_WIDTH - 60) / 4,
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  gridLabel: {
    ...Theme.typography.label,
    color: C.colors.text,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  activityCard: {
    backgroundColor: C.colors.card,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    ...C.shadow.sm,
  },
  activityCardRow: {
    backgroundColor: C.colors.card,
    borderRadius: 18,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    ...C.shadow.sm,
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
    ...Theme.typography.h3,
    color: C.colors.text,
  },
  activityDate: {
    ...Theme.typography.body,
    color: C.colors.textMuted,
    marginTop: 3,
  },
  activityStatus: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activityDetail: {
    ...Theme.typography.body,
    color: C.colors.textMuted,
  },
  paperCardRow: {
    backgroundColor: C.colors.card,
    borderRadius: 18,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    ...C.shadow.sm,
  },
  viewPaperBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewPaperBtnText: {
    color: C.colors.blue,
    ...Theme.typography.bodyMd,
    fontWeight: '700',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: C.colors.card,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.border,
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
    ...Theme.typography.h3,
    color: C.colors.text,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.colors.card + 'CC', // 0.8 opacity
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loaderText: {
    marginTop: 12,
    ...Theme.typography.bodyMd,
    color: C.colors.blue,
    fontWeight: '600',
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
    bottom: -20,
    left: 60,
  },
});
