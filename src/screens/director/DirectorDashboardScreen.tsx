import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { motion } from '../../theme/motion';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
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
} from 'react-native';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { safeNavigate } from '../../utils/navigationHelpers';
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
  Zap,
  CreditCard,
  GitBranch,
  ShieldCheck,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Line, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import API from '../../services/api';
import { colors } from '../../theme/tokens';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AvatarBubble from '../../components/common/AvatarBubble';
import DashboardHeroHeader from '../../components/dashboard/DashboardHeroHeader';
import QuickActionGrid, { QuickActionItem } from '../../components/dashboard/QuickActionGrid';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import type { RootStackParamList } from '../../navigation/types';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import {
  getDirectorDashboardOverview,
  getDirectorBillingData,
  type DirectorDashboardStats,
} from '../../services/directorService';
import {
  getEffectiveBranchLimit,
  formatBranchLimit,
  isAtBranchLimit,
  canAddBranch,
  getNextPlanCode,
  normalizePricingPlan,
  parsePublicPricingPlans,
} from '../../utils/pricingPlans';
import {
  DirectorUpgradeChoiceModal,
} from '../../components/director/DirectorBranchUpgradeFlow';




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

interface Stats extends DirectorDashboardStats {}



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
            <Icon size={16} color={iconColor} />
          </View>
          <View style={[styles.kpiBadge, badgeUp ? styles.kpiBadgeUp : styles.kpiBadgeDown]}>
            <View style={[styles.kpiBadgeDot, { backgroundColor: badgeUp ? colors.success : colors.error }]} />
            <AppText style={[styles.kpiBadgeText, { color: badgeUp ? colors.success : colors.error }]} weight="bold">{badge}</AppText>
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
const DashboardBranchPreviewCard: React.FC<{
  branch: Branch;
  onPress: () => void;
}> = ({ branch, onPress }) => (
  <TouchableOpacity
    accessibilityRole="button"
    style={styles.dashboardBranchCard}
    onPress={onPress}
    activeOpacity={0.82}
  >
    <View style={styles.dashboardBranchTop}>
      <View style={styles.dashboardBranchIconWrap}>
        <School size={18} color={Theme.colors.primary} />
      </View>
      <View style={styles.dashboardBranchMeta}>
        <AppText style={styles.dashboardBranchName} weight="bold" numberOfLines={1}>
          {branch.branch_name}
        </AppText>
        <AppText style={styles.dashboardBranchId}>Branch ID · {branch.branch_id}</AppText>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </View>

    <View style={styles.dashboardBranchBadges}>
      <StatusBadge status={branch.branch_status} />
      <HealthBadge status={branch.health_status} />
    </View>

    <View style={styles.dashboardBranchPrincipalRow}>
      <User size={13} color={colors.textMuted} />
      <AppText style={styles.dashboardBranchPrincipal} numberOfLines={1}>
        {branch.principal_name || 'No principal assigned'}
      </AppText>
    </View>

    <View style={styles.dashboardBranchStats}>
      <View style={styles.dashboardBranchStat}>
        <Layers size={12} color={Theme.colors.primary} />
        <AppText style={styles.dashboardBranchStatText}>{branch.classes_count || 0} Classes</AppText>
      </View>
      <View style={styles.dashboardBranchStat}>
        <Users size={12} color={Theme.colors.success} />
        <AppText style={styles.dashboardBranchStatText}>{branch.teachers_count || 0} Staff</AppText>
      </View>
      <View style={styles.dashboardBranchStat}>
        <GraduationCap size={12} color={Theme.colors.warning} />
        <AppText style={styles.dashboardBranchStatText}>{branch.students_count || 0} Students</AppText>
      </View>
    </View>
  </TouchableOpacity>
);

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
          <View style={styles.managementStatItem}>
            <Layers size={12} color={Theme.colors.primary} />
            <AppText style={styles.managementStatsText}>{branch.classes_count || 0} Classes</AppText>
          </View>
          <View style={styles.managementStatDivider} />
          <View style={styles.managementStatItem}>
            <Users size={12} color={Theme.colors.success} />
            <AppText style={styles.managementStatsText}>{branch.teachers_count || 0} Staff</AppText>
          </View>
          <View style={styles.managementStatDivider} />
          <View style={styles.managementStatItem}>
            <GraduationCap size={12} color={Theme.colors.warning} />
            <AppText style={styles.managementStatsText}>{branch.students_count || 0} Students</AppText>
          </View>
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
  { label: 'Add Branch', route: 'DirectorPrincipalRegistration', icon: PlusCircle, bg: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' },
  { label: 'Upgrade', icon: Zap, bg: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed', opensUpgradeModal: true },
  { label: 'Subscription', route: 'DirectorBilling', icon: ShieldCheck, bg: 'rgba(249, 115, 22, 0.08)', color: '#f97316', params: { variant: 'subscription' } },
  { label: 'Payments', route: 'DirectorBilling', icon: CreditCard, bg: 'rgba(34, 197, 94, 0.08)', color: '#22c55e', params: { variant: 'payments' } },
  { label: 'My Profile', route: 'Profile', icon: User, bg: 'rgba(236, 72, 153, 0.08)', color: '#ec4899' },
] as const;

const formatAttendanceBadge = (total: number, pct: number, present: number | null): string => {
  if (total === 0) { return 'No data'; }
  if (pct === 0 && present === null) { return 'Not marked'; }
  return `${pct}% Present`;
};

const formatBillingDate = (value?: string) => {
  if (!value) { return '—'; }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) { return String(value).slice(0, 10); }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getPaymentStatusLabel = (status?: string) => {
  const key = String(status || '').toLowerCase();
  if (key === 'paid' || key === 'success' || key === 'captured') { return 'Paid'; }
  if (key === 'failed' || key === 'cancelled') { return 'Failed'; }
  return 'Pending';
};

export default function DirectorDashboardScreen() {
  const tabBarScrollPadding = useTabBarScrollPadding();
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
    teacherPresentToday: null,
    studentPresentToday: null,
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
  const [branchSearchTerm, setBranchSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);


  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Branch>>({});

  // Search for branches view
  const [branchViewSearchTerm, setBranchViewSearchTerm] = useState<string>('');
  const [branchViewPage, setBranchViewPage] = useState<number>(1);

  // Director details for profile card
  const [directorEmail, setDirectorEmail] = useState<string>('');
  const [directorPhone, setDirectorPhone] = useState<string>('');
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [nextPlan, setNextPlan] = useState<any>(null);

  const ROWS_PER_PAGE = 7;
  const DASHBOARD_BRANCH_LIMIT = 5;
  const DASHBOARD_PAYMENT_PREVIEW = 4;

  const branchLimit = useMemo(() => getEffectiveBranchLimit(subscription), [subscription]);
  const atBranchLimit = useMemo(
    () => isAtBranchLimit(stats.branches, branchLimit),
    [stats.branches, branchLimit],
  );
  const branchSlotsAvailable = useMemo(
    () => !loading && canAddBranch(stats.branches, branchLimit),
    [stats.branches, branchLimit, loading],
  );
  const recentPayments = useMemo(() => payments.slice(0, DASHBOARD_PAYMENT_PREVIEW), [payments]);

  const openUpgradeModal = useCallback(() => setShowUpgradeModal(true), []);

  const handleAddBranchPress = useCallback(() => {
    if (!branchSlotsAvailable) {
      openUpgradeModal();
      return;
    }
    safeNavigate(navigation, 'DirectorPrincipalRegistration');
  }, [branchSlotsAvailable, navigation, openUpgradeModal]);

  const handleUpgradePlanChoice = useCallback(() => {
    setShowUpgradeModal(false);
    safeNavigate(navigation, 'RenewalPayment', {
      upgradeMode: 'plan',
      preselectPlan: nextPlan?.id ? String(nextPlan.id) : undefined,
    });
  }, [navigation, nextPlan?.id]);

  const handleAddBranchSlotChoice = useCallback(() => {
    setShowUpgradeModal(false);
    safeNavigate(navigation, 'RenewalPayment', { upgradeMode: 'branch' });
  }, [navigation]);

  const fetchNextPlan = useCallback(async () => {
    if (!subscription) {
      setNextPlan(null);
      return;
    }
    try {
      const res = await API.get('pricing/public/plans', { suppressFallback404Log: true } as any);
      const allPlans = parsePublicPricingPlans(res.data);
      const currentPlanCode = String(subscription.plan_code || subscription.current_plan_code || 'trial');
      const nextCode = getNextPlanCode(currentPlanCode);
      if (!nextCode) {
        setNextPlan(null);
        return;
      }
      const found = allPlans.find(
        (plan) => String(plan.plan_code || '').toLowerCase() === nextCode.toLowerCase(),
      );
      setNextPlan(found ? normalizePricingPlan(found, 'monthly', Math.max(1, stats.branches || 1)) : null);
    } catch {
      setNextPlan(null);
    }
  }, [subscription, stats.branches]);

  useEffect(() => {
    fetchNextPlan();
  }, [fetchNextPlan]);

  const navigateToBranchesTab = useCallback(() => {
    const routeNames = (navigation.getState?.()?.routeNames ?? []) as string[];
    if (routeNames.includes('Branches')) {
      (navigation as any).navigate('Branches');
      return;
    }
    (navigation as any).navigate('MainTabs', { screen: 'Branches' });
  }, [navigation]);

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
    setBillingLoading(true);
    try {
      const [{ stats: statsData, branches: branchArray }, billingData] = await Promise.all([
        getDirectorDashboardOverview(schoolCode),
        getDirectorBillingData(schoolCode),
      ]);

      if (isMounted.current) {
        setStats(statsData);
        setBranches(branchArray);
        setSubscription(billingData.subscription);
        setPayments(billingData.payments);
      }

      await Promise.all([
        AsyncStorage.setItem(`director_stats_${schoolCode}`, JSON.stringify(statsData)),
        AsyncStorage.setItem(`director_branches_${schoolCode}`, JSON.stringify(branchArray)),
      ]).catch(() => { });
    } catch (err: any) {
      if (!isMounted.current) {return;}
      if (err?.response?.status === 401) {return;}
      console.error('Failed to fetch dashboard data:', err);
      if (branches.length === 0) {
        Alert.alert('Error', 'Failed to load dashboard data. Pull down to retry.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setBillingLoading(false);
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

  // Dashboard shows at most 5 branch previews
  const dashboardBranchPreview = useMemo(
    () => filteredBranches.slice(0, DASHBOARD_BRANCH_LIMIT),
    [filteredBranches],
  );

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
        teacherPresentToday: null,
        studentPresentToday: null,
      };
    }
    return stats;
  }, [selectedBranchId, selectedBranch, stats]);


  const handleKpiClick = () => {
    if (selectedBranchId === 'ALL') {
      overviewRef.current?.scrollToEnd();
    } else {
      safeNavigate(navigation, 'DirectorBranchDetails', {
        branchId: selectedBranch?.branch_id || '',
        branchName: selectedBranch?.branch_name || '',
        principalName: selectedBranch?.principal_name || '',
        principalEmail: selectedBranch?.principal_email || '',
        branchStatus: selectedBranch?.branch_status || '',
      });
    }
  };

  const handleViewBranch = (branch: Branch) => {
    safeNavigate(navigation, 'DirectorBranchDetails', {
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
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarScrollPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >


        <DashboardHeroHeader
          userName={userName || 'Director'}
          greetingLine={`GOOD ${getGreeting().toUpperCase()}`}
          subtitle={schoolCode ? `School ID: ${schoolCode} • Manage branches` : 'Manage branches'}
          unreadCount={unreadCount}
          onAvatarPress={() => safeNavigate(navigation, 'Profile')}
          onNotificationsPress={() => safeNavigate(navigation, 'Notifications')}
          onRefreshPress={onRefresh}
          refreshing={loading}
          pageTitle="Director Control Center"
          showDateBadge
          fullBleed
        />

        <View style={innerPageLayoutStyles.contentFront}>
          {view === 'dashboard' && (
            <View style={styles.statsGrid}>
              <KpiCard
                title={selectedBranchId === 'ALL' ? 'Branches' : 'Branch'}
                value={displayedStats.branches}
                sub={`${displayedStats.activeBranches} active branch${displayedStats.activeBranches === 1 ? '' : 'es'}`}
                icon={School}
                iconBg="rgba(59, 130, 246, 0.12)"
                iconColor={Theme.colors.blue}
                badge={displayedStats.inactiveBranches > 0 ? `${displayedStats.inactiveBranches} Inactive` : 'All Active'}
                badgeUp={displayedStats.inactiveBranches === 0}
                cardStyle={styles.kpiCardHalf}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Teachers"
                value={displayedStats.teachers}
                sub="Total school staff"
                icon={Users}
                iconBg="rgba(16, 185, 129, 0.12)"
                iconColor={Theme.colors.success}
                badge={
                  displayedStats.teachers === 0
                    ? 'No staff'
                    : formatAttendanceBadge(
                        displayedStats.teachers,
                        displayedStats.teacherAttendanceToday,
                        displayedStats.teacherPresentToday,
                      )
                }
                badgeUp={displayedStats.teacherAttendanceToday >= 75}
                cardStyle={styles.kpiCardHalf}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Students"
                value={displayedStats.students}
                sub="Enrolled students"
                icon={GraduationCap}
                iconBg="rgba(245, 158, 11, 0.12)"
                iconColor={Theme.colors.warning}
                badge={
                  displayedStats.students === 0
                    ? 'No students'
                    : formatAttendanceBadge(
                        displayedStats.students,
                        displayedStats.studentAttendanceToday,
                        displayedStats.studentPresentToday,
                      )
                }
                badgeUp={displayedStats.studentAttendanceToday >= 75}
                cardStyle={styles.kpiCardHalf}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Classes"
                value={displayedStats.classes}
                sub={`${displayedStats.sections} section${displayedStats.sections === 1 ? '' : 's'}`}
                icon={Layers}
                iconBg="rgba(124, 58, 237, 0.12)"
                iconColor="#7c3aed"
                badge={displayedStats.pendingLeaves > 0 ? `${displayedStats.pendingLeaves} Leaves` : 'No Leaves'}
                badgeUp={displayedStats.pendingLeaves === 0}
                cardStyle={styles.kpiCardHalf}
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
                <QuickActionGrid>
                  {QUICK_ACTIONS.map((action) => {
                    const IconComponent = action.icon;
                    const isAddBranch = action.label === 'Add Branch';
                    const opensUpgradeModal = 'opensUpgradeModal' in action && action.opensUpgradeModal;
                    return (
                      <QuickActionItem key={action.label}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          style={styles.gridItemInner}
                          onPress={() => {
                            if (isAddBranch) {
                              handleAddBranchPress();
                              return;
                            }
                            if (opensUpgradeModal) {
                              openUpgradeModal();
                              return;
                            }
                            safeNavigate(navigation, (action as any).route, (action as any).params);
                          }}
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
                      </QuickActionItem>
                    );
                  })}
                </QuickActionGrid>
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
                      {selectedBranchId === 'ALL' ? 'All Branches' : `Branch: ${selectedBranchId}`}
                    </AppText>
                  </View>
                  <ChevronDown size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {loading && <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />}

          {view === 'dashboard' && atBranchLimit && (
            <AppCard style={styles.branchLimitBanner}>
              <View style={styles.branchLimitTop}>
                <AlertTriangle size={20} color="#b45309" />
                <View style={{ flex: 1 }}>
                  <AppText style={styles.branchLimitTitle} weight="bold">Branch Limit Reached</AppText>
                  <AppText style={styles.branchLimitText}>
                    You have used all {stats.branches} of {formatBranchLimit(branchLimit)} branch slots on your {subscription?.current_plan_name || subscription?.current_plan || 'current'} plan.
                  </AppText>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.branchLimitBtn}
                onPress={openUpgradeModal}
              >
                <Zap size={16} color={Theme.colors.card} />
                <AppText style={styles.branchLimitBtnText} weight="bold">Upgrade</AppText>
              </TouchableOpacity>
            </AppCard>
          )}

          {view === 'dashboard' && (
            <AppCard style={styles.billingOverviewCard}>
              <View style={styles.chartHeader}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.cardTitle}>Billing Overview</AppText>
                  <AppText style={styles.branchPanelSubtitle}>Plan status and branch usage</AppText>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.viewAllBtn}
                  onPress={() => safeNavigate(navigation, 'DirectorBilling', { variant: 'subscription' })}
                >
                  <AppText style={styles.viewAllBtnText}>Manage</AppText>
                  <ChevronRight size={14} color={Theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {billingLoading && payments.length === 0 && !subscription ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 16 }} />
              ) : (
                <View style={styles.billingSummaryGrid}>
                  <View style={styles.billingSummaryItem}>
                    <AppText style={styles.billingSummaryLabel}>Current Plan</AppText>
                    <AppText style={styles.billingSummaryValue} weight="bold" numberOfLines={1}>
                      {subscription?.current_plan_name || subscription?.current_plan || 'No Active Plan'}
                    </AppText>
                  </View>
                  <View style={styles.billingSummaryItem}>
                    <AppText style={styles.billingSummaryLabel}>Status</AppText>
                    <AppText style={styles.billingSummaryValue} weight="bold" numberOfLines={1}>
                      {String(subscription?.subscription_status || subscription?.status || 'Inactive').replace(/_/g, ' ')}
                    </AppText>
                  </View>
                  <View style={styles.billingSummaryItem}>
                    <AppText style={styles.billingSummaryLabel}>Valid Until</AppText>
                    <AppText style={styles.billingSummaryValue} weight="bold">
                      {formatBillingDate(subscription?.subscription_end_at || subscription?.trial_end_at)}
                    </AppText>
                  </View>
                  <View style={styles.billingSummaryItem}>
                    <AppText style={styles.billingSummaryLabel}>Branches</AppText>
                    <AppText style={[styles.billingSummaryValue, atBranchLimit && styles.billingSummaryValueWarn]} weight="bold">
                      {stats.branches} / {formatBranchLimit(branchLimit)}
                    </AppText>
                  </View>
                </View>
              )}

              <View style={styles.billingActionsRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.billingActionBtn, styles.billingActionBtnPrimary]}
                  onPress={openUpgradeModal}
                >
                  <Zap size={15} color={Theme.colors.card} />
                  <AppText style={[styles.billingActionText, styles.billingActionTextOnPrimary]} weight="semibold">Upgrade</AppText>
                </TouchableOpacity>
                {branchSlotsAvailable ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.billingActionBtn}
                    onPress={handleAddBranchPress}
                  >
                    <PlusCircle size={15} color={Theme.colors.primary} />
                    <AppText style={styles.billingActionText} weight="semibold">Add Branch</AppText>
                  </TouchableOpacity>
                ) : null}
              </View>
            </AppCard>
          )}

          {view === 'dashboard' && (
            <AppCard style={styles.paymentHistoryCard}>
              <View style={styles.chartHeader}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.cardTitle}>Payment History</AppText>
                  <AppText style={styles.branchPanelSubtitle}>
                    {payments.length} transaction{payments.length === 1 ? '' : 's'} recorded
                  </AppText>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.viewAllBtn}
                  onPress={() => safeNavigate(navigation, 'DirectorBilling', { variant: 'payments' })}
                >
                  <AppText style={styles.viewAllBtnText}>View All</AppText>
                  <ChevronRight size={14} color={Theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {recentPayments.length === 0 ? (
                <View style={styles.branchEmptyState}>
                  <CreditCard size={24} color={colors.textMuted} />
                  <AppText style={styles.branchEmptyTitle} weight="semibold">No payments yet</AppText>
                  <AppText style={styles.branchEmptyText}>Renewal and upgrade payments will appear here.</AppText>
                </View>
              ) : (
                <View style={styles.paymentPreviewList}>
                  {recentPayments.map((payment, index) => (
                    <TouchableOpacity
                      key={payment.id || index}
                      accessibilityRole="button"
                      style={[styles.paymentPreviewRow, index > 0 && styles.paymentPreviewRowBorder]}
                      onPress={() => safeNavigate(navigation, 'DirectorBilling', { variant: 'payments' })}
                    >
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.paymentPreviewTitle} weight="semibold" numberOfLines={1}>
                          {payment.plan_name || 'Subscription Payment'}
                        </AppText>
                        <AppText style={styles.paymentPreviewMeta}>
                          {formatBillingDate(payment.paid_at || payment.created_at)} · {getPaymentStatusLabel(payment.status)}
                        </AppText>
                      </View>
                      <AppText style={styles.paymentPreviewAmount} weight="bold">
                        ₹{payment.amount || '0'}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </AppCard>
          )}

          {/* Dashboard View */}
          {view === 'dashboard' && (
            <>


              {/* Branch Management Section in Dashboard */}
              <AppCard style={styles.branchManagementPanel}>
                <View style={styles.chartHeader}>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.cardTitle}>Branch Management</AppText>
                    <AppText style={styles.branchPanelSubtitle}>
                      {filteredBranches.length} branch{filteredBranches.length === 1 ? '' : 'es'} registered
                    </AppText>
                  </View>
                  {filteredBranches.length > DASHBOARD_BRANCH_LIMIT && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.viewAllBtn}
                      onPress={navigateToBranchesTab}
                    >
                      <AppText style={styles.viewAllBtnText}>View All</AppText>
                      <ChevronRight size={14} color={Theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                {dashboardBranchPreview.length === 0 ? (
                  <View style={styles.branchEmptyState}>
                    <School size={28} color={colors.textMuted} />
                    <AppText style={styles.branchEmptyTitle} weight="semibold">No branches yet</AppText>
                    <AppText style={styles.branchEmptyText}>Add your first branch to get started.</AppText>
                  </View>
                ) : (
                  <View style={styles.branchCardsGrid}>
                    {dashboardBranchPreview.map(branch => (
                      <DashboardBranchPreviewCard
                        key={branch.branch_id}
                        branch={branch}
                        onPress={navigateToBranchesTab}
                      />
                    ))}
                  </View>
                )}

                {filteredBranches.length > DASHBOARD_BRANCH_LIMIT && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.viewAllFooterBtn}
                    onPress={navigateToBranchesTab}
                  >
                    <AppText style={styles.viewAllFooterText}>
                      View all {filteredBranches.length} branches
                    </AppText>
                    <ChevronRight size={16} color={Theme.colors.primary} />
                  </TouchableOpacity>
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
                <TouchableOpacity accessibilityRole="button" style={styles.addBranchBtn} onPress={handleAddBranchPress}>
                  <AppText style={styles.addBranchBtnText}>
                    {branchSlotsAvailable ? '+ Add Branch' : 'Upgrade'}
                  </AppText>
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
      <Modal visible={editBranchModalVisible} transparent animationType="slide" onRequestClose={cancelEdit}>
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
      <Modal visible={branchSelectorVisible} transparent animationType="slide" onRequestClose={() => setBranchSelectorVisible(false)}>
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
                  All Branches
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

      <DirectorUpgradeChoiceModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        nextPlan={nextPlan}
        currentPlanName={subscription?.current_plan_name || subscription?.current_plan || subscription?.plan_code}
        onUpgradePlan={handleUpgradePlanChoice}
        onAddBranchSlot={handleAddBranchSlotChoice}
      />
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
    rowGap: 12,
    columnGap: 12,
    marginBottom: 20,
    marginTop: -24,
    zIndex: 1,
    position: 'relative',
    ...Platform.select({ android: { elevation: 4 } }),
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 },
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
  gridItemInner: {
    alignItems: 'center',
    width: '100%',
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
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 12,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
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
  branchManagementPanel: {
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
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
  branchPanelSubtitle: {
    ...Theme.typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  viewAllFooterBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: Theme.colors.background,
  },
  viewAllFooterText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  branchEmptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  branchEmptyTitle: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  branchEmptyText: {
    ...Theme.typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  dashboardBranchCard: {
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  dashboardBranchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dashboardBranchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardBranchMeta: {
    flex: 1,
    minWidth: 0,
  },
  dashboardBranchName: {
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  dashboardBranchId: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  dashboardBranchBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  dashboardBranchPrincipalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dashboardBranchPrincipal: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  dashboardBranchStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  dashboardBranchStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 58, 138, 0.04)',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  dashboardBranchStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  branchManagementCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 138, 0.04)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: Theme.spacing.xs,
  },
  managementStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  managementStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
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
    paddingHorizontal: HEADER_CONSTANTS.DASHBOARD_HORIZONTAL,
  },
  mainContentWrapper: {
    padding: 18,
    zIndex: 1,
    position: 'relative',
    ...Platform.select({ android: { elevation: 4 } }),
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
    minHeight: 126,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
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
  kpiCardHalf: {
    width: '48%',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiBadgeUp: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  kpiBadgeDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  kpiBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.accent,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  kpiSub: {
    fontSize: 11,
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
  branchLimitBanner: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  branchLimitTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  branchLimitTitle: {
    fontSize: 15,
    color: '#92400e',
    marginBottom: 4,
  },
  branchLimitText: {
    fontSize: 13,
    color: '#b45309',
    lineHeight: 18,
  },
  branchLimitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  branchLimitBtnText: {
    color: Theme.colors.card,
    fontSize: 14,
  },
  billingOverviewCard: {
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  billingSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  billingSummaryItem: {
    width: '48%',
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  billingSummaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  billingSummaryValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  billingSummaryValueWarn: {
    color: '#b45309',
  },
  billingActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  billingActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: Theme.colors.background,
  },
  billingActionBtnPrimary: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  billingActionText: {
    fontSize: 12,
    color: Theme.colors.primary,
  },
  billingActionTextOnPrimary: {
    color: Theme.colors.card,
  },
  paymentHistoryCard: {
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  paymentPreviewList: {
    gap: 0,
  },
  paymentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  paymentPreviewRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentPreviewTitle: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  paymentPreviewMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentPreviewAmount: {
    fontSize: 15,
    color: Theme.colors.primary,
  },

});
