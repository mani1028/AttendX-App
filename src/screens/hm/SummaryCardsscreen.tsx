import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CircleDollarSign,
  Clock,
  TrendingUp,
  BarChart2,
  PieChart,
  RefreshCw,
  AlertCircle
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import { HM_THEME as C } from '../../constants/hmTheme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

interface DashboardSummary {
  total_fees_collected: number;
  total_pending_fees: number;
  total_expenses: number;
  net_balance: number;
}

const SummaryCards = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    if (schoolCode) {
      fetchSummary();
    }
  }, [schoolCode]);

  const loadSchoolCode = async () => {
    try {
      const code = await AsyncStorage.getItem('school_code') ||
        await AsyncStorage.getItem('schoolCode') ||
        await AsyncStorage.getItem('school_id') ||
        await AsyncStorage.getItem('schoolId') || '';
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
      const response = await API.get("/accountant/dashboard", {
        params: { school_code: schoolCode },
      });
      setSummary(response.data);
    } catch (error: any) {
      console.error("Error fetching dashboard summary:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to load dashboard summary";
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
        label: "Total Fees Collected",
        value: summaryData.total_fees_collected,
        formattedValue: formatAmount(summaryData.total_fees_collected),
        gradient: ['#059669', '#10b981'],
        icon: CircleDollarSign,
        iconBg: '#05966920',
      },
      {
        label: "Pending Fees",
        value: summaryData.total_pending_fees,
        formattedValue: formatAmount(summaryData.total_pending_fees),
        gradient: ['#dc2626', '#ef4444'],
        icon: Clock,
        iconBg: '#dc262620',
      },
      {
        label: "Total Expenses",
        value: summaryData.total_expenses,
        formattedValue: formatAmount(summaryData.total_expenses),
        gradient: ['#f59e0b', '#fbbf24'],
        icon: TrendingUp,
        iconBg: '#f59e0b20',
      },
      {
        label: "Net Balance",
        value: summaryData.net_balance,
        formattedValue: formatAmount(summaryData.net_balance),
        gradient: ['#2563eb', '#3b82f6'],
        icon: BarChart2,
        iconBg: '#2563eb20',
      },
    ];
  };

  if (loading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.navy} />
        <AppText style={styles.loadingText}>Loading dashboard summary...</AppText>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color="#dc2626" />
        <AppText style={styles.errorTitle} weight="bold">Error Loading Summary</AppText>
        <AppText style={styles.errorText}>Unable to load dashboard data</AppText>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSummary}>
          <AppText style={styles.retryButtonText} weight="semiBold">Retry</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const cardData = getCardConfig(summary);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HMDashboard' as never)}
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">Summary Cards</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.cardsContainer}>
          {cardData.map((card, index) => (
            <View key={index} style={styles.cardWrapper}>
              <View style={[styles.card, { backgroundColor: card.gradient[0] }]}>
                <View style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: card.iconBg }]}>
                    <card.icon size={28} color="#fff" />
                  </View>
                  <View style={styles.infoContainer}>
                    <AppText style={styles.label} weight="semiBold">{card.label}</AppText>
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
              <AppText style={styles.summaryLabel} weight="semiBold">Collection Rate</AppText>
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
                        : 0}%`
                    }
                  ]}
                />
              </View>
            </View>

            <View style={styles.summaryItem}>
              <AppText style={styles.summaryLabel} weight="semiBold">Expense Ratio</AppText>
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
                        : 0}%`
                    }
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <AppText style={styles.statLabel} weight="semiBold">Total Fees</AppText>
              <AppText style={styles.statValue} weight="bold">
                {formatAmount(summary.total_fees_collected + summary.total_pending_fees)}
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText style={styles.statLabel} weight="semiBold">Profit Margin</AppText>
              <AppText style={[styles.statValue, summary.net_balance >= 0 ? styles.positive : styles.negative]} weight="bold">
                {summary.total_fees_collected > 0
                  ? ((summary.net_balance / summary.total_fees_collected) * 100).toFixed(1)
                  : 0}%
              </AppText>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={fetchSummary}>
          <RefreshCw size={16} color="#fff" />
          <AppText style={styles.refreshButtonText} weight="semiBold">Refresh Data</AppText>
        </TouchableOpacity>

        <View style={styles.footer}>
          <AppText style={styles.footerText}>Last updated: {new Date().toLocaleString()}</AppText>
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
  headerStandard: {
    backgroundColor: C.navy,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    color: '#0f172a',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  cardsContainer: {
    padding: 16,
    gap: 12,
  },
  cardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    padding: 20,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    color: '#ffffff',
  },
  compactValue: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 2,
  },
  summarySection: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#0f172a',
  },
  summaryGrid: {
    gap: 16,
    marginBottom: 16,
  },
  summaryItem: {
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 20,
    color: '#0f172a',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  progressBarExpense: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    color: '#0f172a',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
  },
  positive: {
    color: '#059669',
  },
  negative: {
    color: '#dc2626',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.navy,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
  },
});

export default SummaryCards;