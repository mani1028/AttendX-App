import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Alert, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { motion } from '../../theme/motion';
import { safeNavigate } from '../../utils/navigationHelpers';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import {
  getDirectorDashboardOverview,
  getDirectorBillingData,
  type DirectorDashboardStats,
} from '../../services/directorService';
import {
  getEffectiveBranchLimit,
  isAtBranchLimit,
  canAddBranch,
  getNextPlanCode,
  normalizePricingPlan,
  parsePublicPricingPlans,
} from '../../utils/pricingPlans';
import API from '../../services/api';
import type { DirectorBranch, DirectorBranchEditData } from '../../components/director/dashboard';

const getSchoolCode = async (): Promise<string> => {
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

export function useDirectorDashboard() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { setTabBarVisible } = useAuth();
  const route = useRoute();
  const isMounted = useRef(true);

  const topBarOpacityAnim = useRef(new Animated.Value(0)).current;
  const topBarTranslateAnim = useRef(new Animated.Value(20)).current;

  const [schoolCode, setSchoolCode] = useState('');
  const [stats, setStats] = useState<DirectorDashboardStats>({
    branches: 0, teachers: 0, students: 0, activeBranches: 0, inactiveBranches: 0,
    principals: 0, classes: 0, sections: 0, pendingLeaves: 0,
    teacherAttendanceToday: 0, studentAttendanceToday: 0,
    teacherPresentToday: null, studentPresentToday: null,
  });
  const [branches, setBranches] = useState<DirectorBranch[]>([]);
  const [view, setView] = useState<'dashboard' | 'branches' | 'adddirector' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [branchSelectorVisible, setBranchSelectorVisible] = useState(false);
  const [editBranchModalVisible, setEditBranchModalVisible] = useState(false);
  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<DirectorBranchEditData>({});
  const [branchViewSearchTerm, setBranchViewSearchTerm] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [nextPlan, setNextPlan] = useState<any>(null);

  const ROWS_PER_PAGE = 7;
  const DASHBOARD_BRANCH_LIMIT = 5;
  const DASHBOARD_PAYMENT_PREVIEW = 4;

  useFocusEffect(useCallback(() => {
    setView(route.name === 'Branches' ? 'branches' : 'dashboard');
  }, [route.name]));

  useEffect(() => {
    isMounted.current = true;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(topBarOpacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(topBarTranslateAnim, { toValue: 0, useNativeDriver: true, ...motion.springs.snappy }),
      ]).start();
    }, 100);
    return () => { isMounted.current = false; };
  }, [topBarOpacityAnim, topBarTranslateAnim]);

  const branchLimit = useMemo(() => getEffectiveBranchLimit(subscription), [subscription]);
  const atBranchLimit = useMemo(() => isAtBranchLimit(stats.branches, branchLimit), [stats.branches, branchLimit]);
  const branchSlotsAvailable = useMemo(
    () => !loading && canAddBranch(stats.branches, branchLimit),
    [stats.branches, branchLimit, loading],
  );
  const recentPayments = useMemo(() => payments.slice(0, DASHBOARD_PAYMENT_PREVIEW), [payments]);

  const openUpgradeModal = useCallback(() => setShowUpgradeModal(true), []);

  const handleAddBranchPress = useCallback(() => {
    if (!branchSlotsAvailable) { openUpgradeModal(); return; }
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
    if (!subscription) { setNextPlan(null); return; }
    try {
      const res = await API.get('pricing/public/plans', { suppressFallback404Log: true } as any);
      const allPlans = parsePublicPricingPlans(res.data);
      const currentPlanCode = String(subscription.plan_code || subscription.current_plan_code || 'trial');
      const nextCode = getNextPlanCode(currentPlanCode);
      if (!nextCode) { setNextPlan(null); return; }
      const found = allPlans.find((plan) => String(plan.plan_code || '').toLowerCase() === nextCode.toLowerCase());
      setNextPlan(found ? normalizePricingPlan(found, 'monthly', Math.max(1, stats.branches || 1)) : null);
    } catch { setNextPlan(null); }
  }, [subscription, stats.branches]);

  useEffect(() => { fetchNextPlan(); }, [fetchNextPlan]);

  const navigateToBranchesTab = useCallback(() => {
    const routeNames = (navigation.getState?.()?.routeNames ?? []) as string[];
    if (routeNames.includes('Branches')) { (navigation as any).navigate('Branches'); return; }
    (navigation as any).navigate('MainTabs', { screen: 'Branches' });
  }, [navigation]);

  useEffect(() => {
    getSchoolCode().then((code) => { if (isMounted.current) setSchoolCode(code); });
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const fetchStatsAndBranches = useCallback(async () => {
    if (!schoolCode) return;
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
      ]).catch(() => {});
    } catch (err: any) {
      if (!isMounted.current || err?.response?.status === 401) return;
      console.error('Failed to fetch dashboard data:', err);
      if (branches.length === 0) Alert.alert('Error', 'Failed to load dashboard data. Pull down to retry.');
    } finally {
      if (isMounted.current) { setLoading(false); setBillingLoading(false); setRefreshing(false); }
    }
  }, [schoolCode, branches.length]);

  const loadCachedData = useCallback(async () => {
    try {
      const [cachedStats, cachedBranches] = await Promise.all([
        AsyncStorage.getItem(`director_stats_${schoolCode}`),
        AsyncStorage.getItem(`director_branches_${schoolCode}`),
      ]);
      if (!isMounted.current) return;
      if (cachedStats) setStats(JSON.parse(cachedStats));
      if (cachedBranches) {
        const parsed = JSON.parse(cachedBranches);
        setBranches(Array.isArray(parsed) ? parsed : []);
      }
      if (cachedStats || cachedBranches) setLoading(false);
    } catch (err) { console.error('Error loading cached data:', err); }
  }, [schoolCode]);

  useEffect(() => {
    if (schoolCode) { loadCachedData(); fetchStatsAndBranches(); }
  }, [schoolCode, loadCachedData, fetchStatsAndBranches]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatsAndBranches();
    setRefreshing(false);
  }, [fetchStatsAndBranches]);

  const filteredBranches = useMemo(() => {
    let filtered = Array.isArray(branches) ? branches : [];
    if (selectedBranchId !== 'ALL') filtered = filtered.filter((b) => String(b.branch_id) === String(selectedBranchId));
    const terms = [branchSearchTerm, view === 'branches' ? branchViewSearchTerm : ''].filter(Boolean);
    for (const term of terms) {
      const lower = term.toLowerCase();
      filtered = filtered.filter((b) =>
        b.branch_name?.toLowerCase().includes(lower) ||
        b.branch_id?.toLowerCase().includes(lower) ||
        b.principal_name?.toLowerCase().includes(lower),
      );
    }
    return filtered;
  }, [branches, selectedBranchId, branchSearchTerm, branchViewSearchTerm, view]);

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / ROWS_PER_PAGE));
  const paginatedBranches = filteredBranches.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const dashboardBranchPreview = useMemo(() => filteredBranches.slice(0, DASHBOARD_BRANCH_LIMIT), [filteredBranches]);

  const selectedBranch = useMemo(() => {
    if (selectedBranchId === 'ALL' || !Array.isArray(branches)) return null;
    return branches.find((b) => String(b.branch_id) === String(selectedBranchId));
  }, [branches, selectedBranchId]);

  const displayedStats = useMemo(() => {
    if (selectedBranchId === 'ALL') return stats;
    if (!selectedBranch) return stats;
    return {
      ...stats, branches: 1, principals: 1,
      teachers: selectedBranch.teachers_count || 0,
      students: selectedBranch.students_count || 0,
      activeBranches: selectedBranch.branch_status === 'ACTIVE' ? 1 : 0,
      inactiveBranches: selectedBranch.branch_status === 'INACTIVE' ? 1 : 0,
      classes: selectedBranch.classes_count || 0,
      sections: selectedBranch.sections_count || 0,
      pendingLeaves: selectedBranch.pending_leave_requests || 0,
      teacherAttendanceToday: selectedBranch.teacher_attendance_today || 0,
      studentAttendanceToday: selectedBranch.student_attendance_today || 0,
      teacherPresentToday: null, studentPresentToday: null,
    };
  }, [selectedBranchId, selectedBranch, stats]);

  const handleKpiClick = useCallback((scrollToEnd: () => void) => {
    if (selectedBranchId === 'ALL') { scrollToEnd(); return; }
    safeNavigate(navigation, 'DirectorBranchDetails', {
      branchId: selectedBranch?.branch_id || '',
      branchName: selectedBranch?.branch_name || '',
      principalName: selectedBranch?.principal_name || '',
      principalEmail: selectedBranch?.principal_email || '',
      branchStatus: selectedBranch?.branch_status || '',
    });
  }, [navigation, selectedBranch, selectedBranchId]);

  const handleViewBranch = useCallback((branch: DirectorBranch) => {
    safeNavigate(navigation, 'DirectorBranchDetails', {
      branchId: branch.branch_id, branchName: branch.branch_name,
      principalName: branch.principal_name, principalEmail: branch.principal_email,
      branchStatus: branch.branch_status,
    });
  }, [navigation]);

  const startEdit = useCallback((branch: DirectorBranch) => {
    setEditingId(branch.branch_id);
    setEditData({
      branch_name: branch.branch_name, principal_employee_id: branch.principal_employee_id,
      principal_name: branch.principal_name, principal_email: branch.principal_email,
      branch_status: branch.branch_status,
    });
    setEditBranchModalVisible(true);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null); setEditData({}); setEditBranchModalVisible(false);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    try {
      await API.put('/director/branch/update', {
        branch_id: editingId, branch_name: editData.branch_name,
        principal_employee_id: editData.principal_employee_id,
        principal_name: editData.principal_name, principal_email: editData.principal_email,
        status: editData.branch_status, password: null,
      });
      if (!isMounted.current) return;
      Alert.alert('Success', 'Branch updated successfully');
      cancelEdit();
      fetchStatsAndBranches();
    } catch (err: any) {
      if (!isMounted.current || err?.response?.status === 401) return;
      Alert.alert('Error', 'Failed to update branch');
    }
  }, [editingId, editData, cancelEdit, fetchStatsAndBranches]);

  const handleEditChange = useCallback((field: keyof DirectorBranch, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBranchSelect = useCallback((branchId: string) => {
    setSelectedBranchId(branchId);
    setBranchSelectorVisible(false);
  }, []);

  const handleBranchSearchChange = useCallback((text: string) => {
    setBranchViewSearchTerm(text);
    setCurrentPage(1);
  }, []);

  return {
    navigation, schoolCode, view, loading, refreshing, stats, branches, subscription, payments,
    billingLoading, showUpgradeModal, nextPlan, selectedBranchId, branchSelectorVisible,
    editBranchModalVisible, editData, branchViewSearchTerm, currentPage,
    branchLimit, atBranchLimit, branchSlotsAvailable, recentPayments,
    filteredBranches, totalPages, paginatedBranches, dashboardBranchPreview, displayedStats,
    topBarOpacityAnim, topBarTranslateAnim,
    ROWS_PER_PAGE, DASHBOARD_BRANCH_LIMIT,
    openUpgradeModal, handleAddBranchPress, handleUpgradePlanChoice, handleAddBranchSlotChoice,
    navigateToBranchesTab, onRefresh, handleKpiClick, handleViewBranch, startEdit, cancelEdit,
    saveEdit, handleEditChange, handleBranchSelect, handleBranchSearchChange,
    setBranchSelectorVisible, setShowUpgradeModal, setCurrentPage,
  };
}
