import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Theme, colors } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { RootStackParamList } from '../../navigation/types';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import {
  CreditCard,
  Landmark,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  ArrowUpRight,
  Filter,
} from 'lucide-react-native';
import * as adminService from '../../services/adminService';

interface PaymentTransaction {
  id: string;
  schoolName: string;
  amount: string;
  date: string;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod: 'card' | 'bank';
  planName: string;
}

type FilterStatus = 'all' | 'paid' | 'pending' | 'failed';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  paid: {
    label: 'Paid',
    bg: Theme.colors.successBg,
    text: Theme.colors.success,
    icon: <CheckCircle2 size={14} color={Theme.colors.success} />,
  },
  pending: {
    label: 'Pending',
    bg: Theme.colors.warningBg,
    text: Theme.colors.warning,
    icon: <Clock size={14} color={Theme.colors.warning} />,
  },
  failed: {
    label: 'Failed',
    bg: Theme.colors.errorBg,
    text: Theme.colors.error,
    icon: <XCircle size={14} color={Theme.colors.error} />,
  },
};

const FILTER_CHIPS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

function normalizeStatus(raw: string): 'paid' | 'pending' | 'failed' {
  const value = (raw || '').toLowerCase();
  if (['paid', 'success', 'captured'].includes(value)) return 'paid';
  if (['failed', 'cancelled', 'refunded'].includes(value)) return 'failed';
  if (['pending', 'created', 'processing'].includes(value)) return 'pending';
  return 'pending';
}

function mapPaymentRow(row: any, index: number): PaymentTransaction {
  const status = normalizeStatus(row.status || row.payment_status);
  const amountNum = Number(row.amount || row.last_payment_amount || 0);
  const paidAt = row.paid_at || row.created_at || row.payment_date || '';
  const method = String(row.payment_method || row.method || '').toLowerCase();
  return {
    id: String(row.id || row.payment_id || index),
    schoolName: row.school_name || row.school_id || 'School',
    amount: `₹${amountNum.toLocaleString('en-IN')}`,
    date: paidAt ? new Date(paidAt).toLocaleDateString('en-IN') : '—',
    status,
    paymentMethod: method.includes('bank') || method.includes('upi') ? 'bank' : 'card',
    planName: row.plan_name || row.description || 'Subscription',
  };
}

export default function PaymentHistoryScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      const rows = await adminService.getAllPlatformPayments();
      setTransactions(rows.map(mapPaymentRow));
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayments();
  }, [loadPayments]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return transactions;
    return transactions.filter(t => t.status === activeFilter);
  }, [transactions, activeFilter]);

  const totalPaid = filtered.filter(t => t.status === 'paid').length;
  const totalAmount = filtered
    .filter(t => t.status === 'paid')
    .reduce((sum, t) => {
      const num = parseInt(t.amount.replace(/[₹,]/g, ''), 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <StandardPageHeader
          scrollWithContent
          title="Payment History"
          subtitle="Review platform payment transactions"
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
        {loading ? (
          <ScreenSkeleton variant="list" />
        ) : (
          <>
        <View style={styles.summaryRow}>
          <AppCard style={styles.summaryMini}>
            <AppText variant="label" muted>Transactions</AppText>
            <AppText variant="h3" weight="bold" style={{ color: Theme.colors.primary, marginTop: Theme.spacing.xs }}>
              {filtered.length}
            </AppText>
          </AppCard>
          <AppCard style={styles.summaryMini}>
            <AppText variant="label" muted>Paid</AppText>
            <AppText variant="h3" weight="bold" style={{ color: Theme.colors.success, marginTop: Theme.spacing.xs }}>
              {totalPaid}
            </AppText>
          </AppCard>
          <AppCard style={styles.summaryMini}>
            <AppText variant="label" muted>Revenue</AppText>
            <AppText variant="h3" weight="bold" style={{ color: Theme.colors.primary, marginTop: Theme.spacing.xs }}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </AppText>
          </AppCard>
        </View>

        <View style={styles.filterRow}>
          {FILTER_CHIPS.map(chip => (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.filterChip,
                activeFilter === chip.key && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(chip.key)}
              activeOpacity={0.7}
            >
              <AppText
                variant="caption"
                weight="bold"
                style={{
                  color: activeFilter === chip.key ? Theme.colors.card : Theme.colors.textMuted,
                }}
              >
                {chip.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.map(tx => {
          const st = STATUS_CONFIG[tx.status];
          return (
            <AppCard key={tx.id} style={styles.txCard}>
              <View style={styles.txTop}>
                <View style={styles.txLeft}>
                  <View style={[
                    styles.txIconBox,
                    { backgroundColor: colors.primary + '1A' },
                  ]}>
                      <ArrowUpRight size={18} color={Theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" weight="bold">{tx.schoolName}</AppText>
                    <AppText variant="caption" muted>{tx.planName} Plan · {tx.date}</AppText>
                  </View>
                </View>
                <View style={styles.txRight}>
                  <AppText
                    variant="h4"
                    weight="extrabold"
                    style={{ color: Theme.colors.text }}
                  >
                    {tx.amount}
                  </AppText>
                </View>
              </View>

              <View style={styles.txDivider} />

              <View style={styles.txBottom}>
                <View style={styles.txMethod}>
                  {tx.paymentMethod === 'card' ? (
                    <CreditCard size={13} color={Theme.colors.textMuted} />
                  ) : (
                    <Landmark size={13} color={Theme.colors.textMuted} />
                  )}
                  <AppText variant="caption" muted> {tx.paymentMethod === 'card' ? 'Card' : 'Bank Transfer'}</AppText>
                </View>
                <View style={[styles.txStatusBadge, { backgroundColor: st.bg }]}>
                  {st.icon}
                  <AppText style={[styles.txStatusText, { color: st.text }]}>{st.label}</AppText>
                </View>
              </View>
            </AppCard>
          );
        })}

        {filtered.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Filter size={40} color={Theme.colors.textMuted} style={{ opacity: 0.4 }} />
            <AppText variant="body" muted style={{ marginTop: Theme.spacing.md }}>No transactions found</AppText>
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
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  dateRangeCard: {
    marginBottom: Theme.spacing.md,
  },
  dateRangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateChip: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.cardAlt,
    marginRight: Theme.spacing.sm,
  },
  dateChipActive: {
    backgroundColor: Theme.colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  summaryMini: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  txCard: {
    marginBottom: Theme.spacing.sm,
  },
  txTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Theme.spacing.sm,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txRight: {
    marginLeft: Theme.spacing.sm,
  },
  txDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.sm,
  },
  txBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
  },
  txStatusText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
