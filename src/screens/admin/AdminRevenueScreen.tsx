import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Banknote, TrendingUp, Activity, Building2 } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/tokens';
import * as adminService from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

function StatCard({ label, value, icon: Icon, color, bg }: {
  label: string;
  value: string;
  icon: React.FC<any>;
  color: string;
  bg: string;
}) {
  return (
    <AppCard style={StyleSheet.flatten([styles.statCard, { backgroundColor: bg }])}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Icon size={20} color={color} />
      </View>
      <AppText style={styles.statLabel}>{label}</AppText>
      <AppText weight="bold" style={styles.statValue}>{value}</AppText>
    </AppCard>
  );
}

export default function AdminRevenueScreen() {
  const navigation = useNavigation();
  const { userRole } = useAuth();
  const isAgent = userRole?.toLowerCase() === 'agent';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminService.getRevenueStats();
      setStats(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title={isAgent ? 'My Revenue' : 'Revenue Analytics'}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <AppText style={styles.subtitle}>Payment collections and financial performance</AppText>

        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.grid}>
              <StatCard label="Total Revenue" value={fmt(stats?.total_revenue)} icon={Banknote} color="#16a34a" bg="#f0fdf4" />
              <StatCard label="This Month" value={fmt(stats?.monthly_revenue ?? stats?.revenue_this_month)} icon={TrendingUp} color="#2563eb" bg="#eff6ff" />
              <StatCard label="Transactions" value={String(stats?.stats?.paid_count ?? stats?.paid_count ?? 0)} icon={Activity} color="#9333ea" bg="#faf5ff" />
              <StatCard label="Schools" value={String(stats?.stats?.total_schools ?? stats?.total ?? 0)} icon={Building2} color="#ea580c" bg="#fff7ed" />
            </View>

            {Array.isArray(stats?.recent_payments) && stats.recent_payments.length > 0 && (
              <View style={styles.section}>
                <AppText weight="bold" style={styles.sectionTitle}>Recent Payments</AppText>
                {stats.recent_payments.slice(0, 10).map((p: any, idx: number) => (
                  <AppCard key={idx} style={styles.paymentRow}>
                    <View style={{ flex: 1 }}>
                      <AppText weight="semibold">{p.school_name || p.school_id || 'School'}</AppText>
                      <AppText style={styles.paymentMeta}>{p.plan_name || p.description || 'Subscription'}</AppText>
                    </View>
                    <AppText weight="bold" style={styles.paymentAmount}>{fmt(p.amount)}</AppText>
                  </AppCard>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: 16, paddingBottom: 100 },
  subtitle: { color: Theme.colors.textSec, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', padding: 14, flexGrow: 1 },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statLabel: { fontSize: 10, color: Theme.colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 18, color: Theme.colors.text, marginTop: 4 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, marginBottom: 12, color: Theme.colors.text },
  paymentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 12 },
  paymentMeta: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 2 },
  paymentAmount: { color: Theme.colors.success, fontSize: 15 },
});
