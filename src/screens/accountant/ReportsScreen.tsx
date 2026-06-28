import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import { Theme } from '../../theme/tokens';
import * as accountantService from '../../services/accountantService';

const CHART_WIDTH = Dimensions.get('window').width - 64;

function fmtMonth(raw: string): string {
  try {
    const [y, m] = String(raw).split('-');
    if (y && m) {
      return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }
    return raw;
  } catch {
    return raw;
  }
}

export default function ReportsScreen() {
  const navigation = useNavigation();
  const [collections, setCollections] = useState<Array<{ month: string; total: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      setError('');
      const schoolCode = (await AsyncStorage.getItem('school_code')) || '';
      const data = await accountantService.getMonthlyCollectionsReport(schoolCode);
      setCollections(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load reports');
      setCollections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const total = collections.reduce((s, c) => s + c.total, 0);
  const avg = collections.length ? total / collections.length : 0;
  const maxVal = collections.length ? Math.max(...collections.map(c => c.total), 1) : 1;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReports(); }} />}
      >
        <StandardPageHeader
          scrollWithContent
          title="Financial Reports"
          subtitle="Monthly collections and fee summaries"
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            <View style={styles.metricsRow}>
              <AppCard style={styles.metric}>
                <AppText style={styles.metricLabel}>Total</AppText>
                <AppText weight="bold" style={styles.metricValue}>₹{total.toLocaleString('en-IN')}</AppText>
              </AppCard>
              <AppCard style={styles.metric}>
                <AppText style={styles.metricLabel}>Monthly Avg</AppText>
                <AppText weight="bold" style={styles.metricValue}>₹{Math.round(avg).toLocaleString('en-IN')}</AppText>
              </AppCard>
            </View>

            <AppCard style={styles.chartCard}>
              <AppText weight="bold" style={styles.chartTitle}>Monthly Collections</AppText>
              {collections.length === 0 ? (
                <AppText style={styles.empty}>No collection data yet.</AppText>
              ) : (
                collections.map((row, idx) => {
                  const pct = Math.max(4, (row.total / maxVal) * 100);
                  return (
                    <View key={`${row.month}-${idx}`} style={styles.barRow}>
                      <AppText style={styles.barLabel}>{fmtMonth(row.month)}</AppText>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                      <AppText style={styles.barValue}>₹{row.total.toLocaleString('en-IN')}</AppText>
                    </View>
                  );
                })
              )}
            </AppCard>

            <AppCard style={styles.tableCard}>
              <AppText weight="bold" style={styles.chartTitle}>Summary</AppText>
              {collections.map((row, idx) => (
                <View key={`t-${idx}`} style={styles.tableRow}>
                  <AppText style={styles.tableMonth}>{fmtMonth(row.month)}</AppText>
                  <AppText weight="semibold" style={styles.tableAmount}>₹{row.total.toLocaleString('en-IN')}</AppText>
                </View>
              ))}
            </AppCard>
          </>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollView: { flex: 1 },
  error: { color: Theme.colors.error, textAlign: 'center', marginTop: 32 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metric: { flex: 1, padding: 14 },
  metricLabel: { fontSize: 11, color: Theme.colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  metricValue: { fontSize: 18, color: Theme.colors.text, marginTop: 4 },
  chartCard: { padding: 16, marginBottom: 12 },
  chartTitle: { fontSize: 16, color: Theme.colors.text, marginBottom: 14 },
  empty: { color: Theme.colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { width: 52, fontSize: 11, color: Theme.colors.textMuted, textAlign: 'right' },
  barTrack: { flex: 1, height: 24, backgroundColor: Theme.colors.backgroundAlt, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Theme.colors.primary, borderRadius: 6 },
  barValue: { width: 72, fontSize: 11, color: Theme.colors.text, textAlign: 'right' },
  tableCard: { padding: 16 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Theme.colors.borderLight },
  tableMonth: { color: Theme.colors.textSec },
  tableAmount: { color: Theme.colors.text },
});
