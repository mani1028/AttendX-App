import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { QrCode, RefreshCw } from 'lucide-react-native';
import DashboardHeroHeader from '../../components/dashboard/DashboardHeroHeader';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { useCanNavigateBack } from '../../hooks/useCanNavigateBack';
import { safeGoBack } from '../../utils/navigationHelpers';
import { visitorApi, qrApi } from '../../services/visitorApi';
import { Theme, colors } from '../../theme/tokens';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { formatErrorMessage } from '../../utils/helpers';
import {
  visitorDashboardStyles as styles,
  getSchoolCode,
  getBranchId,
  StatCard,
  VisitorRow,
  QRModal,
  FilterModal,
  type Visitor,
  type Stats,
  type QRData,
} from '../../components/visitor/visitorDashboard';

export default function VisitorDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const canGoBack = useCanNavigateBack();
  const { userName } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'checked_in' | 'all'>('pending');
  const [qrData, setQRData] = useState<QRData | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const { unreadCount } = useUnreadNotifications();

  useEffect(() => {
    const load = async () => {
      setSchoolCode(await getSchoolCode());
      setBranchId(await getBranchId());
    };
    load();
  }, []);

  const fetchData = useCallback(async () => {
    setErrorMsg('');
    const cacheKey = `visitor_list_${activeTab}_${dateFrom || 'all'}_${dateTo || 'all'}`;
    let cacheLoaded = false;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setVisitors(parsed);
          cacheLoaded = true;
          setLoadingVisitors(false);
        }
      }
      const filters: Record<string, string> = {};
      if (activeTab !== 'all') filters.status_filter = activeTab;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      const visitorsRes = await visitorApi.listVisitors(filters);
      const nextVisitors = visitorsRes.data?.data || [];
      setVisitors(nextVisitors);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(nextVisitors));
    } catch (error: any) {
      setErrorMsg(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        'You do not have permission to view visitor data.',
      );
    } finally {
      if (!cacheLoaded) setLoadingVisitors(false);
    }
  }, [activeTab, dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    const cacheKey = 'visitor_stats_cache';
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setStats(JSON.parse(cached));
        setLoadingStats(false);
      }
      const statsRes = await visitorApi.getVisitorStats();
      const nextStats = statsRes.data?.data || {};
      setStats(nextStats);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(nextStats));
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);

  useEffect(() => {
    if (!loadingVisitors) {
      setLoadingVisitors(true);
      fetchData();
    }
  }, [activeTab, dateFrom, dateTo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchStats()]);
    setRefreshing(false);
  }, [fetchData, fetchStats]);

  const handleApprove = useCallback(async (visitorId: string) => {
    try {
      await visitorApi.approveVisitor(visitorId);
      fetchData();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', formatErrorMessage(error) || 'Failed to approve visitor');
    }
  }, [fetchData, fetchStats]);

  const handleReject = useCallback(async (visitorId: string) => {
    try {
      await visitorApi.rejectVisitor(visitorId);
      fetchData();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', formatErrorMessage(error) || 'Failed to reject visitor');
    }
  }, [fetchData, fetchStats]);

  const handleCheckout = useCallback(async (visitorId: string) => {
    try {
      await visitorApi.checkoutVisitor(visitorId);
      fetchData();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', formatErrorMessage(error) || 'Failed to checkout visitor');
    }
  }, [fetchData, fetchStats]);

  const loadQRCode = useCallback(async () => {
    try {
      const res = await qrApi.getActiveQR();
      let nextQr = res.data?.data || null;
      if (!nextQr) {
        const createRes = await qrApi.generateQR(30);
        nextQr = createRes.data?.data || null;
      }
      if (!nextQr) {
        Alert.alert('Error', 'No active QR is available and failed to create a new QR');
        return;
      }
      setQRData(nextQr);
      setShowQRModal(true);
    } catch (error: any) {
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail) || 'Failed to load QR code');
    }
  }, []);

  const filteredVisitors = useMemo(() => {
    if (activeTab === 'all') return visitors;
    return visitors.filter(v => v.status === activeTab);
  }, [visitors, activeTab]);

  const pageHeaderActions = (
    <>
      <TouchableOpacity style={heroHeaderStyles.iconBtn} onPress={loadQRCode} accessibilityLabel="QR Code">
        <QrCode size={18} color={Theme.colors.card} />
      </TouchableOpacity>
      <TouchableOpacity style={heroHeaderStyles.iconBtn} onPress={onRefresh} accessibilityLabel="Refresh">
        <RefreshCw size={18} color={Theme.colors.card} />
      </TouchableOpacity>
    </>
  );

  const bodyHeaderActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity accessibilityRole="button" style={styles.qrBtn} onPress={loadQRCode}>
        <AppText style={styles.qrBtnText}>📱 QR Code</AppText>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.refreshBtn} onPress={onRefresh}>
        <Icon name="refresh-cw" size={16} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[styles.contentContainer, canGoBack && styles.contentContainerInner]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        nestedScrollEnabled
      >
        {canGoBack ? (
          <StandardPageHeader
            scrollWithContent
            containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
            title="Visitor Management"
            subtitle="Manage campus visitors and check-ins"
            onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
            rightActions={pageHeaderActions}
          />
        ) : (
          <DashboardHeroHeader
            userName={userName || 'User'}
            greetingLine="VISITOR PORTAL"
            subtitle="Manage campus visitors and check-ins."
            unreadCount={unreadCount}
            onNotificationsPress={() => navigation.navigate('Notifications')}
            showDateBadge
            fullBleed
          />
        )}

        {!canGoBack ? (
          <View style={styles.header}>
            <AppText style={styles.title}>Visitor Management</AppText>
            {bodyHeaderActions}
          </View>
        ) : null}

        {errorMsg ? (
          <View style={styles.errorContainer}>
            <AppText style={styles.errorText}>{errorMsg}</AppText>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          <StatCard title="Total Visitors" value={stats?.total_visitors || 0} loading={loadingStats} />
          <StatCard title="Today's" value={stats?.today_visitors || 0} loading={loadingStats} color={colors.accent} />
          <StatCard title="Present" value={stats?.currently_present || 0} loading={loadingStats} color={colors.success} />
          <StatCard title="Pending" value={stats?.pending_approval || 0} loading={loadingStats} color={colors.warning} />
        </View>

        <View style={styles.tabContainer}>
          {(['pending', 'checked_in', 'all'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              accessibilityRole="button"
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <AppText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'pending' ? `⏳ Pending (${stats?.pending_approval || 0})` : tab === 'checked_in' ? `✅ Checked In (${stats?.currently_present || 0})` : '📋 All'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {(dateFrom || dateTo) ? (
          <View style={styles.activeFilters}>
            <AppText style={styles.activeFiltersLabel}>Active Filters:</AppText>
            {dateFrom ? <View style={styles.filterTag}><AppText style={styles.filterTagText}>From: {dateFrom}</AppText></View> : null}
            {dateTo ? <View style={styles.filterTag}><AppText style={styles.filterTagText}>To: {dateTo}</AppText></View> : null}
            <TouchableOpacity accessibilityRole="button" onPress={() => { setDateFrom(''); setDateTo(''); }}>
              <AppText style={styles.clearFiltersText}>Clear</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity accessibilityRole="button" style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
          <AppText style={styles.filterBtnText}>🔽 Filter by Date</AppText>
        </TouchableOpacity>

        {loadingVisitors ? (
          <Loader />
        ) : filteredVisitors.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <AppText style={styles.emptyIcon}>👥</AppText>
            <AppText style={styles.emptyTitle}>No visitors found</AppText>
            <AppText style={styles.emptyText}>Try adjusting your filters</AppText>
          </AppCard>
        ) : (
          filteredVisitors.map(visitor => (
            <VisitorRow
              key={visitor.id}
              visitor={visitor}
              onApprove={handleApprove}
              onReject={handleReject}
              onCheckout={handleCheckout}
            />
          ))
        )}
      </ScrollView>

      <QRModal visible={showQRModal} qrData={qrData} onClose={() => setShowQRModal(false)} />
      <FilterModal
        visible={showFilterModal}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onApply={(from, to) => { setDateFrom(from); setDateTo(to); }}
        onReset={() => { setDateFrom(''); setDateTo(''); }}
        onClose={() => setShowFilterModal(false)}
      />
    </View>
  );
}
