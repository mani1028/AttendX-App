import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  DimensionValue,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import {
  RefreshCw,
  BarChart2,
  PieChart,
  Folder,
  Calendar,
  TrendingUp,
  Activity,
  FileText,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import API from '../../services/api';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';




interface MonthlyCollection {
  month: string;
  total: number;
  count?: number;
}

const Reports = () => {
  const tabBarScrollPadding = useTabBarScrollPadding();
  const navigation = useNavigation();
  const { setTabBarVisible, userRole } = useAuth();
  const isMounted = useRef(true);
  const [collections, setCollections] = useState<MonthlyCollection[]>([]);
  const [maxCollection, setMaxCollection] = useState(0);
  const [loading, setLoading] = useState(false);
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
      fetchReports();
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
    }
  };

  const fetchReports = async () => {
    if (!schoolCode) {return;}

    try {
      setLoading(true);
      const response = await API.get('/accountant/reports/monthly-collections', {
        params: { school_code: schoolCode },
      });
      const data = Array.isArray(response.data) ? response.data.filter(Boolean) : [];
      setCollections(data);

      if (data && data.length > 0) {
        const max = Math.max(...data.map((c: MonthlyCollection) => c.total));
        setMaxCollection(max);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const formatMonth = (monthStr: string) => {
    // Handle format like "2024-01" or "01-2024"
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      // Check if first part is year (4 digits) or month
      if (parts[0].length === 4) {
        // Format: YYYY-MM
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        // Format: MM-YYYY
        const date = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    }
    return monthStr;
  };

  const formatAmount = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatAmountCompact = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(0)}`;
  };

  const getBarWidth = (total: number) => {
    if (maxCollection === 0) {return '0%';}
    const percentage = (total / maxCollection) * 100;
    return (percentage + '%') as DimensionValue;
  };

  const totalCollections = collections.reduce((sum, c) => sum + c.total, 0);
  const averageCollection = collections.length > 0
    ? totalCollections / collections.length
    : 0;

  const isAccountant = userRole?.toLowerCase() === 'accountant';

  return (
    <View style={styles.container}>

      <StandardPageHeader
        title="Financial Reports"
        subtitle="Visualize collection trends and financial health"
        onBackPress={() => safeGoBack(navigation as any, isAccountant ? 'AccountantDashboard' : 'PrincipalDashboard')}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={() => fetchReports()}
            accessibilityLabel="Refresh"
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={[innerPageLayoutStyles.scrollContent, { paddingBottom: tabBarScrollPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <View style={styles.pageBody}>
        <View style={styles.subHeader}>
          <View style={styles.subHeaderRow}>
            <FileText size={16} color={C.textSec} />
            <AppText style={styles.subHeaderText} weight="semibold">Monthly fee collection analysis</AppText>
          </View>
        </View>

        {/* Monthly Collections Section */}
        <View style={styles.reportSection}>
          <View style={styles.sectionHeader}>
            <BarChart2 size={20} color={C.primary} />
            <AppText style={styles.sectionTitle} weight="bold">Monthly Collections</AppText>
          </View>

          {loading && collections.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.primary} />
              <AppText style={styles.loadingText}>Loading collections...</AppText>
            </View>
          ) : collections.length > 0 ? (
            <View style={styles.chartContainer}>
              {collections.map((collection, index) => (
                <View key={collection.month} style={styles.barChart}>
                  <AppText style={styles.label} weight="semibold">{formatMonth(collection.month)}</AppText>
                  <View style={styles.barWrapper}>
                    <LinearGradient
                      colors={[Theme.colors.gradientStart, Theme.colors.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.bar, { width: getBarWidth(collection.total) }]}
                    >
                      <AppText style={styles.barValue} weight="bold">
                        {formatAmountCompact(collection.total)}
                      </AppText>
                    </LinearGradient>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Folder size={48} color={C.border} />
              <AppText style={styles.emptyText} weight="semibold">No collection data available.</AppText>
            </View>
          )}
        </View>

        {/* Summary Section */}
        <View style={styles.reportSection}>
          <View style={styles.sectionHeader}>
            <PieChart size={20} color={C.primary} />
            <AppText style={styles.sectionTitle} weight="bold">Summary</AppText>
          </View>

          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel} weight="semibold">Total Months</AppText>
              <AppText style={styles.summaryValue}>{collections.length}</AppText>
            </View>

            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel} weight="semibold">Highest Collection</AppText>
              <AppText style={[styles.summaryValue, styles.highlightValue]} weight="bold">
                {formatAmount(maxCollection)}
              </AppText>
            </View>

            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel} weight="semibold">Average Collection</AppText>
              <AppText style={styles.summaryValue} weight="semibold">
                {formatAmount(averageCollection)}
              </AppText>
            </View>

            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel} weight="semibold">Total Collection</AppText>
              <AppText style={[styles.summaryValue, styles.totalValue]} weight="bold">
                {formatAmount(totalCollections)}
              </AppText>
            </View>
          </View>
        </View>

        {/* Additional Stats Cards */}
        {collections.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCardMonths]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(30, 58, 138, 0.08)' }]}>
                <Calendar size={20} color={C.primary} />
              </View>
              <AppText style={[styles.statNumber, { color: C.primary }]} weight="bold">{collections.length}</AppText>
              <AppText style={styles.statLabel} weight="bold">Months</AppText>
            </View>
            <View style={[styles.statCard, styles.statCardHighest]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(5, 150, 105, 0.08)' }]}>
                <TrendingUp size={20} color={C.success} />
              </View>
              <AppText style={[styles.statNumber, { color: C.success }]} weight="bold">{formatAmountCompact(maxCollection)}</AppText>
              <AppText style={styles.statLabel} weight="bold">Highest</AppText>
            </View>
            <View style={[styles.statCard, styles.statCardAverage]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(217, 119, 6, 0.08)' }]}>
                <Activity size={20} color={C.warning} />
              </View>
              <AppText style={[styles.statNumber, { color: C.warning }]} weight="bold">{formatAmountCompact(averageCollection)}</AppText>
              <AppText style={styles.statLabel} weight="bold">Average</AppText>
            </View>
          </View>
        )}

        {/* Trend Analysis */}
        {collections.length > 1 && (
          <View style={styles.trendSection}>
            <AppText style={styles.trendTitle} weight="bold">Trend Analysis</AppText>
            <View style={styles.trendGrid}>
              <View style={styles.trendItem}>
                <AppText style={styles.trendLabel} weight="semibold">Best Month</AppText>
                {collections.reduce((best, current) =>
                  current.total > best.total ? current : best, collections[0]
                ).month && (
                  <>
                    <AppText style={styles.trendValue} weight="bold">
                      {formatMonth(collections.reduce((best, current) =>
                        current.total > best.total ? current : best, collections[0]
                      ).month)}
                    </AppText>
                    <AppText style={styles.trendAmount} weight="semibold">
                      {formatAmount(collections.reduce((best, current) =>
                        current.total > best.total ? current : best, collections[0]
                      ).total)}
                    </AppText>
                  </>
                )}
              </View>
              <View style={styles.trendItem}>
                <AppText style={styles.trendLabel} weight="semibold">Growth Trend</AppText>
                {collections.length >= 2 && (
                  <>
                    <AppText style={styles.trendValue} weight="bold">
                      {collections[collections.length - 1].total > collections[0].total ? '↑ Positive' : '↓ Negative'}
                    </AppText>
                    <AppText style={styles.trendAmount} weight="semibold">
                      {((collections[collections.length - 1].total - collections[0].total) / collections[0].total * 100).toFixed(1)}%
                    </AppText>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
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
  pageBody: {
  },
  subHeader: {
    backgroundColor: C.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: Theme.spacing.sm,
    marginTop: 14,
    borderRadius: 12,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subHeaderText: {
    ...Theme.typography.body,
    color: C.textSec,
  },
  reportSection: {
    backgroundColor: C.card,
    marginBottom: Theme.spacing.sm,
    padding: Theme.spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    color: C.text,
  },
  loadingContainer: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: C.textMuted,
  },
  emptyContainer: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: C.textMuted,
    ...Theme.typography.body,
  },
  chartContainer: {
    gap: 12,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    minWidth: 80,
    color: C.text,
    fontSize: 13,
  },
  barWrapper: {
    flex: 1,
    backgroundColor: C.bgAlt,
    borderRadius: 8,
    overflow: 'hidden',
    height: 34,
  },
  bar: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: Theme.spacing.sm,
    borderRadius: 8,
  },
  barValue: {
    color: Theme.colors.card,
    ...Theme.typography.label,
  },
  summaryTable: {
    marginTop: Theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  summaryLabel: {
    color: C.textMuted,
    ...Theme.typography.body,
  },
  summaryValue: {
    ...Theme.typography.body,
    color: C.text,
  },
  highlightValue: {
    color: C.primary,
  },
  totalValue: {
    color: C.success,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: Theme.spacing.md,
    marginTop: 0,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statCardMonths: {
    backgroundColor: C.primarySoft,
    borderColor: C.primaryBorder,
  },
  statCardHighest: {
    backgroundColor: C.successSoft,
    borderColor: C.successBorder,
  },
  statCardAverage: {
    backgroundColor: C.warningSoft,
    borderColor: C.warningSoft,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  statNumber: {
    fontSize: 18,
    marginTop: Theme.spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    color: C.text3,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendSection: {
    backgroundColor: C.card,
    margin: Theme.spacing.md,
    marginTop: 0,
    padding: Theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
    }),
  },
  trendTitle: {
    fontSize: 16,
    color: C.text,
    marginBottom: Theme.spacing.md,
  },
  trendGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  trendItem: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 8,
  },
  trendLabel: {
    ...Theme.typography.caption,
    color: C.textMuted,
    marginBottom: Theme.spacing.sm,
  },
  trendValue: {
    ...Theme.typography.body,
    color: C.text,
  },
  trendAmount: {
    ...Theme.typography.caption,
    color: C.textMuted,
    marginTop: Theme.spacing.xs,
  },
});

export default Reports;
