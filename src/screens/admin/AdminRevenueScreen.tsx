import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Banknote, TrendingUp, Activity, Building2, BarChart3 } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { adminScreenStyles } from '../../components/admin/adminScreenStyles';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
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

function RevenueSkeleton() {
  return (
    <View style={adminScreenStyles.skeletonGrid}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={adminScreenStyles.skeletonCard} />
      ))}
    </View>
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
  const hasData = stats && (
    stats.total_revenue != null ||
    stats.monthly_revenue != null ||
    stats.revenue_this_month != null ||
    (Array.isArray(stats.recent_payments) && stats.recent_payments.length > 0)
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={Theme.colors.primary}
          />
        }
      >
        <StandardPageHeader
          scrollWithContent
          title={isAgent ? 'My Revenue' : 'Revenue Analytics'}
          subtitle="Payment collections and financial performance"
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          {loading ? (
            <RevenueSkeleton />
          ) : !hasData ? (
            <AdminEmptyState
              icon={<BarChart3 size={28} color={Theme.colors.primary} />}
              title="No revenue data yet"
              description="Payment stats will appear here once schools start subscribing."
              actionLabel="Refresh"
              onAction={() => { setLoading(true); load(); }}
            />
          ) : (
            <>
              <View style={styles.grid}>
                <StatCard label="Total Revenue" value={fmt(stats?.total_revenue)} icon={Banknote} color="#16a34a" bg="#f0fdf4" />
                <StatCard label="This Month" value={fmt(stats?.monthly_revenue ?? stats?.revenue_this_month)} icon={TrendingUp} color={Theme.colors.blue} bg="#eff6ff" />
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', padding: 14, flexGrow: 1 },
  statIcon: { width: 40, height: 40, borderRadius: Theme.radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Theme.spacing.sm },
  statLabel: { fontSize: Theme.typography.label.fontSize, color: Theme.colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: Theme.typography.h3.fontSize, color: Theme.colors.text, marginTop: Theme.spacing.xs },
  section: { marginTop: Theme.spacing.lg },
  sectionTitle: { fontSize: Theme.typography.h4.fontSize, marginBottom: Theme.spacing.md, color: Theme.colors.text },
  paymentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm, padding: Theme.spacing.md },
  paymentMeta: { fontSize: Theme.typography.caption.fontSize, color: Theme.colors.textMuted, marginTop: 2 },
  paymentAmount: { color: Theme.colors.success, fontSize: Theme.typography.bodyMd.fontSize },
});
