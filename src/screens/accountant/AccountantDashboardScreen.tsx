import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import { colors } from '../../constants/theme';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { HM_THEME } from '../../constants/hmTheme';
import { getDashboardSummary } from '../../services/accountantService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const QUICK_CARD_GAP = 10;
const STAT_CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const QUICK_CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - QUICK_CARD_GAP * 3) / 4;

/**
 * Safe date formatting without relying on Intl API
 * Works around React Native Intl limitations
 */
const formatDateSafe = (date: Date | string): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    
    return `${month} ${day}`;
  } catch {
    return '—';
  }
};

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
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

function getInitials(name?: string | null): string {
  const initials = (name || 'Accountant')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
  return initials || 'A';
}

export default function AccountantDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { userName, setTabBarVisible } = useAuth();
  const { unreadCount } = useUnreadNotifications();
  const initials = getInitials(userName);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [schoolCode, setSchoolCode] = useState('');
  const [summary, setSummary] = useState<DashboardSummary>(DEFAULT_SUMMARY);
  const lastScrollY = useRef(0);

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

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setSummary(JSON.parse(cached));
        setLoadingSummary(false);
      }
    } catch (cacheError) {
      console.warn('Failed to load accountant dashboard cache:', cacheError);
    }

    try {
      setLoadingSummary(true);
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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const collectionRate = summary.total_fees_collected + summary.total_pending_fees > 0
    ? (summary.total_fees_collected / (summary.total_fees_collected + summary.total_pending_fees)) * 100
    : 0;
  const safeCollectionRate = Math.max(0, Math.min(100, collectionRate));
  const contentBottomPadding = Math.max(insets.bottom + 120, 140);

  const summaryCards = [
    {
      label: 'Total Fees Collected',
      value: summary.total_fees_collected,
      icon: CircleDollarSign,
      iconColor: '#2563eb',
      tint: 'rgba(37, 99, 235, 0.10)',
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
    { label: 'Collections', icon: CreditCard, route: 'AccountantPaymentEntry', color: '#2563eb', tint: 'rgba(37, 99, 235, 0.10)' },
    { label: 'Reports & Trends', icon: BarChart3, route: 'AccountantReports', color: '#a855f7', tint: 'rgba(168, 85, 247, 0.10)' },
    { label: 'Pending Dues', icon: Clock, route: 'AccountantFeeManagement', color: '#f97316', tint: 'rgba(249, 115, 22, 0.10)' },
    { label: 'Fees', icon: CircleDollarSign, route: 'AccountantFeeManagement', color: '#16a34a', tint: 'rgba(22, 163, 74, 0.10)' },
    { label: 'Expense Ledger', icon: TrendingUp, route: 'AccountantExpense', color: '#ef4444', tint: 'rgba(239, 68, 68, 0.10)' },
    { label: 'Payroll', icon: Users, route: 'AccountantPayroll', color: '#0ea5e9', tint: 'rgba(14, 165, 233, 0.10)' },
    { label: 'Notifications', icon: Bell, route: 'Notifications', color: '#64748b', tint: 'rgba(100, 116, 139, 0.10)' },
    { label: 'Salaries', icon: Wallet, route: 'Salaries', color: '#ca8a04', tint: 'rgba(202, 138, 4, 0.10)', isTab: true },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={HM_THEME.navy} />

      <View style={[styles.hero, { paddingTop: insets.top + 14 }]}> 
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />

        <View style={styles.heroRow}>
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AccountantProfile')}
            accessibilityLabel="Open profile"
          >
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <AppText style={styles.avatarText} weight="bold">{initials}</AppText>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <AppText style={styles.badgeText} weight="bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <AppText style={styles.heroKicker} weight="semiBold">Accountant Portal</AppText>
        <AppText style={styles.heroTitle} weight="bold">Hello, {userName?.split(' ')[0] || 'Accountant'} 👋</AppText>
        <AppText style={styles.heroSub}>Here&apos;s what&apos;s happening today.</AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingBottom: contentBottomPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
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
                <AppText style={styles.statLabel} weight="semiBold" numberOfLines={2}>
                  {card.label}
                </AppText>
                {index === 0 && (
                  <View style={styles.rateRow}>
                    <View style={styles.rateTrack}>
                        <View style={[styles.rateFill, { width: `${safeCollectionRate}%` }]} />
                    </View>
                    <AppText style={styles.rateText} weight="semiBold">
                        {safeCollectionRate.toFixed(0)}% collected
                    </AppText>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.sectionRow}>
          <AppText style={styles.sectionTitle} weight="bold">Quick Access</AppText>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map(action => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity
                key={action.label}
                style={[styles.quickCard, { width: QUICK_CARD_WIDTH }]}
                activeOpacity={0.78}
                onPress={() => {
                  if (action.route === 'Salaries') {
                    navigation.navigate('Salaries' as never);
                  } else {
                    navigation.navigate(action.route as keyof RootStackParamList);
                  }
                }}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: action.tint }]}>
                  <IconComponent size={18} color={action.color} />
                </View>
                <AppText style={styles.quickLabel} weight="semiBold" numberOfLines={2}>
                  {action.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summaryPanel}>
          <View style={styles.sectionRow}>
            <AppText style={styles.sectionTitle} weight="bold">Finance Snapshot</AppText>
            {loadingSummary ? (
              <View style={styles.syncChip}>
                <ActivityIndicator size="small" color="#2563eb" />
                <AppText style={styles.syncChipText} weight="semiBold">Syncing</AppText>
              </View>
            ) : (
              <View style={styles.syncChip}>
                <Calendar size={14} color="#2563eb" />
                <AppText style={styles.syncChipText} weight="semiBold">
                  {formatDateSafe(new Date())}
                </AppText>
              </View>
            )}
          </View>

          <View style={styles.snapshotItem}>
            <View>
              <AppText style={styles.snapshotLabel} weight="semiBold">Pending dues exposure</AppText>
              <AppText style={styles.snapshotHint}>Students with unpaid or partial fees</AppText>
            </View>
            <AppText style={styles.snapshotValue} weight="bold">
              {formatCompactCurrency(summary.total_pending_fees)}
            </AppText>
          </View>

          <View style={styles.snapshotItem}>
            <View>
              <AppText style={styles.snapshotLabel} weight="semiBold">Collection rate</AppText>
              <AppText style={styles.snapshotHint}>Today&apos;s summary against outstanding dues</AppText>
            </View>
            <AppText style={styles.snapshotValue} weight="bold">
              {safeCollectionRate.toFixed(1)}%
            </AppText>
          </View>

          <View style={styles.snapshotItem}>
            <View>
              <AppText style={styles.snapshotLabel} weight="semiBold">Net balance</AppText>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    backgroundColor: HM_THEME.navy,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
    }),
  },
  heroGlowOne: {
    position: 'absolute',
    top: -42,
    right: -54,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -28,
    left: -22,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(96, 165, 250, 0.16)',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#2dd4bf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2f6bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: HM_THEME.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    lineHeight: 10,
  },
  heroKicker: {
    color: '#dbeafe',
    fontSize: 14,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 2,
  },
  heroSub: {
    color: '#bfdbfe',
    fontSize: 15,
  },
  contentContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 48,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: CARD_GAP,
    marginBottom: 18,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    padding: 14,
    minHeight: 136,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: { elevation: 3 },
    }),
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.6,
  },
  statLabel: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  rateRow: {
    marginTop: 10,
  },
  rateTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  rateText: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748b',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    color: '#0f172a',
  },
  viewAll: {
    color: '#2563eb',
    fontSize: 14,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: QUICK_CARD_GAP,
    marginBottom: 18,
  },
  quickCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    minHeight: 104,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
      },
      android: { elevation: 2 },
    }),
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  quickLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: '#334155',
    textAlign: 'center',
  },
  summaryPanel: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
      },
      android: { elevation: 3 },
    }),
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  syncChipText: {
    fontSize: 11,
    color: '#2563eb',
  },
  snapshotItem: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snapshotLabel: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 3,
  },
  snapshotHint: {
    fontSize: 11,
    color: '#64748b',
  },
  snapshotValue: {
    fontSize: 16,
    color: '#0f172a',
    marginLeft: 12,
  },
  positiveValue: {
    color: '#16a34a',
  },
  negativeValue: {
    color: '#dc2626',
  },
});
