import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { Theme, C } from '../../theme/tokens';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import {
  BarChart3,
  Bell,
  Calendar,
  CircleDollarSign,
  Clock,
  CreditCard,
  TrendingUp,
  Users,
  Wallet,
  CalendarCheck,
  ReceiptText,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import DashboardHeroHeader from '../../components/dashboard/DashboardHeroHeader';
import { innerPageLayoutStyles, SCROLL_PAGE_GUTTER } from '../../components/layout/innerPageLayoutStyles';
import QuickActionGrid, { QuickActionItem } from '../../components/dashboard/QuickActionGrid';
import type { RootStackParamList } from '../../navigation/types';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

import { getDashboardSummary } from '../../services/accountantService';
import { accountantDashboardStyles as styles } from '../../components/accountant/accountantDashboard/accountantDashboardStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const STAT_CARD_WIDTH = (SCREEN_WIDTH - SCROLL_PAGE_GUTTER * 2 - CARD_GAP) / 2;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Morning';
  }
  if (hour < 17) {
    return 'Afternoon';
  }
  return 'Evening';
}

type DashboardSummary = {
  total_fees_collected: number;
  total_pending_fees: number;
  total_expenses: number;
  net_balance: number;
};

const DEFAULT_SUMMARY: DashboardSummary = {
  total_fees_collected: 0,
  total_pending_fees: 0,
  total_expenses: 0,
  net_balance: 0,
};

/**
 * Safe date formatting without relying on Intl API
 * Works around React Native Intl limitations
 */
const formatDateSafe = (date: Date | string): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {return '—';}

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();

    return `${month} ${day}`;
  } catch {
    return '—';
  }
};

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {return value;}
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactCurrency(value: number): string {
  const absoluteValue = Math.abs(value);
  const prefix = value < 0 ? '-' : '';

  if (absoluteValue >= 10000000) {
    return `${prefix}₹${(absoluteValue / 10000000).toFixed(1)}Cr`;
  }
  if (absoluteValue >= 100000) {
    return `${prefix}₹${(absoluteValue / 100000).toFixed(1)}L`;
  }
  if (absoluteValue >= 1000) {
    return `${prefix}₹${(absoluteValue / 1000).toFixed(1)}K`;
  }

  return formatCurrency(value);
}

export default function AccountantDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tabBarScrollPadding = useTabBarScrollPadding();
  const { userName, setTabBarVisible } = useAuth();
  const { unreadCount } = useUnreadNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [schoolCode, setSchoolCode] = useState('');
  const [summary, setSummary] = useState<DashboardSummary>(DEFAULT_SUMMARY);
  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  useEffect(() => {
    const loadSchoolCode = async () => {
      try {
        const code =
          (await AsyncStorage.getItem('school_code')) ||
          (await AsyncStorage.getItem('schoolCode')) ||
          (await AsyncStorage.getItem('school_id')) ||
          (await AsyncStorage.getItem('schoolId')) ||
          '';
        setSchoolCode(code);
      } catch (error) {
        console.error('Error loading school code:', error);
        setSchoolCode('');
      }
    };

    loadSchoolCode();
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!schoolCode) {
      setLoadingSummary(false);
      return;
    }

    const cacheKey = `accountant_dashboard_summary_${schoolCode}`;
    let hasCachedSummary = false;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setSummary(JSON.parse(cached));
        setLoadingSummary(false);
        hasCachedSummary = true;
      }
    } catch (cacheError) {
      console.warn('Failed to load accountant dashboard cache:', cacheError);
    }

    try {
      if (!hasCachedSummary) {
        setLoadingSummary(true);
      }
      const data = await getDashboardSummary(schoolCode);
      const nextSummary = {
        total_fees_collected: toNumber(data.total_fees_collected),
        total_pending_fees: toNumber(data.total_pending_fees),
        total_expenses: toNumber(data.total_expenses),
        net_balance: toNumber(data.net_balance),
      };
      setSummary(nextSummary);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(nextSummary));
    } catch (error) {
      console.error('Error fetching accountant dashboard summary:', error);
      setSummary(DEFAULT_SUMMARY);
    } finally {
      setLoadingSummary(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  }, [fetchSummary]);
  const handleScroll = useScrollTabBar();


  const collectionRate = summary.total_fees_collected + summary.total_pending_fees > 0
    ? (summary.total_fees_collected / (summary.total_fees_collected + summary.total_pending_fees)) * 100
    : 0;
  const safeCollectionRate = Math.max(0, Math.min(100, collectionRate));
  const contentBottomPadding = tabBarScrollPadding;

  const summaryCards = [
    {
      label: 'Total Fees Collected',
      value: summary.total_fees_collected,
      icon: CircleDollarSign,
      iconColor: Theme.colors.violet,
      tint: 'rgba(102, 72, 220, 0.10)',
    },
    {
      label: 'Pending Fees',
      value: summary.total_pending_fees,
      icon: Clock,
      iconColor: '#f97316',
      tint: 'rgba(249, 115, 22, 0.10)',
    },
    {
      label: 'Total Expenses',
      value: summary.total_expenses,
      icon: TrendingUp,
      iconColor: '#a855f7',
      tint: 'rgba(168, 85, 247, 0.10)',
    },
    {
      label: 'Net Balance',
      value: summary.net_balance,
      icon: Wallet,
      iconColor: '#16a34a',
      tint: 'rgba(22, 163, 74, 0.10)',
    },
  ];

  const quickActions = [
    { label: 'Collections', icon: CreditCard, route: 'AccountantPaymentEntry', color: Theme.colors.violet, tint: 'rgba(102, 72, 220, 0.08)' },
    { label: 'Face Verify', icon: CalendarCheck, route: 'AccountantFaceVerify', color: '#ec4899', tint: 'rgba(236, 72, 153, 0.08)' },
    { label: 'My Attendance', icon: Calendar, route: 'TeacherMyAttendance', color: '#8b5cf6', tint: 'rgba(139, 92, 246, 0.08)' },
    { label: 'Settings', icon: Wallet, route: 'AccountantSettings', color: Theme.colors.textSec, tint: 'rgba(100, 116, 139, 0.08)' },
    { label: 'Payment History', icon: ReceiptText, route: 'AccountantPaymentHistory', color: Theme.colors.info, tint: 'rgba(14, 165, 233, 0.08)' },
    { label: 'Reports & Trends', icon: BarChart3, route: 'AccountantReports', color: '#a855f7', tint: 'rgba(168, 85, 247, 0.08)' },
    { label: 'Pending Dues', icon: Clock, route: 'AccountantFeeManagement', color: '#f97316', tint: 'rgba(249, 115, 22, 0.08)' },
    { label: 'Fees', icon: CircleDollarSign, route: 'AccountantFeeManagement', color: Theme.colors.success, tint: 'rgba(34, 197, 94, 0.08)' },
    { label: 'Expense Ledger', icon: TrendingUp, route: 'AccountantExpense', color: Theme.colors.error, tint: 'rgba(220, 38, 38, 0.08)' },
    { label: 'Payroll', icon: Users, route: 'AccountantPayroll', color: Theme.colors.violet, tint: 'rgba(124, 58, 237, 0.08)' },
    { label: 'Notifications', icon: Bell, route: 'Notifications', color: Theme.colors.textSec, tint: 'rgba(100, 116, 139, 0.08)' },
    { label: 'Salaries', icon: Wallet, route: 'Salaries', color: '#ca8a04', tint: 'rgba(202, 138, 4, 0.08)', isTab: true },
    { label: 'Staff Attendance', icon: CalendarCheck, route: 'AccountantStaffAttendance', color: '#06b6d4', tint: 'rgba(6, 182, 212, 0.08)' },
  ] as const;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: contentBottomPadding },
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Theme.colors.primary}
          />
        }
      >
        <DashboardHeroHeader
          userName={userName || 'Accountant'}
          greetingLine={`GOOD ${getGreeting().toUpperCase()}`}
          subtitle={
            schoolCode
              ? `School: ${schoolCode} • Finance workspace`
              : 'Collections, dues, expenses & balance'
          }
          unreadCount={unreadCount}
          onAvatarPress={() => navigation.navigate('Profile')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onRefreshPress={onRefresh}
          refreshing={refreshing}
          pageTitle="Financial Dashboard"
          pageSubtitle="Collections, dues, expenses & net balance"
          showDateBadge
          fullBleed
          style={{ marginHorizontal: -SCROLL_PAGE_GUTTER }}
        />

        <View style={innerPageLayoutStyles.contentFront}>
          <View style={styles.statsGrid}>
            {summaryCards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <View key={card.label} style={[styles.statCard, { width: STAT_CARD_WIDTH }]}>
                  <View style={[styles.statIconWrap, { backgroundColor: card.tint }]}>
                    <IconComponent size={18} color={card.iconColor} />
                  </View>
                  <AppText style={styles.statValue} weight="bold">
                    {loadingSummary ? '—' : formatCompactCurrency(card.value)}
                  </AppText>
                  <AppText style={styles.statLabel} weight="semibold" numberOfLines={2}>
                    {card.label}
                  </AppText>
                  {index === 0 && (
                    <View style={styles.rateRow}>
                      <View style={styles.rateTrack}>
                        <View style={[styles.rateFill, { width: `${safeCollectionRate}%` }]} />
                      </View>
                      <AppText style={styles.rateText} weight="semibold">
                        {safeCollectionRate.toFixed(0)}% collected
                      </AppText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.quickAccessPanel}>
            <View style={styles.panelHead}>
              <AppText style={styles.sectionTitle} weight="bold">Quick Access</AppText>
              <AppText style={styles.sectionSub}>
                Jump to collections, dues, payroll, and finance reports.
              </AppText>
            </View>

            <QuickActionGrid style={styles.quickGrid}>
              {quickActions.map(action => {
                const IconComponent = action.icon;
                return (
                  <QuickActionItem key={action.label}>
                    <TouchableOpacity
                      style={styles.quickCard}
                      activeOpacity={0.78}
                      onPress={() => {
                        if (action.label === 'Salaries') {
                          navigation.navigate('MainTabs', { screen: 'Salaries' } as any);
                        } else {
                          navigation.navigate(action.route as any);
                        }
                      }}
                    >
                      <View style={[styles.quickIconWrap, { backgroundColor: action.tint }]}>
                        <IconComponent size={20} color={action.color} strokeWidth={2.2} />
                      </View>
                      <AppText style={styles.quickLabel} weight="semibold" numberOfLines={2}>
                        {action.label}
                      </AppText>
                    </TouchableOpacity>
                  </QuickActionItem>
                );
              })}
            </QuickActionGrid>
          </View>

          <View style={styles.summaryPanel}>
            <View style={styles.summaryPanelHead}>
              <View style={styles.summaryPanelTitleWrap}>
                <AppText style={styles.summaryPanelTitle} weight="bold">Finance Snapshot</AppText>
                <AppText style={styles.summaryPanelSub}>Today&apos;s finance overview</AppText>
              </View>
              {loadingSummary ? (
                <View style={styles.syncChip}>
                  <ActivityIndicator size="small" color={Theme.colors.violet} />
                  <AppText style={styles.syncChipText} weight="semibold">Syncing</AppText>
                </View>
              ) : (
                <View style={styles.syncChip}>
                  <Calendar size={14} color={Theme.colors.violet} />
                  <AppText style={styles.syncChipText} weight="semibold">
                    {formatDateSafe(new Date())}
                  </AppText>
                </View>
              )}
            </View>

            <View style={styles.snapshotItem}>
              <View style={styles.snapshotCopy}>
                <AppText style={styles.snapshotLabel} weight="semibold">Pending dues exposure</AppText>
                <AppText style={styles.snapshotHint}>Students with unpaid or partial fees</AppText>
              </View>
              <AppText style={styles.snapshotValue} weight="bold">
                {formatCompactCurrency(summary.total_pending_fees)}
              </AppText>
            </View>

            <View style={styles.snapshotItem}>
              <View style={styles.snapshotCopy}>
                <AppText style={styles.snapshotLabel} weight="semibold">Collection rate</AppText>
                <AppText style={styles.snapshotHint}>Collected against outstanding dues</AppText>
              </View>
              <AppText style={styles.snapshotValue} weight="bold">
                {safeCollectionRate.toFixed(1)}%
              </AppText>
            </View>

            <View style={styles.snapshotItem}>
              <View style={styles.snapshotCopy}>
                <AppText style={styles.snapshotLabel} weight="semibold">Net balance</AppText>
                <AppText style={styles.snapshotHint}>Overall funds after expenses</AppText>
              </View>
              <AppText
                style={[
                  styles.snapshotValue,
                  summary.net_balance < 0 ? styles.negativeValue : styles.positiveValue,
                ]}
                weight="bold"
              >
                {formatCompactCurrency(summary.net_balance)}
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
