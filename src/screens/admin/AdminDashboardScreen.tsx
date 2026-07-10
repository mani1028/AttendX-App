import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { Theme } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp, useRoute } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import * as adminService from '../../services/adminService';
import { colors } from '../../theme/tokens';
import AppButton from '../../components/common/AppButton';
import DashboardHeroHeader from '../../components/dashboard/DashboardHeroHeader';
import {
  AdminStatsSection,
  AdminExpiringAlertBanner,
  AdminQuickActionsSection,
  AdminSchoolFilterBar,
  AdminSchoolListSection,
  AdminSchoolFormModal,
  AdminSubscriptionModal,
  countExpiringSchools,
  type AdminSchool,
  type AdminStats,
  type AgentPermissions,
} from '../../components/admin/dashboard';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { formatErrorMessage } from '../../utils/helpers';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';

const ITEMS_PER_PAGE = 8;

export default function AdminDashboardScreen() {
  const tabBarScrollPadding = useTabBarScrollPadding();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { userName, setTabBarVisible, userRole } = useAuth();
  const isAgent = userRole?.toLowerCase() === 'agent';
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const { unreadCount } = useUnreadNotifications();
  const [agentPermissions, setAgentPermissions] = useState<AgentPermissions>({
    can_register_school: true,
    can_view_payments: true,
    can_edit_features: true,
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminSchool | null>(null);
  const [subscriptionSchool, setSubscriptionSchool] = useState<AdminSchool | null>(null);

  const fetchAgentPermissions = async () => {
    if (!isAgent) { return; }
    try {
      const res = await adminService.getAgentMe();
      if (res?.ok && res?.agent) {
        setAgentPermissions({
          can_register_school: res.agent.can_register_school ?? false,
          can_view_payments: res.agent.can_view_payments ?? false,
          can_edit_features: res.agent.can_edit_features ?? false,
        });
      }
    } catch (e) {
      console.warn('Failed to fetch agent permissions', e);
    }
  };

  const fetchSchools = async (isRefresh = false) => {
    const role = await storage.getString(StorageKeys.USER_ROLE) || 'admin';
    const cacheKey = `admin_schools_cache_${role}`;
    let cacheLoaded = false;

    if (!isRefresh) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setSchools(JSON.parse(cached));
          cacheLoaded = true;
        }
      } catch (e) {
        console.warn('Failed to load schools cache', e);
      }
    }

    if (isRefresh) {
      setLoading(false);
    } else if (!cacheLoaded) {
      setLoading(true);
    }

    try {
      const data = await adminService.getAllSchools();
      setSchools(data);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err: any) {
      console.error('Error fetching schools:', err);
      if (err.response?.status === 401) {
        // Global API interceptor handles logout; avoid invalid stack navigation.
      } else if (!isRefresh) {
        Alert.alert('Error', 'Failed to load schools');
      }
    } finally {
      if (!isRefresh || !cacheLoaded) {
        setLoading(false);
      }
    }
  };

  const fetchStats = async () => {
    const role = await storage.getString(StorageKeys.USER_ROLE) || 'admin';
    const cacheKey = `admin_stats_cache_${role}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setStats(JSON.parse(cached));
      }
    } catch (e) {}

    try {
      const statsData = await adminService.getSubscriptionStats();
      setStats(statsData);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(statsData));
    } catch (err) {
      console.error('Stats not available', err);
    }
  };

  useEffect(() => {
    setTabBarVisible(true);
    fetchSchools();
    fetchStats();
    if (isAgent) {
      fetchAgentPermissions();
    }
    return () => setTabBarVisible(true);
  }, []);

  useEffect(() => {
    if (route.params?.openCreateModal) {
      if (isAgent && !agentPermissions.can_register_school) {
        Alert.alert('Permission Denied', 'You do not have permission to register schools.');
      } else {
        setCreateModalOpen(true);
      }
      navigation.setParams({ openCreateModal: undefined } as any);
    }
  }, [route.params?.openCreateModal, isAgent, agentPermissions.can_register_school, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const promises: Promise<unknown>[] = [fetchSchools(true), fetchStats()];
    if (isAgent) {
      promises.push(fetchAgentPermissions());
    }
    await Promise.all(promises);
    setRefreshing(false);
  }, [isAgent]);

  const handleScroll = useScrollTabBar();

  const handleResendCredentials = async (school: AdminSchool) => {
    try {
      await adminService.resendCredentials(school.id);
      Alert.alert('Success', 'Credentials resent to the registered school email');
    } catch (err: any) {
      Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to resend credentials');
    }
  };

  const handleSendReminder = async (school: AdminSchool) => {
    try {
      await adminService.sendReminder(school.id);
      Alert.alert('Success', `Reminder sent to ${school.email}`);
    } catch (err: any) {
      Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to send reminder');
    }
  };

  const filteredSchools = useMemo(() => {
    let filtered = [...schools];

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(s => s.status === 'active');
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(s => s.status === 'inactive');
      } else {
        filtered = filtered.filter(s => s.subscription_status === statusFilter);
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.school_id || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.current_plan_name || '').toLowerCase().includes(q) ||
        (s.subscription_status || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [schools, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / ITEMS_PER_PAGE));
  const paginatedSchools = filteredSchools.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const expiringCount = useMemo(() => countExpiringSchools(schools), [schools]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const refreshData = () => {
    fetchSchools();
    fetchStats();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarScrollPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <DashboardHeroHeader
          userName={userName || 'Admin'}
          greetingLine={isAgent ? 'AGENT PORTAL' : 'ADMIN PORTAL'}
          subtitle="Your schools at a glance"
          unreadCount={unreadCount}
          onAvatarPress={() => (navigation as any).navigate('Profile')}
          onNotificationsPress={() => (navigation as any).navigate('Notifications')}
          onRefreshPress={onRefresh}
          refreshing={loading}
          showDateBadge
          fullBleed
          innerStyle={{ paddingHorizontal: HEADER_CONSTANTS.DASHBOARD_HORIZONTAL }}
        />

        <AdminExpiringAlertBanner count={expiringCount} />
        <AdminStatsSection stats={stats} isAgent={isAgent} agentPermissions={agentPermissions} />
        {!isAgent && <AdminQuickActionsSection navigation={navigation} />}

        <AdminSchoolFilterBar
          statusFilter={statusFilter}
          searchTerm={searchTerm}
          onStatusFilterChange={handleStatusFilterChange}
          onSearchTermChange={handleSearchTermChange}
        />

        {(!isAgent || agentPermissions.can_register_school) && (
          <AppButton
            title="Register New School"
            leftIcon={<Plus size={16} color={Theme.colors.card} />}
            onPress={() => setCreateModalOpen(true)}
          />
        )}

        <AdminSchoolListSection
          loading={loading}
          refreshing={refreshing}
          schools={paginatedSchools}
          currentPage={currentPage}
          totalPages={totalPages}
          isAgent={isAgent}
          agentPermissions={agentPermissions}
          onPageChange={setCurrentPage}
          onEdit={setEditTarget}
          onSubscription={setSubscriptionSchool}
          onResendCredentials={handleResendCredentials}
          onSendReminder={handleSendReminder}
          onViewInfo={(selectedSchool) =>
            (navigation as any).navigate('SchoolDetails', {
              schoolId: selectedSchool.id,
              schoolName: selectedSchool.name,
            })
          }
        />
      </ScrollView>

      <AdminSchoolFormModal
        visible={createModalOpen}
        mode="create"
        onClose={() => setCreateModalOpen(false)}
        onSuccess={refreshData}
        isAgent={isAgent}
        agentPermissions={agentPermissions}
      />
      <AdminSchoolFormModal
        visible={!!editTarget}
        mode="edit"
        initialData={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={refreshData}
        isAgent={isAgent}
        agentPermissions={agentPermissions}
      />
      <AdminSubscriptionModal
        visible={!!subscriptionSchool}
        school={subscriptionSchool}
        onClose={() => setSubscriptionSchool(null)}
        onSuccess={refreshData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  contentContainer: {
    paddingHorizontal: HEADER_CONSTANTS.DASHBOARD_HORIZONTAL,
  },
});
