import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CircleDollarSign,
  Clock,
  TrendingUp,
  BarChart2,
  PieChart,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../theme/tokens';

import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { Theme, C } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';




interface DashboardSummary {
  total_fees_collected: number;
  total_pending_fees: number;
  total_expenses: number;
  net_balance: number;
}

const SummaryCards = () => {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');

  // Load school code from storage
  useEffect(() => {
    loadSchoolCode();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    if (schoolCode) {
      fetchSummary();
    }
  }, [schoolCode]);

  const loadSchoolCode = async () => {
    try {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) || '';
      setSchoolCode(code);
    } catch (error) {
      console.error('Error loading school code:', error);
      Alert.alert('Error', 'Failed to load school code');
    }
  };

  const fetchSummary = async () => {
    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await API.get('/accountant/dashboard', {
        params: { school_code: schoolCode },
      });
      setSummary(response.data);
    } catch (error: any) {
      console.error('Error fetching dashboard summary:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to load dashboard summary';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  };

  const formatAmount = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatAmountCompact = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(2)}`;
  };

  const getCardConfig = (summaryData: DashboardSummary) => {
    return [
      {
        label: 'Total Fees Collected',
        value: summaryData.total_fees_collected,
        formattedValue: formatAmount(summaryData.total_fees_collected),
        gradient: [Theme.colors.success, Theme.colors.success],
        icon: CircleDollarSign,
        iconBg: '#05966920',
      },
      {
        label: 'Pending Fees',
        value: summaryData.total_pending_fees,
        formattedValue: formatAmount(summaryData.total_pending_fees),
        gradient: [Theme.colors.error, Theme.colors.error],
        icon: Clock,
        iconBg: '#dc262620',
      },
      {
        label: 'Total Expenses',
        value: summaryData.total_expenses,
        formattedValue: formatAmount(summaryData.total_expenses),
        gradient: [Theme.colors.warning, Theme.colors.warning],
        icon: TrendingUp,
        iconBg: '#f59e0b20',
      },
      {
        label: 'Net Balance',
        value: summaryData.net_balance,
        formattedValue: formatAmount(summaryData.net_balance),
        gradient: [Theme.colors.violet, Theme.colors.blue],
        icon: BarChart2,
        iconBg: '#6648dc20',
      },
    ];
  };

  if (loading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ScreenSkeleton variant="list" />
        <AppText style={styles.loadingText}>Loading dashboard summary...</AppText>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color={Theme.colors.error} />
        <AppText style={styles.errorTitle} weight="bold">Error Loading Summary</AppText>
        <AppText style={styles.errorText}>Unable to load dashboard data</AppText>
        <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={fetchSummary}>
          <AppText style={styles.retryButtonText} weight="semibold">Retry</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const cardData = getCardConfig(summary);

  return (
    <View style={styles.container}>


      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title="Summary Cards"
        subtitle="Financial overview at a glance"
        onBackPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PrincipalDashboard' as never)}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={onRefresh}
            accessibilityLabel="Refresh"
          >
            <RefreshCw size={18} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />
        <View style={innerPageLayoutStyles.contentFront}>
        <View style={styles.cardsContainer}>
          {cardData.map((card, index) => (
            <View key={index} style={styles.cardWrapper}>
              <View style={[styles.card, { backgroundColor: card.gradient[0] }]}>
                <View style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: card.iconBg }]}>
                    <card.icon size={28} color={Theme.colors.card} />
                  </View>
                  <View style={styles.infoContainer}>
                    <AppText style={styles.label} weight="semibold">{card.label}</AppText>
                    <AppText style={styles.value} weight="bold">{card.formattedValue}</AppText>
                    <AppText style={styles.compactValue}>{formatAmountCompact(card.value)}</AppText>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryHeader}>
            <PieChart size={20} color={C.navy} />
            <AppText style={styles.summaryTitle} weight="bold">Financial Summary</AppText>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <AppText style={styles.summaryLabel} weight="semibold">Collection Rate</AppText>
              <AppText style={styles.summaryValue} weight="bold">
                {summary.total_fees_collected + summary.total_pending_fees > 0
                  ? ((summary.total_fees_collected / (summary.total_fees_collected + summary.total_pending_fees)) * 100).toFixed(1)
                  : 0}%
              </AppText>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${summary.total_fees_collected + summary.total_pending_fees > 0
                        ? (summary.total_fees_collected / (summary.total_fees_collected + summary.total_pending_fees)) * 100
                        : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.summaryItem}>
              <AppText style={styles.summaryLabel} weight="semibold">Expense Ratio</AppText>
              <AppText style={styles.summaryValue} weight="bold">
                {summary.total_fees_collected > 0
                  ? ((summary.total_expenses / summary.total_fees_collected) * 100).toFixed(1)
                  : 0}%
              </AppText>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarExpense,
                    {
                      width: `${summary.total_fees_collected > 0
                        ? (summary.total_expenses / summary.total_fees_collected) * 100
                        : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <AppText style={styles.statLabel} weight="semibold">Total Fees</AppText>
              <AppText style={styles.statValue} weight="bold">
                {formatAmount(summary.total_fees_collected + summary.total_pending_fees)}
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText style={styles.statLabel} weight="semibold">Profit Margin</AppText>
              <AppText style={[styles.statValue, summary.net_balance >= 0 ? styles.positive : styles.negative]} weight="bold">
                {summary.total_fees_collected > 0
                  ? ((summary.net_balance / summary.total_fees_collected) * 100).toFixed(1)
                  : 0}%
              </AppText>
            </View>
          </View>
        </View>

        <TouchableOpacity accessibilityRole="button" style={styles.refreshButton} onPress={fetchSummary}>
          <RefreshCw size={16} color={Theme.colors.card} />
          <AppText style={styles.refreshButtonText} weight="semibold">Refresh Data</AppText>
        </TouchableOpacity>

        <View style={styles.footer}>
          <AppText style={styles.footerText}>Last updated: {new Date().toLocaleString()}</AppText>
        </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: Theme.spacing.xl,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: Theme.spacing.xl,
  },
  errorTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
    marginTop: Theme.spacing.md,
  },
  errorText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  retryButton: {
    marginTop: Theme.spacing.xl,
    backgroundColor: Theme.colors.violet,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
  },
  retryButtonText: {
    color: Theme.colors.card,
    ...Theme.typography.body,
  },
  cardsContainer: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  cardWrapper: {
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    padding: Theme.spacing.xl,
    borderRadius: Theme.radius.lg,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  label: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.card,
    opacity: 0.9,
    marginBottom: Theme.spacing.xs,
  },
  value: {
    fontSize: Theme.typography.h2.fontSize,
    color: Theme.colors.card,
  },
  compactValue: {
    ...Theme.typography.caption,
    color: Theme.colors.card,
    opacity: 0.8,
    marginTop: 2,
  },
  summarySection: {
    backgroundColor: Theme.colors.background,
    margin: Theme.spacing.md,
    marginTop: 0,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  summaryTitle: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
  },
  summaryGrid: {
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  summaryItem: {
    gap: Theme.spacing.sm,
  },
  summaryLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  summaryValue: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Theme.colors.success,
    borderRadius: 3,
  },
  progressBarExpense: {
    height: '100%',
    backgroundColor: Theme.colors.warning,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xs,
  },
  statValue: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Theme.colors.border,
  },
  positive: {
    color: Theme.colors.success,
  },
  negative: {
    color: Theme.colors.error,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: C.navy,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
  },
  refreshButtonText: {
    color: Theme.colors.card,
    ...Theme.typography.body,
  },
  footer: {
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
  },
});

export default SummaryCards;
