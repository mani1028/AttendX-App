import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';

// Local theme bridge
const C = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textMuted,
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
};

interface MonthlyCollection {
  month: string;
  total: number;
  count?: number;
}

const Reports = () => {
  const [collections, setCollections] = useState<MonthlyCollection[]>([]);
  const [maxCollection, setMaxCollection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');

  // Load school code from storage
  useEffect(() => {
    loadSchoolCode();
  }, []);

  useEffect(() => {
    if (schoolCode) {
      fetchReports();
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
    }
  };

  const fetchReports = async () => {
    if (!schoolCode) return;

    try {
      setLoading(true);
      const response = await API.get("/accountant/reports/monthly-collections", {
        params: { school_code: schoolCode },
      });
      const data = response.data || [];
      setCollections(data);
      
      if (data && data.length > 0) {
        const max = Math.max(...data.map((c: MonthlyCollection) => c.total));
        setMaxCollection(max);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
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
    const parts = monthStr.split("-");
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
    if (maxCollection === 0) return '0%';
    const percentage = (total / maxCollection) * 100;
    return `${percentage}%`;
  };

  const totalCollections = collections.reduce((sum, c) => sum + c.total, 0);
  const averageCollection = collections.length > 0 
    ? totalCollections / collections.length 
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <View style={styles.header}>
          <AppText style={styles.title}>Financial Reports</AppText>
          <AppText style={styles.subtitle}>Monthly fee collection analysis</AppText>
        </View>

        {/* Monthly Collections Section */}
        <View style={styles.reportSection}>
          <View style={styles.sectionHeader}>
            <Icon name="bar-chart-2" size={20} color={C.primary} />
            <AppText style={styles.sectionTitle}>📊 Monthly Collections</AppText>
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
                  <AppText style={styles.label}>{formatMonth(collection.month)}</AppText>
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, { width: getBarWidth(collection.total) }]}>
                      <AppText style={styles.barValue}>
                        {formatAmountCompact(collection.total)}
                      </AppText>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="folder" size={48} color={C.border} />
              <AppText style={styles.emptyText}>No collection data available.</AppText>
            </View>
          )}
        </View>

        {/* Summary Section */}
        <View style={styles.reportSection}>
          <View style={styles.sectionHeader}>
            <Icon name="pie-chart" size={20} color={C.primary} />
            <AppText style={styles.sectionTitle}>📈 Summary</AppText>
          </View>

          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>Total Months</AppText>
              <AppText style={styles.summaryValue}>{collections.length}</AppText>
            </View>
            
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>Highest Collection</AppText>
              <AppText style={[styles.summaryValue, styles.highlightValue]}>
                {formatAmount(maxCollection)}
              </AppText>
            </View>
            
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>Average Collection</AppText>
              <AppText style={styles.summaryValue}>
                {formatAmount(averageCollection)}
              </AppText>
            </View>
            
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>Total Collection</AppText>
              <AppText style={[styles.summaryValue, styles.totalValue]}>
                {formatAmount(totalCollections)}
              </AppText>
            </View>
          </View>
        </View>

        {/* Additional Stats Cards */}
        {collections.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Icon name="calendar" size={24} color={C.primary} />
              <AppText style={styles.statNumber}>{collections.length}</AppText>
              <AppText style={styles.statLabel}>Months</AppText>
            </View>
            <View style={styles.statCard}>
              <Icon name="trending-up" size={24} color={C.success} />
              <AppText style={styles.statNumber}>{formatAmountCompact(maxCollection)}</AppText>
              <AppText style={styles.statLabel}>Highest</AppText>
            </View>
            <View style={styles.statCard}>
              <Icon name="activity" size={24} color={C.warning} />
              <AppText style={styles.statNumber}>{formatAmountCompact(averageCollection)}</AppText>
              <AppText style={styles.statLabel}>Average</AppText>
            </View>
          </View>
        )}

        {/* Trend Analysis */}
        {collections.length > 1 && (
          <View style={styles.trendSection}>
            <AppText style={styles.trendTitle}>Trend Analysis</AppText>
            <View style={styles.trendGrid}>
              <View style={styles.trendItem}>
                <AppText style={styles.trendLabel}>Best Month</AppText>
                {collections.reduce((best, current) => 
                  current.total > best.total ? current : best, collections[0]
                ).month && (
                  <>
                    <AppText style={styles.trendValue}>
                      {formatMonth(collections.reduce((best, current) => 
                        current.total > best.total ? current : best, collections[0]
                      ).month)}
                    </AppText>
                    <AppText style={styles.trendAmount}>
                      {formatAmount(collections.reduce((best, current) => 
                        current.total > best.total ? current : best, collections[0]
                      ).total)}
                    </AppText>
                  </>
                )}
              </View>
              <View style={styles.trendItem}>
                <AppText style={styles.trendLabel}>Growth Trend</AppText>
                {collections.length >= 2 && (
                  <>
                    <AppText style={styles.trendValue}>
                      {collections[collections.length - 1].total > collections[0].total ? '↑ Positive' : '↓ Negative'}
                    </AppText>
                    <AppText style={styles.trendAmount}>
                      {((collections[collections.length - 1].total - collections[0].total) / collections[0].total * 100).toFixed(1)}%
                    </AppText>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
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
  header: {
    padding: 20,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },
  reportSection: {
    backgroundColor: C.card,
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    borderTopWidth: 4,
    borderTopColor: C.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: C.textMuted,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: C.textMuted,
    fontSize: 14,
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
    fontWeight: '600',
    color: C.text,
    fontSize: 13,
  },
  barWrapper: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 4,
    overflow: 'hidden',
    height: 30,
  },
  bar: {
    backgroundColor: C.primary,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 8,
    borderRadius: 4,
  },
  barValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  summaryTable: {
    marginTop: 8,
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
    fontWeight: '600',
    color: C.textMuted,
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
  },
  highlightValue: {
    color: C.primary,
    fontWeight: '700',
  },
  totalValue: {
    color: C.success,
    fontWeight: '700',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
  },
  trendSection: {
    backgroundColor: C.card,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 16,
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
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 8,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  trendAmount: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
  },
});

export default Reports;