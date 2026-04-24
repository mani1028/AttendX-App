import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';

interface DashboardSummary {
  total_fees_collected: number;
  total_pending_fees: number;
  total_expenses: number;
  net_balance: number;
}

const SummaryCards = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');

  // Load school code from storage
  useEffect(() => {
    loadSchoolCode();
  }, []);

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
        icon: 'dollar-sign',
        iconBg: '#05966920',
      },
      {
        label: "Pending Fees",
        value: summaryData.total_pending_fees,
        formattedValue: formatAmount(summaryData.total_pending_fees),
        gradient: ['#dc2626', '#ef4444'],
        icon: 'clock',
        iconBg: '#dc262620',
      },
      {
        label: "Total Expenses",
        value: summaryData.total_expenses,
        formattedValue: formatAmount(summaryData.total_expenses),
        gradient: ['#f59e0b', '#fbbf24'],
        icon: 'trending-up',
        iconBg: '#f59e0b20',
      },
      {
        label: "Net Balance",
        value: summaryData.net_balance,
        formattedValue: formatAmount(summaryData.net_balance),
        gradient: ['#2563eb', '#3b82f6'],
        icon: 'bar-chart-2',
        iconBg: '#2563eb20',
      },
    ];
  };

  if (loading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading dashboard summary...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={48} color="#dc2626" />
        <Text style={styles.errorTitle}>Error Loading Summary</Text>
        <Text style={styles.errorText}>Unable to load dashboard data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSummary}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cardData = getCardConfig(summary);

  return (
    <ScrollView 
      style={styles.container}
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
                  <Icon name={card.icon} size={28} color="#fff" />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.label}>{card.label}</Text>
                  <Text style={styles.value}>{card.formattedValue}</Text>
                  <Text style={styles.compactValue}>{formatAmountCompact(card.value)}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.summarySection}>
        <View style={styles.summaryHeader}>
          <Icon name="pie-chart" size={20} color="#2563eb" />
          <Text style={styles.summaryTitle}>Financial Summary</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Collection Rate</Text>
            <Text style={styles.summaryValue}>
              {summary.total_fees_collected + summary.total_pending_fees > 0
                ? ((summary.total_fees_collected / (summary.total_fees_collected + summary.total_pending_fees)) * 100).toFixed(1)
                : 0}%
            </Text>
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
            <Text style={styles.summaryLabel}>Expense Ratio</Text>
            <Text style={styles.summaryValue}>
              {summary.total_fees_collected > 0
                ? ((summary.total_expenses / summary.total_fees_collected) * 100).toFixed(1)
                : 0}%
            </Text>
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
            <Text style={styles.statLabel}>Total Fees</Text>
            <Text style={styles.statValue}>
              {formatAmount(summary.total_fees_collected + summary.total_pending_fees)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Profit Margin</Text>
            <Text style={[styles.statValue, summary.net_balance >= 0 ? styles.positive : styles.negative]}>
              {summary.total_fees_collected > 0
                ? ((summary.net_balance / summary.total_fees_collected) * 100).toFixed(1)
                : 0}%
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={fetchSummary}>
        <Icon name="refresh-cw" size={16} color="#fff" />
        <Text style={styles.refreshButtonText}>Refresh Data</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Last updated: {new Date().toLocaleString()}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f7',
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
    backgroundColor: '#f0f2f7',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: 'bold',
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
    fontWeight: '700',
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
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
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
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: '#2563eb',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontWeight: '600',
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