import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Financial Reports</Text>
          <Text style={styles.subtitle}>Monthly fee collection analysis</Text>
        </View>

        {/* Monthly Collections Section */}
        <View style={styles.reportSection}>
          <View style={styles.sectionHeader}>
            <Icon name="bar-chart-2" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>📊 Monthly Collections</Text>
          </View>
          
          {loading && collections.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading collections...</Text>
            </View>
          ) : collections.length > 0 ? (
            <View style={styles.chartContainer}>
              {collections.map((collection, index) => (
                <View key={collection.month} style={styles.barChart}>
                  <Text style={styles.label}>{formatMonth(collection.month)}</Text>
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, { width: getBarWidth(collection.total) }]}>
                      <Text style={styles.barValue}>
                        {formatAmountCompact(collection.total)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="folder" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No collection data available.</Text>
            </View>
          )}
        </View>

        {/* Summary Section */}
        <View style={styles.reportSection}>
          <View style={styles.sectionHeader}>
            <Icon name="pie-chart" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>📈 Summary</Text>
          </View>

          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Months</Text>
              <Text style={styles.summaryValue}>{collections.length}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Highest Collection</Text>
              <Text style={[styles.summaryValue, styles.highlightValue]}>
                {formatAmount(maxCollection)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Average Collection</Text>
              <Text style={styles.summaryValue}>
                {formatAmount(averageCollection)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Collection</Text>
              <Text style={[styles.summaryValue, styles.totalValue]}>
                {formatAmount(totalCollections)}
              </Text>
            </View>
          </View>
        </View>

        {/* Additional Stats Cards */}
        {collections.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Icon name="calendar" size={24} color="#2563eb" />
              <Text style={styles.statNumber}>{collections.length}</Text>
              <Text style={styles.statLabel}>Months</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="trending-up" size={24} color="#059669" />
              <Text style={styles.statNumber}>{formatAmountCompact(maxCollection)}</Text>
              <Text style={styles.statLabel}>Highest</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="activity" size={24} color="#d97706" />
              <Text style={styles.statNumber}>{formatAmountCompact(averageCollection)}</Text>
              <Text style={styles.statLabel}>Average</Text>
            </View>
          </View>
        )}

        {/* Trend Analysis */}
        {collections.length > 1 && (
          <View style={styles.trendSection}>
            <Text style={styles.trendTitle}>Trend Analysis</Text>
            <View style={styles.trendGrid}>
              <View style={styles.trendItem}>
                <Text style={styles.trendLabel}>Best Month</Text>
                {collections.reduce((best, current) => 
                  current.total > best.total ? current : best, collections[0]
                ).month && (
                  <>
                    <Text style={styles.trendValue}>
                      {formatMonth(collections.reduce((best, current) => 
                        current.total > best.total ? current : best, collections[0]
                      ).month)}
                    </Text>
                    <Text style={styles.trendAmount}>
                      {formatAmount(collections.reduce((best, current) => 
                        current.total > best.total ? current : best, collections[0]
                      ).total)}
                    </Text>
                  </>
                )}
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendLabel}>Growth Trend</Text>
                {collections.length >= 2 && (
                  <>
                    <Text style={styles.trendValue}>
                      {collections[collections.length - 1].total > collections[0].total ? '↑ Positive' : '↓ Negative'}
                    </Text>
                    <Text style={styles.trendAmount}>
                      {((collections[collections.length - 1].total - collections[0].total) / collections[0].total * 100).toFixed(1)}%
                    </Text>
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
    backgroundColor: '#f0f2f7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  subtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 4,
  },
  reportSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    borderTopWidth: 4,
    borderTopColor: '#2563eb',
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
    color: '#0d1b2a',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8898aa',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#8898aa',
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
    color: '#4a5568',
    fontSize: 13,
  },
  barWrapper: {
    flex: 1,
    backgroundColor: '#e4e9f2',
    borderRadius: 4,
    overflow: 'hidden',
    height: 30,
  },
  bar: {
    backgroundColor: '#2563eb',
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
    borderBottomColor: '#e4e9f2',
  },
  summaryLabel: {
    fontWeight: '600',
    color: '#4a5568',
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0d1b2a',
  },
  highlightValue: {
    color: '#2563eb',
    fontWeight: '700',
  },
  totalValue: {
    color: '#059669',
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
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0d1b2a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 4,
  },
  trendSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 16,
  },
  trendGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  trendItem: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 12,
    borderRadius: 8,
  },
  trendLabel: {
    fontSize: 12,
    color: '#8898aa',
    marginBottom: 8,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d1b2a',
  },
  trendAmount: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 4,
  },
});

export default Reports;