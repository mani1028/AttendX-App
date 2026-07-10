import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  ClipboardList,
  CalendarDays,
  FileText,
  BarChart3,
  CheckCircle2,
  XCircle,
  X,
  FileBox,
  ChevronRight,
  History,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import DashboardHeroHeader from '../../components/dashboard/DashboardHeroHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import QuickActionGrid, { QuickActionItem } from '../../components/dashboard/QuickActionGrid';

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
import { resolveStudentRollNumber, resolveApiErrorMessage } from '../../utils/helpers';
import { sharePdfBuffer } from '../../utils/sharePdfBuffer';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from '../../utils/storage';
import AccountSwitcher from '../../components/common/AccountSwitcher';
import { studentDashboardStyles as styles } from '../../components/student/studentDashboard/studentDashboardStyles';

const getStudentPhotoCacheKey = (studentId: string, schoolCode: string): string | null => {
  if (!studentId) {return null;}
  return `profile_photo_url:student:${schoolCode || 'unknown'}:${studentId}`;
};

const getStudentDashboardCacheKey = (schoolCode: string, studentId: string): string | null => {
  if (!schoolCode || !studentId) {return null;}
  return `student_dashboard_cache:${schoolCode}:${studentId}`;
};

function DashboardSection({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionTitle}>{title}</AppText>
        {actionLabel && onAction ? (
          <TouchableOpacity style={styles.sectionAction} onPress={onAction} accessibilityRole="button">
            <AppText style={styles.viewAll}>{actionLabel}</AppText>
            <ChevronRight size={16} color={C.colors.blue} />
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function DashboardEmptyRow({
  icon: Icon,
  message,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyRow}>
      <View style={styles.emptyIconWrap}>
        <Icon size={20} color={C.colors.textMuted} />
      </View>
      <View style={styles.emptyCopy}>
        <AppText style={styles.emptyMessage}>{message}</AppText>
        {actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction} accessibilityRole="button">
            <AppText style={styles.emptyAction}>{actionLabel}</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function StudentDashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarScrollPadding = useTabBarScrollPadding();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName } = useAuth();
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
  const [rollNumber, setRollNumber] = useState('');
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
        const resolvedRoll = resolveStudentRollNumber(
          (freshProfile as any)?.roll_number,
          (freshProfile as any)?.roll_no,
          (await AsyncStorage.getItem('roll_no')),
          (await AsyncStorage.getItem('roll_number')),
        );
        if (resolvedRoll && isMounted.current) {
          setRollNumber(resolvedRoll);
        }
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
      const safeTitle = (title || 'Paper').replace(/[^a-zA-Z0-9._-]/g, '_');
      await sharePdfBuffer(buffer, `${safeTitle}.pdf`, title || 'Question Paper');
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('User did not share') || message.includes('cancel')) {
        return;
      }
      console.error('Error viewing paper:', error);
      Alert.alert(
        'Download Failed',
        resolveApiErrorMessage(error, 'Could not open the question paper. Please try again later.'),
      );
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
    { name: 'Homework', icon: ClipboardList, bg: 'rgba(37, 99, 235, 0.08)', color: Theme.colors.blue, screen: 'StudentHomework' },
    { name: 'Attendance', icon: CheckCircle2, bg: 'rgba(220, 38, 38, 0.08)', color: Theme.colors.error, screen: 'StudentAttendance' },
    { name: 'Holidays', icon: CalendarDays, bg: 'rgba(34, 197, 94, 0.08)', color: Theme.colors.success, screen: 'MainTabs', params: { screen: 'Leave' } },
    { name: 'Marks', icon: BarChart3, bg: 'rgba(217, 119, 6, 0.08)', color: Theme.colors.warning, screen: 'StudentMarks' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ScreenSkeleton variant="dashboard" />
      </View>
    );
  }

  return (
    <View style={styles.container}>


      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: tabBarScrollPadding,
          paddingHorizontal: HEADER_CONSTANTS.DASHBOARD_HORIZONTAL,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <DashboardHeroHeader
          userName={userName || 'Student'}
          greetingLine={`HI ${userName?.split(' ')[0]?.toUpperCase() || 'STUDENT'}`}
          subtitle={
            rollNumber
              ? `Roll No: ${rollNumber} • Here's your academic overview.`
              : "Here's your academic overview."
          }
          unreadCount={unreadCount}
          onAvatarPress={() => navigateRoot('Profile')}
          onGreetingPress={() => setSwitcherVisible(true)}
          onNotificationsPress={() => navigateRoot('Notifications')}
          photoUri={profilePhotoUrl}
          photoError={profilePhotoError}
          onPhotoError={() => setProfilePhotoError(true)}
          fullBleed
          footer={(
            <>
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
            </>
          )}
        />


        <View style={[styles.sheet, innerPageLayoutStyles.contentFront]}>
          <DashboardSection title="Quick Access">
            <QuickActionGrid>
              {quickAccess.map((item, i) => {
                const IconComponent = item.icon;
                return (
                  <QuickActionItem key={`quick-${i}`}>
                    <TouchableOpacity
                      style={styles.gridItemInner}
                      onPress={() => item.screen && navigateRoot(item.screen as any, (item as any).params)}
                      accessibilityRole="button"
                      accessibilityLabel={item.name}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
                        <IconComponent size={22} color={item.color} />
                      </View>
                      <AppText style={styles.gridLabel}>{item.name}</AppText>
                    </TouchableOpacity>
                  </QuickActionItem>
                );
              })}
            </QuickActionGrid>
          </DashboardSection>

          <DashboardSection
            title="Recent Question Papers"
            actionLabel="View all"
            onAction={() => navigateRoot('StudentQuestionPapers')}
          >
            {recentPapers.length > 0 ? (
              recentPapers.map((paper, index) => (
                <View
                  key={`paper-${paper.paper_id || index}`}
                  style={[styles.listRow, index > 0 && styles.listRowDivider]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: C.colors.blueLight }]}>
                    <FileText size={20} color={C.colors.blue} />
                  </View>
                  <View style={styles.rowBody}>
                    <AppText style={styles.rowTitle} numberOfLines={1}>{paper.title}</AppText>
                    <AppText style={styles.rowMeta} numberOfLines={1}>
                      {paper.subject_name} • {paper.exam_type}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    style={styles.rowActionBtn}
                    onPress={() => handleViewPaper(paper.paper_id, paper.title)}
                    accessibilityRole="button"
                  >
                    <AppText style={styles.rowActionText}>View</AppText>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <DashboardEmptyRow
                icon={FileBox}
                message="No question papers yet."
                actionLabel="Browse papers"
                onAction={() => navigateRoot('StudentQuestionPapers')}
              />
            )}
          </DashboardSection>

          <DashboardSection
            title="Recent Activity"
            actionLabel="View all"
            onAction={() => navigateRoot('StudentAttendance')}
          >
            {recentAttendance.length > 0 ? (
              recentAttendance.slice(0, 5).map((item, index) => {
                const isPresent = item.status?.toLowerCase() === 'present';
                return (
                  <View
                    key={`activity-${item.attendance_date || index}`}
                    style={[styles.listRow, index > 0 && styles.listRowDivider]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: isPresent ? C.colors.successBg : C.colors.errorBg }]}>
                      {isPresent ? (
                        <CheckCircle2 size={20} color={C.colors.success} />
                      ) : (
                        <XCircle size={20} color={C.colors.error} />
                      )}
                    </View>
                    <View style={styles.rowBody}>
                      <AppText style={styles.rowTitle}>Attendance marked</AppText>
                      <AppText style={styles.rowMeta}>
                        {new Date(item.attendance_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </AppText>
                    </View>
                    <AppText style={[styles.rowStatus, { color: isPresent ? C.colors.success : C.colors.error }]}>
                      {item.status}
                    </AppText>
                  </View>
                );
              })
            ) : (
              <DashboardEmptyRow
                icon={History}
                message="No attendance activity yet."
                actionLabel="View attendance"
                onAction={() => navigateRoot('StudentAttendance')}
              />
            )}
          </DashboardSection>
        </View>
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
          <ScreenSkeleton variant="dashboard" />
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
