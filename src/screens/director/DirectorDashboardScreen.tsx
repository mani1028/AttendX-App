import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { motion } from '../../theme/motion';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, NavigationProp, useFocusEffect } from '@react-navigation/native';
import {
  RefreshCw,
  Calendar,
  Users,
  GraduationCap,
  School,
  FileText,
  Mail,
  User,
  LayoutDashboard,
  Layers,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Edit2,
  Trash2,
  Eye,
  Save,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Briefcase,
  Zap,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Line, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import API from '../../services/api';
import { colors } from '../../theme/tokens';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AvatarBubble from '../../components/common/AvatarBubble';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import type { RootStackParamList } from '../../navigation/types';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';




// Types
interface Branch {
  branch_id: string;
  branch_name: string;
  branch_status: string;
  principal_employee_id: string;
  principal_name: string;
  principal_email: string;
  creation_date: string;
  teachers_count: number;
  students_count: number;
  classes_count: number;
  sections_count: number;
  teacher_attendance_today: number;
  student_attendance_today: number;
  pending_leave_requests: number;
  health_status: string;
}

interface Stats {
  branches: number;
  teachers: number;
  students: number;
  activeBranches: number;
  inactiveBranches: number;
  principals: number;
  classes: number;
  sections: number;
  pendingLeaves: number;
  teacherAttendanceToday: number;
  studentAttendanceToday: number;
}



// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

const formatDate = (dateString: string): string => {
  if (!dateString) {return '-';}
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN');
};

const getHealthMeta = (status: string) => {
  const key = String(status || '').toUpperCase();
  if (key === 'HEALTHY') {return { label: 'Healthy', bg: 'rgba(16, 185, 129, 0.1)', color: Theme.colors.success, border: 'rgba(16, 185, 129, 0.2)' };}
  if (key === 'INACTIVE') {return { label: 'Inactive', bg: 'rgba(239, 68, 68, 0.1)', color: Theme.colors.error, border: 'rgba(239, 68, 68, 0.2)' };}
  if (key === 'PRINCIPAL_MISSING') {return { label: 'Principal Missing', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };}
  if (key === 'NO_CLASSES') {return { label: 'No Classes', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };}
  if (key === 'NO_TEACHERS') {return { label: 'No Teachers', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };}
  if (key === 'NO_STUDENTS') {return { label: 'No Students', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };}
  return { label: 'Needs Review', bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)' };
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
      <AppText style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || 'INACTIVE'}
      </AppText>
    </View>
  );
};

// Health Badge Component
const HealthBadge: React.FC<{ status: string }> = ({ status }) => {
  const meta = getHealthMeta(status);
  return (
    <View style={[styles.healthBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <AppText style={[styles.healthText, { color: meta.color }]}>{meta.label}</AppText>
    </View>
  );
};

// KPI Card Component with animations
const KpiCard: React.FC<{
  title: string;
  value: number;
  sub: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeUp: boolean;
  cardStyle?: any;
  onPress?: () => void;
}> = ({ title, value, sub, icon: Icon, iconBg, iconColor, badge, badgeUp, cardStyle, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...motion.springs.snappy,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const handlePressIn = useRef(new Animated.Value(0)).current;

  const onPressIn = () => {
    Animated.spring(handlePressIn, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(handlePressIn, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.kpiCard,
        cardStyle,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            {
              scale: handlePressIn.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.95],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.8}
        style={{ flex: 1, justifyContent: 'space-between' }}
      >
        <View style={styles.kpiHeader}>
          <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>
            <Icon size={20} color={iconColor} />
          </View>
          <View style={[styles.kpiBadge, badgeUp ? styles.kpiBadgeUp : styles.kpiBadgeDown]}>
            <View style={[styles.kpiBadgeDot, { backgroundColor: badgeUp ? colors.success : colors.error }]} />
            <AppText style={styles.kpiBadgeText} weight="bold">{badge}</AppText>
          </View>
        </View>
        <AppText style={styles.kpiTitle} weight="bold">{title}</AppText>
        <AppText style={[styles.kpiValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]} weight="bold">{value}</AppText>
        <AppText style={styles.kpiSub}>{sub}</AppText>

      </TouchableOpacity>
    </Animated.View>
  );
};

// Branch Card Component with animations
const BranchCard: React.FC<{ branch: Branch; onPress: () => void }> = ({ branch, onPress }) => {
  const health = getHealthMeta(branch.health_status);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...motion.springs.snappy,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity accessibilityRole="button" style={styles.branchCard} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.branchCardHeader}>
          <View>
            <AppText style={styles.branchName}>{branch.branch_name}</AppText>
            <AppText style={styles.branchId}>ID: {branch.branch_id}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <StatusBadge status={branch.branch_status} />
            <HealthBadge status={branch.health_status} />
          </View>
        </View>

        <View style={styles.branchInfoRow}>
          <User size={14} color={colors.textMuted} />
          <AppText style={styles.branchPrincipal}>Principal: {branch.principal_name || 'No Principal'}</AppText>
        </View>
        <View style={styles.branchInfoRow}>
          <Mail size={14} color={colors.textMuted} />
          <AppText style={styles.branchEmail}>{branch.principal_email || 'No email'}</AppText>
        </View>

        <View style={styles.branchStats}>
          <View style={styles.branchStat}>
            <AppText style={styles.branchStatValue}>{branch.teachers_count || 0}</AppText>
            <AppText style={styles.branchStatLabel}>Teachers</AppText>
          </View>
          <View style={styles.branchStat}>
            <AppText style={styles.branchStatValue}>{branch.students_count || 0}</AppText>
            <AppText style={styles.branchStatLabel}>Students</AppText>
          </View>
          <View style={styles.branchStat}>
            <AppText style={styles.branchStatValue}>{branch.classes_count || 0}</AppText>
            <AppText style={styles.branchStatLabel}>Classes</AppText>
          </View>
          <View style={styles.branchStat}>
            <AppText style={styles.branchStatValue}>{branch.sections_count || 0}</AppText>
            <AppText style={styles.branchStatLabel}>Sections</AppText>
          </View>
        </View>

        <View style={styles.branchFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Calendar size={14} color={colors.textMuted} />
            <AppText style={styles.branchFooterText}>Since: {formatDate(branch.creation_date)}</AppText>
          </View>
          <View style={styles.branchViewBtnContainer}>
            <AppText style={styles.branchViewBtnText} weight="bold">View</AppText>
            <ChevronRight size={14} color={Theme.colors.card} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Branch Management Card Component for list view
const BranchManagementCard: React.FC<{
  branch: Branch;
  onEdit: () => void;
  onView: () => void;
}> = ({ branch, onEdit, onView }) => {
  return (
    <View style={styles.branchManagementCard}>
      <View style={styles.branchManagementHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.branchManagementName} weight="bold">{branch.branch_name}</AppText>
          <AppText style={styles.branchManagementId}>Branch ID: {branch.branch_id}</AppText>
        </View>
        <View style={{ gap: 4, alignItems: 'flex-end' }}>
          <StatusBadge status={branch.branch_status} />
          <HealthBadge status={branch.health_status} />
        </View>
      </View>

      <View style={styles.branchManagementDetails}>
        <View style={styles.managementDetailRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <User size={12} color={colors.textMuted} />
            <AppText style={styles.managementDetailLabel} weight="bold">Principal</AppText>
          </View>
          <AppText style={styles.managementDetailVal}>{branch.principal_name || 'Not assigned'}</AppText>
        </View>
        <View style={styles.managementDetailRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Mail size={12} color={colors.textMuted} />
            <AppText style={styles.managementDetailLabel} weight="bold">Email</AppText>
          </View>
          <AppText style={styles.managementDetailVal} numberOfLines={1}>{branch.principal_email || 'Not assigned'}</AppText>
        </View>

        <View style={styles.managementStatsRow}>
          <AppText style={styles.managementStatsText}>
            🏫 {branch.classes_count || 0} Classes  •  👨‍🏫 {branch.teachers_count || 0} Staff  •  🎓 {branch.students_count || 0} Students
          </AppText>
        </View>
      </View>

      <View style={styles.branchManagementActions}>
        <TouchableOpacity accessibilityRole="button" style={styles.managementBtnView} onPress={onView}>
          <Eye size={13} color={Theme.colors.card} />
          <AppText style={styles.managementBtnViewText} weight="bold">View Details</AppText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.managementBtnEdit} onPress={onEdit}>
          <Edit2 size={13} color={Theme.colors.primaryLight} />
          <AppText style={styles.managementBtnEditText} weight="bold">Edit</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};



const QUICK_ACTIONS = [
  { label: 'Add Branch', route: 'DirectorPrincipalRegistration', icon: PlusCircle, bg: 'rgba(16, 185, 129, 0.08)', color: Theme.colors.success },
  { label: 'Billing Info', route: 'DirectorBilling', icon: Briefcase, bg: 'rgba(30, 58, 138, 0.08)', color: Theme.colors.primary },
  { label: 'Renew Plan', route: 'RenewalPayment', icon: Zap, bg: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' },
  { label: 'My Profile', route: 'Profile', icon: User, bg: 'rgba(30, 58, 138, 0.08)', color: Theme.colors.primary },
] as const;

export default function DirectorDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName, setTabBarVisible } = useAuth();
  const { unreadCount } = useUnreadNotifications();
  const route = useRoute();
  const overviewRef = useRef<ScrollView>(null);
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {return 'Morning';}
    if (hour < 17) {return 'Afternoon';}
    return 'Evening';
  };

  // Animation refs
  const welcomeOpacityAnim = useRef(new Animated.Value(0)).current;
  const welcomeTranslateAnim = useRef(new Animated.Value(20)).current;
  const topBarOpacityAnim = useRef(new Animated.Value(0)).current;
  const topBarTranslateAnim = useRef(new Animated.Value(20)).current;

  const [schoolCode, setSchoolCode] = useState<string>('');
  const [stats, setStats] = useState<Stats>({
    branches: 0,
    teachers: 0,
    students: 0,
    activeBranches: 0,
    inactiveBranches: 0,
    principals: 0,
    classes: 0,
    sections: 0,
    pendingLeaves: 0,
    teacherAttendanceToday: 0,
    studentAttendanceToday: 0,
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [view, setView] = useState<'dashboard' | 'branches' | 'adddirector' | 'settings'>('dashboard');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const isMounted = useRef(true);

  useFocusEffect(
    useCallback(() => {
      const name = route.name;
      if (name === 'Branches') {
        setView('branches');
      } else {
        setView('dashboard');
      }
    }, [route.name])
  );

  useEffect(() => {
    isMounted.current = true;

    // Animate welcome section
    Animated.parallel([
      Animated.timing(welcomeOpacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(welcomeTranslateAnim, {
        toValue: 0,
        useNativeDriver: true,
        ...motion.springs.snappy,
      }),
    ]).start();

    // Animate top bar with delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(topBarOpacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(topBarTranslateAnim, {
          toValue: 0,
          useNativeDriver: true,
          ...motion.springs.snappy,
        }),
      ]).start();
    }, 100);

    return () => {
      isMounted.current = false;
    };
  }, []);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [branchSelectorVisible, setBranchSelectorVisible] = useState<boolean>(false);
  const [editBranchModalVisible, setEditBranchModalVisible] = useState<boolean>(false);
  const [showAllBranches, setShowAllBranches] = useState<boolean>(false);
  const [branchSearchTerm, setBranchSearchTerm] = useState<string>('');
  const [branchCardsPage, setBranchCardsPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);


  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);
  const responsiveKpiCardStyle = useMemo(() => {
    const cardWidth = (width - 52) / 2;
    return { width: cardWidth, minWidth: cardWidth, marginHorizontal: 0 };
  }, [width]);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Branch>>({});

  // Search for branches view
  const [branchViewSearchTerm, setBranchViewSearchTerm] = useState<string>('');
  const [branchViewPage, setBranchViewPage] = useState<number>(1);

  // Director details for profile card
  const [directorEmail, setDirectorEmail] = useState<string>('');
  const [directorPhone, setDirectorPhone] = useState<string>('');

  const ROWS_PER_PAGE = 7;
  const BRANCH_CARDS_PER_PAGE = 6;

  // Load school code and director details
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      if (isMounted.current) {
        setSchoolCode(code);
      }
      try {
        const email = await storage.getString(StorageKeys.USER_EMAIL) || '';
        const phone = await AsyncStorage.getItem('phone') || '';
        if (isMounted.current) {
          setDirectorEmail(email);
          setDirectorPhone(phone);
        }
      } catch (err) {
        console.log('Error loading director details:', err);
      }
    };
    load();

    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);



  const handleScroll = useScrollTabBar();


  // Fetch stats and branches
  const fetchStatsAndBranches = useCallback(async () => {
    if (!schoolCode) {return;}
    setLoading(true);
    try {
      const endpoints = ['director/dashboard/overview', 'director/stats'];
      let res;
      for (const endpoint of endpoints) {
        try {
          res = await API.get(endpoint, {
            headers: { 'x-school-code': schoolCode },
            suppressFallback404Log: true,
          } as any);
          if (res) {break;}
        } catch (e) {
          // try next
        }
      }

      if (!res) {
        throw new Error('Dashboard stats endpoint not found');
      }

      const data = res.data || {};
      // Handle different response structures
      if (data.ok || (data.summary && !data.error) || data.stats || data.total_branches !== undefined) {
        const summary = data.summary || data.stats || data || {};
        const statsData: Stats = {
          branches: Number(summary.total_branches ?? summary.branches ?? 0),
          teachers: Number(summary.total_teachers ?? summary.staff ?? summary.teachers ?? 0),
          students: Number(summary.total_students ?? summary.students ?? 0),
          activeBranches: Number(summary.active_branches ?? summary.branches ?? 0),
          inactiveBranches: Number(summary.inactive_branches ?? 0),
          principals: Number(summary.total_directors ?? summary.total_principals ?? summary.total_hms ?? 0),
          classes: Number(summary.total_classes ?? 0),
          sections: Number(summary.total_sections ?? 0),
          pendingLeaves: Number(summary.pending_leave_requests ?? 0),
          teacherAttendanceToday: Number(summary.teacher_attendance_marked_today ?? 0),
          studentAttendanceToday: Number(summary.student_attendance_marked_today ?? 0),
        };
        const branchData = data.items || data.branches || [];
        const branchArray = Array.isArray(branchData) ? branchData : [];

        if (isMounted.current) {
          setStats(statsData);
          setBranches(branchArray);
        }

        // Cache data
        await Promise.all([
          AsyncStorage.setItem(`director_stats_${schoolCode}`, JSON.stringify(statsData)),
          AsyncStorage.setItem(`director_branches_${schoolCode}`, JSON.stringify(branchArray)),
        ]).catch(() => { });
      }
    } catch (err: any) {
      if (!isMounted.current) {return;}
      if (err?.response?.status === 401) {return;}
      console.error('Failed to fetch dashboard data:', err);
      // Only alert if we don't have cached data
      if (branches.length === 0) {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [schoolCode, branches.length]);



  // Initial fetch and cache loading
  useEffect(() => {
    if (schoolCode) {
      loadCachedData();
      fetchStatsAndBranches();
    }
  }, [schoolCode]);

  const loadCachedData = async () => {
    try {
      const statsKey = `director_stats_${schoolCode}`;
      const branchesKey = `director_branches_${schoolCode}`;

      const [cachedStats, cachedBranches] = await Promise.all([
        AsyncStorage.getItem(statsKey),
        AsyncStorage.getItem(branchesKey),
      ]);

      if (!isMounted.current) {return;}

      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
      }
      if (cachedBranches) {
        const parsed = JSON.parse(cachedBranches);
        setBranches(Array.isArray(parsed) ? parsed : []);
      }

      if (cachedStats || cachedBranches) {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
    }
  };




  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatsAndBranches();
    setRefreshing(false);
  }, [fetchStatsAndBranches]);

  // Filter branches
  const filteredBranches = useMemo(() => {
    let filtered = Array.isArray(branches) ? branches : [];
    if (selectedBranchId !== 'ALL') {
      filtered = filtered.filter(b => String(b.branch_id) === String(selectedBranchId));
    }
    if (branchSearchTerm) {
      const term = branchSearchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.branch_name?.toLowerCase().includes(term) ||
        b.branch_id?.toLowerCase().includes(term) ||
        b.principal_name?.toLowerCase().includes(term)
      );
    }
    if (branchViewSearchTerm && view === 'branches') {
      const term = branchViewSearchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.branch_name?.toLowerCase().includes(term) ||
        b.branch_id?.toLowerCase().includes(term) ||
        b.principal_name?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [branches, selectedBranchId, branchSearchTerm, branchViewSearchTerm, view]);

  // Pagination for branches view
  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / ROWS_PER_PAGE));
  const paginatedBranches = filteredBranches.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // Branch cards pagination
  const branchCardsTotalPages = Math.max(1, Math.ceil(filteredBranches.length / BRANCH_CARDS_PER_PAGE));
  const branchCards = useMemo(() => {
    if (!showAllBranches) {return filteredBranches.slice(0, BRANCH_CARDS_PER_PAGE);}
    const start = (branchCardsPage - 1) * BRANCH_CARDS_PER_PAGE;
    return filteredBranches.slice(start, start + BRANCH_CARDS_PER_PAGE);
  }, [filteredBranches, showAllBranches, branchCardsPage]);

  // Selected branch object
  const selectedBranch = useMemo(() => {
    if (selectedBranchId === 'ALL' || !Array.isArray(branches)) {return null;}
    return branches.find(b => String(b.branch_id) === String(selectedBranchId));
  }, [branches, selectedBranchId]);

  // Displayed stats
  const displayedStats = useMemo(() => {
    if (selectedBranchId === 'ALL') {return stats;}
    if (selectedBranch) {
      return {
        ...stats,
        branches: 1,
        principals: 1,
        teachers: selectedBranch.teachers_count || 0,
        students: selectedBranch.students_count || 0,
        activeBranches: selectedBranch.branch_status === 'ACTIVE' ? 1 : 0,
        inactiveBranches: selectedBranch.branch_status === 'INACTIVE' ? 1 : 0,
        classes: selectedBranch.classes_count || 0,
        sections: selectedBranch.sections_count || 0,
        pendingLeaves: selectedBranch.pending_leave_requests || 0,
        teacherAttendanceToday: selectedBranch.teacher_attendance_today || 0,
        studentAttendanceToday: selectedBranch.student_attendance_today || 0,
      };
    }
    return stats;
  }, [selectedBranchId, selectedBranch, stats]);


  const handleKpiClick = () => {
    if (selectedBranchId === 'ALL') {
      overviewRef.current?.scrollToEnd();
    } else {
      navigation.navigate('DirectorBranchDetails', {
        branchId: selectedBranch?.branch_id || '',
        branchName: selectedBranch?.branch_name || '',
        principalName: selectedBranch?.principal_name || '',
        principalEmail: selectedBranch?.principal_email || '',
        branchStatus: selectedBranch?.branch_status || '',
      });
    }
  };

  const handleViewBranch = (branch: Branch) => {
    navigation.navigate('DirectorBranchDetails', {
      branchId: branch.branch_id,
      branchName: branch.branch_name,
      principalName: branch.principal_name,
      principalEmail: branch.principal_email,
      branchStatus: branch.branch_status,
    });
  };

  const startEdit = (branch: Branch) => {
    setEditingId(branch.branch_id);
    setEditData({
      branch_name: branch.branch_name,
      principal_employee_id: branch.principal_employee_id,
      principal_name: branch.principal_name,
      principal_email: branch.principal_email,
      branch_status: branch.branch_status,
    });
    setEditBranchModalVisible(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setEditBranchModalVisible(false);
  };

  const saveEdit = async () => {
    if (!editingId) {return;}
    try {
      await API.put('/director/branch/update', {
        branch_id: editingId,
        branch_name: editData.branch_name,
        principal_employee_id: editData.principal_employee_id,
        principal_name: editData.principal_name,
        principal_email: editData.principal_email,
        status: editData.branch_status,
        password: null,
      });
      if (!isMounted.current) {return;}
      Alert.alert('Success', 'Branch updated successfully');
      cancelEdit();
      fetchStatsAndBranches();
    } catch (err: any) {
      if (!isMounted.current) {return;}
      if (err?.response?.status === 401) {return;}
      Alert.alert('Error', 'Failed to update branch');
    }
  };

  const deleteBranch = (branchId: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete branch ${branchId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete('/director/branch/delete', { data: { branch_id: branchId } });
              Alert.alert('Success', 'Branch deleted successfully');
              if (selectedBranchId === branchId) {setSelectedBranchId('ALL');}
              fetchStatsAndBranches();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete branch');
            }
          },
        },
      ]
    );
  };

  const handleEditChange = (field: keyof Branch, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  if (!schoolCode) {
    return (
      <View style={styles.errorContainer}>
        <AppText style={styles.errorTitle}>School Code missing</AppText>
        <AppText style={styles.errorText}>Please login again.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>


      <ScrollView
        ref={overviewRef}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Background grid and alignment illustration */}
        <View style={styles.gridLinesContainer} pointerEvents="none">
          {/* Horizontal dashed line */}
          <View style={[styles.gridLineHorizontal, { top: 290 }]} />

          {/* Vertical dashed line */}
          <View style={[styles.gridLineVertical, { left: width / 2 }]} />

          {/* Diagonal connecting line */}
          <Svg style={StyleSheet.absoluteFillObject}>
            <Defs>
              <SvgLinearGradient id="lineGrad" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0%" stopColor={Theme.colors.blue} stopOpacity="0.6" />
                <Stop offset="50%" stopColor={Theme.colors.success} stopOpacity="0.8" />
                <Stop offset="100%" stopColor={Theme.colors.blue} stopOpacity="0.6" />
              </SvgLinearGradient>
            </Defs>
            <Line
              x1={30}
              y1={480}
              x2={width - 30}
              y2={100}
              stroke="url(#lineGrad)"
              strokeWidth={1.5}
            />
          </Svg>

          {/* Decorative Circle 1: Bottom-Left */}
          <View style={[styles.decorCircle, { left: 30 - 30, top: 480 - 30 }]}>
            <View style={styles.decorCircleInner} />
          </View>

          {/* Decorative Circle 2: Center */}
          <View style={[styles.decorCircleCenter, { left: width / 2 - 20, top: 290 - 20 }]}>
            <View style={styles.decorCircleCenterInner} />
          </View>

          {/* Decorative Circle 3: Top-Right */}
          <View style={[styles.decorCircle, { left: width - 30 - 30, top: 100 - 30 }]}>
            <View style={styles.decorCircleInner} />
          </View>
        </View>

        <LinearGradient
          colors={[Theme.colors.gradientStart, Theme.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroHeader,
            {
                paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets),
                borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
                borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
                paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM + 10,
                paddingHorizontal: 0,
              },
            ]}
          >
            <View style={{ paddingHorizontal: 18 }}>
              {/* Row 1: Avatar, Greeting, Notifications, Refresh */}
              <View style={styles.heroTopRow}>
                <View style={styles.heroProfileInfo}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Profile')}>
                    <AvatarBubble
                      displayName={userName || 'Director'}
                      size={38}
                      textSize={16}
                      primaryColor={Theme.colors.card}
                    />
                  </TouchableOpacity>
                  <View style={styles.heroGreetingBox}>
                    <AppText style={styles.heroGreetingText} weight="semibold">
                      GOOD {getGreeting().toUpperCase()}
                    </AppText>
                    <AppText style={styles.heroNameText} weight="bold" numberOfLines={1}>
                      {((userName || 'Director').split(' ')[0]).replace(/^\w/, (c) => c.toUpperCase())} 👋
                    </AppText>
                  </View>
                </View>
                <View style={styles.heroActions}>
                  <TouchableOpacity accessibilityRole="button" style={styles.refreshIconBtn} onPress={() => navigation.navigate('Notifications')}>
                    <Bell size={18} color={Theme.colors.card} />
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <AppText style={styles.badgeText} weight="bold">{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={styles.refreshIconBtn} onPress={onRefresh} disabled={loading}>
                    <RefreshCw size={18} color={Theme.colors.card} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 2: Title & Date Badge */}
              <View style={styles.welcomeSection}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <AppText style={styles.welcomeTitle} weight="bold" numberOfLines={1} adjustsFontSizeToFit>Director Control Center</AppText>

                  {/* Row 3: School ID */}
                  <AppText style={styles.welcomeSub} numberOfLines={1}>
                    {schoolCode ? `School ID: ${schoolCode} • ` : ''}Manage branches
                  </AppText>
                </View>

                {/* Row 4: Date Card */}
                <View style={styles.dateRow}>
                  <View style={styles.dateBadge}>
                    <Calendar size={12} color={Theme.colors.card} />
                    <AppText style={styles.dateText} weight="bold">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </AppText>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>

        <View style={styles.mainContentWrapper}>
          {/* Stats Cards Grid overlapping header */}
          {view === 'dashboard' && (
            <View style={styles.statsGrid}>
              <KpiCard
                title={selectedBranchId === 'ALL' ? 'Branches' : 'Branch'}
                value={displayedStats.branches}
                sub={`${displayedStats.activeBranches} active branches`}
                icon={School}
                iconBg="rgba(59, 130, 246, 0.1)"
                iconColor={Theme.colors.blue}
                badge={displayedStats.inactiveBranches > 0 ? `${displayedStats.inactiveBranches} Inactive` : 'All Active'}
                badgeUp={displayedStats.inactiveBranches === 0}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Teachers"
                value={displayedStats.teachers}
                sub="Total school staff"
                icon={Users}
                iconBg="rgba(16, 185, 129, 0.1)"
                iconColor={Theme.colors.success}
                badge={`${displayedStats.teacherAttendanceToday}% Present`}
                badgeUp={displayedStats.teacherAttendanceToday >= 75}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Students"
                value={displayedStats.students}
                sub="Enrolled students"
                icon={GraduationCap}
                iconBg="rgba(245, 158, 11, 0.1)"
                iconColor="#f59e0b"
                badge={`${displayedStats.studentAttendanceToday}% Present`}
                badgeUp={displayedStats.studentAttendanceToday >= 75}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Classes"
                value={displayedStats.classes}
                sub={`${displayedStats.sections} sections`}
                icon={Layers}
                iconBg="rgba(30, 58, 138, 0.1)"
                iconColor={Theme.colors.primary}
                badge={displayedStats.pendingLeaves > 0 ? `${displayedStats.pendingLeaves} Leaves` : 'No Leaves'}
                badgeUp={displayedStats.pendingLeaves === 0}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
            </View>
          )}
          {/* Quick Access */}
          {view === 'dashboard' && (
            <Animated.View
              style={[
                {
                  opacity: topBarOpacityAnim,
                  transform: [{ translateY: topBarTranslateAnim }],
                  marginBottom: 20,
                },
              ]}
            >
              <View style={styles.quickAccessPanel}>
                <View style={styles.sectionHeader}>
                  <AppText style={styles.sectionTitle}>Quick Access</AppText>
                </View>
                <View style={styles.quickAccessGrid}>
                  {QUICK_ACTIONS.map((action) => {
                    const IconComponent = action.icon;
                    return (
                      <TouchableOpacity accessibilityRole="button"
                        key={action.label}
                        style={styles.gridItem}
                        onPress={() => navigation.navigate(action.route as any)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.iconContainer, { backgroundColor: action.bg }]}>
                          <IconComponent size={24} color={action.color} />
                        </View>
                        <View style={styles.gridLabelContainer}>
                          <AppText style={styles.gridLabel} weight="semibold" numberOfLines={2} adjustsFontSizeToFit>
                            {action.label}
                          </AppText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Filter Selector outside panel */}
              <View style={[styles.branchSelector, { marginTop: Theme.spacing.md }]}>
                <AppText style={styles.branchSelectorLabel}>Filter Data By Branch</AppText>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.branchSelectorField}
                  onPress={() => setBranchSelectorVisible(true)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <School size={18} color={Theme.colors.primary} />
                    <AppText style={styles.branchSelectorValue} numberOfLines={1}>
                      {selectedBranchId === 'ALL' ? 'All Branches (No Filter)' : `Branch: ${selectedBranchId}`}
                    </AppText>
                  </View>
                  <ChevronDown size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {loading && <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />}

          {/* Dashboard View */}
          {view === 'dashboard' && (
            <>


              {/* Branch Management Section in Dashboard */}
              <AppCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <AppText style={styles.cardTitle}>Branch Management</AppText>
                  <TouchableOpacity accessibilityRole="button" onPress={() => setShowAllBranches(!showAllBranches)}>
                    <AppText style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                      {showAllBranches ? 'Show Less' : 'View All'}
                    </AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.branchCardsGrid}>
                  {branchCards.map(branch => (
                    <BranchManagementCard
                      key={branch.branch_id}
                      branch={branch}
                      onEdit={() => startEdit(branch)}
                      onView={() => handleViewBranch(branch)}
                    />
                  ))}
                </View>
                {showAllBranches && branchCardsTotalPages > 1 && (
                  <View style={[styles.pagination, { marginTop: Theme.spacing.md }]}>
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.pageBtn, branchCardsPage === 1 && styles.pageBtnDisabled]}
                      onPress={() => setBranchCardsPage(Math.max(1, branchCardsPage - 1))}
                      disabled={branchCardsPage === 1}
                    >
                      <ChevronLeft size={18} color={branchCardsPage === 1 ? colors.border : colors.textMuted} />
                    </TouchableOpacity>
                    <AppText style={styles.pageInfo}>Page {branchCardsPage} of {branchCardsTotalPages}</AppText>
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.pageBtn, branchCardsPage === branchCardsTotalPages && styles.pageBtnDisabled]}
                      onPress={() => setBranchCardsPage(Math.min(branchCardsTotalPages, branchCardsPage + 1))}
                      disabled={branchCardsPage === branchCardsTotalPages}
                    >
                      <ChevronRight size={18} color={branchCardsPage === branchCardsTotalPages ? colors.border : colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}
              </AppCard>
            </>
          )}

          {/* Branches View */}
          {view === 'branches' && (
            <AppCard style={styles.branchesViewCard}>
              <View style={styles.branchesViewHeader}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.cardTitle}>
                    {selectedBranchId === 'ALL' ? 'Registered Branches' : `Branch Filter: ${selectedBranchId}`}
                  </AppText>
                  <AppText style={styles.overviewSubtitle}>
                    {filteredBranches.length} branch{filteredBranches.length !== 1 ? 'es' : ''} registered
                  </AppText>
                </View>
                <TouchableOpacity accessibilityRole="button" style={styles.addBranchBtn} onPress={() => navigation.navigate('DirectorPrincipalRegistration')}>
                  <AppText style={styles.addBranchBtnText}>+ Add Branch</AppText>
                </TouchableOpacity>
              </View>

              {/* Search */}
              <TextInput
                style={styles.branchSearchInput}
                placeholder="Search by branch name, ID, or Principal name..."
                placeholderTextColor={colors.textMuted}
                value={branchViewSearchTerm}
                onChangeText={(text) => {
                  setBranchViewSearchTerm(text);
                  setBranchViewPage(1);
                }}
              />

              {paginatedBranches.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AppText style={styles.emptyText}>No branches found</AppText>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {paginatedBranches.map(branch => (
                    <BranchManagementCard
                      key={branch.branch_id}
                      branch={branch}
                      onEdit={() => startEdit(branch)}
                      onView={() => handleViewBranch(branch)}
                    />
                  ))}
                </View>
              )}

              {/* Pagination */}
              {filteredBranches.length > ROWS_PER_PAGE && (
                <View style={styles.pagination}>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft size={18} color={currentPage === 1 ? colors.border : colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={18} color={currentPage === 1 ? colors.border : colors.textMuted} />
                  </TouchableOpacity>
                  <AppText style={styles.pageInfo}>Page {currentPage} of {totalPages}</AppText>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={18} color={currentPage === totalPages ? colors.border : colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight size={18} color={currentPage === totalPages ? colors.border : colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </AppCard>
          )}
        </View>
      </ScrollView>

      {/* Edit Branch Modal */}
      <Modal visible={editBranchModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Edit Branch Details</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={cancelEdit} style={styles.modalClose}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={{ gap: 14 }}>
                <View>
                  <AppText style={{ ...Theme.typography.caption, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }} weight="bold">Branch Name</AppText>
                  <TextInput
                    style={[styles.searchInput, { width: '100%', height: 44, paddingVertical: Theme.spacing.sm }]}
                    value={editData.branch_name}
                    onChangeText={(text) => handleEditChange('branch_name', text)}
                  />
                </View>
                <View>
                  <AppText style={{ ...Theme.typography.caption, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }} weight="bold">Principal ID</AppText>
                  <TextInput
                    style={[styles.searchInput, { width: '100%', height: 44, paddingVertical: Theme.spacing.sm }]}
                    value={editData.principal_employee_id}
                    onChangeText={(text) => handleEditChange('principal_employee_id', text)}
                  />
                </View>
                <View>
                  <AppText style={{ ...Theme.typography.caption, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }} weight="bold">Principal Name</AppText>
                  <TextInput
                    style={[styles.searchInput, { width: '100%', height: 44, paddingVertical: Theme.spacing.sm }]}
                    value={editData.principal_name}
                    onChangeText={(text) => handleEditChange('principal_name', text)}
                  />
                </View>
                <View>
                  <AppText style={{ ...Theme.typography.caption, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }} weight="bold">Principal Email</AppText>
                  <TextInput
                    style={[styles.searchInput, { width: '100%', height: 44, paddingVertical: Theme.spacing.sm }]}
                    value={editData.principal_email}
                    onChangeText={(text) => handleEditChange('principal_email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View>
                  <AppText style={{ ...Theme.typography.caption, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }} weight="bold">Status</AppText>
                  <View style={[styles.editStatusContainer, { width: '100%', gap: 10 }]}>
                    {['ACTIVE', 'INACTIVE'].map(opt => (
                      <TouchableOpacity accessibilityRole="button"
                        key={opt}
                        style={[styles.editStatusBtn, editData.branch_status === opt && styles.editStatusBtnActive, { flex: 1, height: 44, justifyContent: 'center' }]}
                        onPress={() => handleEditChange('branch_status', opt)}
                      >
                        <AppText style={[styles.editStatusText, editData.branch_status === opt && styles.editStatusTextActive, { textAlign: 'center' }]} weight="bold">
                          {opt}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={[styles.modalFooter, { flexDirection: 'row', gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <AppButton title="Cancel" onPress={cancelEdit} type="secondary" />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton title="Save Changes" onPress={saveEdit} type="primary" />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Branch Selector Modal */}
      <Modal visible={branchSelectorVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Select Branch Filter</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setBranchSelectorVisible(false)} style={styles.modalClose}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TouchableOpacity accessibilityRole="button"
                style={[
                  styles.branchSelectItem,
                  selectedBranchId === 'ALL' && styles.branchSelectItemActive,
                ]}
                onPress={() => {
                  setSelectedBranchId('ALL');
                  setBranchSelectorVisible(false);
                }}
              >
                <School size={16} color={selectedBranchId === 'ALL' ? Theme.colors.card : colors.textMuted} />
                <AppText style={[
                  styles.branchSelectItemText,
                  selectedBranchId === 'ALL' && styles.branchSelectItemTextActive,
                ]} weight="bold">
                  All Branches (No Filter)
                </AppText>
              </TouchableOpacity>

              <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
                {branches.map(b => (
                  <TouchableOpacity accessibilityRole="button"
                    key={b.branch_id}
                    style={[
                      styles.branchSelectItem,
                      selectedBranchId === b.branch_id && styles.branchSelectItemActive,
                    ]}
                    onPress={() => {
                      setSelectedBranchId(b.branch_id);
                      setBranchSelectorVisible(false);
                    }}
                  >
                    <School size={16} color={selectedBranchId === b.branch_id ? Theme.colors.card : colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <AppText style={[
                        styles.branchSelectItemText,
                        selectedBranchId === b.branch_id && styles.branchSelectItemTextActive,
                      ]} weight="bold">
                        {b.branch_name}
                      </AppText>
                      <AppText style={[
                        styles.branchSelectItemSub,
                        selectedBranchId === b.branch_id && styles.branchSelectItemSubActive,
                      ]}>
                        ID: {b.branch_id} | Principal: {b.principal_name || 'None'}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.modalFooter}>
              <AppButton title="Close" onPress={() => setBranchSelectorVisible(false)} type="secondary" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    marginBottom: 0,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xs,
  },
  heroProfileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroGreetingBox: {
    flex: 1,
  },
  heroGreetingText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  heroNameText: {
    fontSize: 16,
    color: Theme.colors.card,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 6,
    paddingBottom: Theme.spacing.xs,
  },
  welcomeTitle: {
    fontSize: 20,
    lineHeight: 24,
    color: Theme.colors.card,
    letterSpacing: -0.5,
  },
  welcomeSub: {
    ...Theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dateText: {
    ...Theme.typography.caption,
    ...Theme.typography.label,
    color: Theme.colors.card,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
    marginTop: -40,
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Theme.colors.error,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    zIndex: 1,
  },
  badgeText: {
    color: Theme.colors.card,
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerStatsGrid: {
    marginTop: Theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  headerStatCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    width: '46%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  headerStatLabel: {
    ...Theme.typography.label,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '600',
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.card,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  addBranchHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginRight: Theme.spacing.xs,
  },
  addBranchHeaderBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.label,
    fontWeight: '700',
  },
  schoolCodeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  schoolCodeText: {
    color: Theme.colors.card,
    ...Theme.typography.label,
    fontWeight: '700',
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
    color: colors.textPrimary,
    lineHeight: 24,
  },
  quickAccessPanel: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
  },
  gridItem: {
    width: '23%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridLabelContainer: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gridLabel: {
    ...Theme.typography.label,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    padding: Theme.spacing.xs,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentedTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentedTabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  quickActionItem: {
    width: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    ...Theme.typography.label,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  kpiBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Theme.spacing.xs,
  },
  branchSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  branchSelectItemActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  branchSelectItemText: {
    ...Theme.typography.body,
    color: colors.textPrimary,
  },
  branchSelectItemTextActive: {
    color: Theme.colors.card,
  },
  branchSelectItemSub: {
    ...Theme.typography.label,
    color: colors.textMuted,
    marginTop: 2,
  },
  branchSelectItemSubActive: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
  branchManagementCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: Theme.spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  branchManagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
    marginBottom: 6,
  },
  branchManagementName: {
    ...Theme.typography.bodyMd,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  branchManagementId: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  branchManagementDetails: {
    gap: 4,
    marginBottom: Theme.spacing.sm,
  },
  managementDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  managementDetailLabel: {
    ...Theme.typography.label,
    color: colors.textMuted,
  },
  managementDetailVal: {
    ...Theme.typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  managementStatsRow: {
    backgroundColor: 'rgba(30, 58, 138, 0.04)',
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: 6,
    marginTop: Theme.spacing.xs,
    alignItems: 'center',
  },
  managementStatsText: {
    ...Theme.typography.label,
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  branchManagementActions: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  managementBtnView: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 28,
    borderRadius: 6,
    backgroundColor: Theme.colors.primary,
  },
  managementBtnViewText: {
    ...Theme.typography.caption,
    color: Theme.colors.card,
  },
  managementBtnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  managementBtnEditText: {
    ...Theme.typography.caption,
    color: Theme.colors.primaryLight,
  },

  headerStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  mainContentWrapper: {
    padding: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: Theme.colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  errorText: {
    ...Theme.typography.body,
    color: colors.textMuted,
  },

  topBar: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroAvatarWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  heroHeaderSpacer: {
    width: 42,
    height: 42,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Theme.colors.card,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSub: {
    ...Theme.typography.body,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: Theme.spacing.md,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroStatusChip: {
    paddingHorizontal: 14,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroStatusText: {
    color: '#dbeafe',
    ...Theme.typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroRefreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  topBarIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarIconText: {
    fontSize: 20,
    color: colors.accent,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    ...Theme.typography.body,
    color: colors.textMuted,
    marginTop: Theme.spacing.xs,
    letterSpacing: 0.1,
  },
  topBarRight: {
    gap: 14,
  },
  branchSelector: {
    marginBottom: Theme.spacing.md,
  },
  branchSelectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 10,
  },
  branchSelectorField: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branchSelectorValue: {
    flex: 1,
    ...Theme.typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  branchChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  branchChip: {
    paddingHorizontal: 14,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 22,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  branchChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  branchChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  branchChipTextActive: {
    color: Theme.colors.card,
    fontWeight: '700',
  },
  viewButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  viewBtn: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  viewBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  viewBtnTextActive: {
    color: Theme.colors.card,
  },
  viewAllTextBtn: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
  },
  viewAllText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '700',
  },
  quickAccessHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  quickAccessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  quickAccessTitleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  refreshBtn: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  loader: {
    marginVertical: 20,
  },
  profileSectionCard: {
    marginBottom: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileSectionContent: {
    flex: 1,
    gap: 8,
  },
  profileDetailRow: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 8,
  },
  profileDetailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  profileDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileSectionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  profileSectionBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.caption,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 0,
    marginBottom: 28,
  },
  kpiCard: {
    height: 154,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiBadgeUp: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  kpiBadgeDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  kpiBadgeText: {
    ...Theme.typography.label,
    fontWeight: '700',
    color: colors.accent,
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: Theme.spacing.sm,
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: Theme.spacing.xs,
    letterSpacing: -0.5,
  },
  kpiSub: {
    ...Theme.typography.caption,
    color: colors.textMuted,
    fontWeight: '500',
  },

  cardTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },

  chartCard: {
    padding: Theme.spacing.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartEmpty: {
    padding: 30,
    alignItems: 'center',
  },
  chartEmptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 20,
    paddingVertical: 14,
  },
  chartBarGroup: {
    alignItems: 'center',
    width: 56,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 130,
  },
  chartBarPassed: {
    width: 12,
    backgroundColor: colors.success,
    borderRadius: 3,
    minHeight: 2,
  },
  chartBarFailed: {
    width: 12,
    backgroundColor: colors.error,
    borderRadius: 3,
    minHeight: 2,
  },
  chartLabel: {
    ...Theme.typography.label,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  chartPassRate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  chartStatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 8,
  },
  chartStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '48%',
    alignItems: 'center',
  },
  chartStatLabel: {
    ...Theme.typography.label,
    color: colors.textMuted,
    fontWeight: '600',
  },
  chartStatValue: {
    ...Theme.typography.label,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  overviewCard: {
    padding: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20,
  },
  overviewSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: Theme.spacing.sm,
    lineHeight: 20,
  },
  statusChips: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 20,
  },
  statusChipHealthy: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusChipAttention: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusChipInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    borderRadius: 8,
  },
  tableHeaderText: {
    ...Theme.typography.label,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colBranch: { width: '15%' },
  colPrincipal: { width: '20%' },
  colStatus: { width: '12%' },
  colTeachers: { width: '8%' },
  colStudents: { width: '8%' },
  colClasses: { width: '8%' },
  colSections: { width: '8%' },
  colAction: { width: '10%' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  tableCell: {
    justifyContent: 'center',
  },
  branchNameCell: {
    ...Theme.typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  branchIdCell: {
    ...Theme.typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  directorNameCell: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  directorIdCell: {
    ...Theme.typography.caption,
    color: colors.textMuted,
  },
  directorEmailCell: {
    ...Theme.typography.caption,
    color: colors.textMuted,
  },
  numberCell: {
    ...Theme.typography.bodyMd,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  viewBranchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 9,
    borderRadius: 10,
  },
  viewBranchBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.caption,
    fontWeight: '700',
  },
  branchContainersCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  branchContainersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  branchContainersActions: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    ...Theme.typography.body,
    minWidth: 220,
    color: colors.textPrimary,
    backgroundColor: Theme.colors.background,
    fontWeight: '600',
  },
  viewAllBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewAllBtnText: {
    color: Theme.colors.card,
    fontSize: 13,
    fontWeight: '700',
  },
  showLessBtn: {
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  showLessBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  branchCardsGrid: {
    gap: 16,
  },
  branchCard: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  branchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  branchName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  branchId: {
    ...Theme.typography.caption,
    color: colors.textMuted,
    marginTop: Theme.spacing.xs,
    fontWeight: '600',
  },
  branchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.sm,
  },
  branchPrincipal: {
    ...Theme.typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  branchEmail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  branchStats: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: Theme.spacing.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  branchStat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  branchStatLabel: {
    ...Theme.typography.label,
    color: colors.textMuted,
    marginTop: Theme.spacing.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  branchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  branchFooterText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  branchViewBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 12,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  branchViewBtnText: {
    ...Theme.typography.caption,
    color: Theme.colors.card,
  },
  branchCardPagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: Theme.spacing.lg,
  },
  paginationInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  pageBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pageInfo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginHorizontal: 12,
  },
  branchesViewCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  branchesViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  addBranchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBranchBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.body,
    fontWeight: '700',
  },
  branchSearchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    ...Theme.typography.body,
    marginBottom: 20,
    color: colors.textPrimary,
    backgroundColor: Theme.colors.background,
    fontWeight: '600',
  },
  branchesListHeader: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  branchesHeaderText: {
    ...Theme.typography.label,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colBranchId: { width: '10%' },
  colBranchName: { width: '15%' },
  colEmpId: { width: '12%' },
  colPrincipalName: { width: '12%' },
  colPrincipalEmail: { width: '18%' },
  colBranchStatus: { width: '10%' },
  colCreated: { width: '12%' },
  colActions: { width: '11%' },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  branchRowId: {
    width: '10%',
    ...Theme.typography.caption,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '800',
    color: colors.accent,
  },
  branchRowCell: {
    width: '15%',
    ...Theme.typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  branchRowDate: {
    width: '12%',
    ...Theme.typography.caption,
    color: colors.textMuted,
  },
  branchRowActions: {
    width: '11%',
    flexDirection: 'row',
    gap: 8,
  },
  editRowBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editRowBtnText: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: colors.accent,
  },
  deleteRowBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteRowBtnText: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: colors.error,
  },
  viewRowBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewRowBtnText: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: colors.success,
  },
  editInput: {
    width: '15%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: Theme.colors.background,
  },
  editStatusContainer: {
    width: '10%',
    flexDirection: 'row',
    gap: 6,
  },
  editStatusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editStatusBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  editStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  editStatusTextActive: {
    color: Theme.colors.card,
  },
  saveBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 6,
  },
  saveBtnText: {
    ...Theme.typography.body,
  },
  cancelBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 6,
  },
  cancelBtnText: {
    ...Theme.typography.body,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    ...Theme.typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.error,
  },
  healthBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.2,
    marginTop: Theme.spacing.xs,
  },
  healthText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    ...Theme.typography.body,
    fontWeight: '600',
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.card,
    letterSpacing: -0.3,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  modalBody: {
    padding: 20,
  },
  modalPlaceholder: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  modalNote: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  modalFooter: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingsViewCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    marginBottom: 28,
  },
  settingsViewHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: Theme.spacing.md,
    marginBottom: 20,
  },
  settingsBody: {
    gap: 20,
  },
  settingsProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    padding: Theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.08)',
  },
  settingsProfileName: {
    fontSize: 18,
    color: colors.textPrimary,
  },
  settingsProfileRole: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  settingsDetailsList: {
    gap: 12,
  },
  settingsDetailItem: {
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsDetailLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  settingsDetailValue: {
    ...Theme.typography.body,
    color: colors.textPrimary,
  },
  gridLinesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    borderStyle: 'dashed',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 60,
    height: 420,
    width: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    borderStyle: 'dashed',
  },
  decorCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  decorCircleInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Theme.colors.blue,
    shadowColor: Theme.colors.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 1,
  },
  decorCircleCenter: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  decorCircleCenterInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Theme.colors.success,
    shadowColor: Theme.colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 1,
  },
});
