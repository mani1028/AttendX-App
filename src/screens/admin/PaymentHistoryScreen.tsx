import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Theme, colors } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { RootStackParamList } from '../../navigation/types';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import {
  ChevronRight,
  CreditCard,
  Landmark,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
} from 'lucide-react-native';

interface PaymentTransaction {
  id: string;
  schoolName: string;
  amount: string;
  date: string;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod: 'card' | 'bank';
  planName: string;
  type: 'received' | 'refund';
}

const MOCK_DATA: PaymentTransaction[] = [
  {
    id: '1',
    schoolName: 'Sunrise Academy',
    amount: '₹4,999',
    date: '2026-06-15',
    status: 'paid',
    paymentMethod: 'card',
    planName: 'Premium',
    type: 'received',
  },
  {
    id: '2',
    schoolName: 'Green Valley School',
    amount: '₹2,499',
    date: '2026-06-14',
    status: 'paid',
    paymentMethod: 'bank',
    planName: 'Standard',
    type: 'received',
  },
  {
    id: '3',
    schoolName: 'Lighthouse Public School',
    amount: '₹999',
    date: '2026-06-14',
    status: 'pending',
    paymentMethod: 'card',
    planName: 'Basic',
    type: 'received',
  },
  {
    id: '4',
    schoolName: 'Horizon International',
    amount: '₹4,999',
    date: '2026-06-13',
    status: 'failed',
    paymentMethod: 'card',
    planName: 'Premium',
    type: 'received',
  },
  {
    id: '5',
    schoolName: 'Crescent Moon Academy',
    amount: '₹2,499',
    date: '2026-06-12',
    status: 'paid',
    paymentMethod: 'bank',
    planName: 'Standard',
    type: 'received',
  },
  {
    id: '6',
    schoolName: 'Royal Oak School',
    amount: '₹999',
    date: '2026-06-11',
    status: 'paid',
    paymentMethod: 'card',
    planName: 'Basic',
    type: 'received',
  },
  {
    id: '7',
    schoolName: 'Sunrise Academy',
    amount: '₹4,999',
    date: '2026-05-15',
    status: 'paid',
    paymentMethod: 'card',
    planName: 'Premium',
    type: 'received',
  },
  {
    id: '8',
    schoolName: 'Silver Bells Academy',
    amount: '₹1,250',
    date: '2026-05-10',
    status: 'paid',
    paymentMethod: 'bank',
    planName: 'Standard',
    type: 'refund',
  },
  {
    id: '9',
    schoolName: 'Maple Leaf Public School',
    amount: '₹2,499',
    date: '2026-05-08',
    status: 'failed',
    paymentMethod: 'bank',
    planName: 'Standard',
    type: 'received',
  },
  {
    id: '10',
    schoolName: 'Green Valley School',
    amount: '₹2,499',
    date: '2026-05-03',
    status: 'paid',
    paymentMethod: 'bank',
    planName: 'Standard',
    type: 'received',
  },
];

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

const DATE_RANGES = ['This Week', 'This Month', 'Last 3 Months', 'All Time'];

export default function PaymentHistoryScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [transactions] = useState<PaymentTransaction[]>(MOCK_DATA);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [activeDateRange, setActiveDateRange] = useState('This Month');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const filtered = transactions.filter(t => {
    if (activeFilter !== 'all' && t.status !== activeFilter) return false;
    return true;
  });

  const totalPaid = filtered.filter(t => t.status === 'paid').length;
  const totalAmount = filtered
    .filter(t => t.status === 'paid')
    .reduce((sum, t) => {
      const num = parseInt(t.amount.replace(/[₹,]/g, ''), 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Payment History"
        subtitle="Review platform payment transactions"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <View style={innerPageLayoutStyles.contentFront}>
        <AppCard style={styles.dateRangeCard}>
          <View style={styles.dateRangeHeader}>
            <Calendar size={16} color={Theme.colors.textMuted} />
            <AppText variant="caption" weight="semibold" muted> Date Range</AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Theme.spacing.sm }}>
            {DATE_RANGES.map(range => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.dateChip,
                  activeDateRange === range && styles.dateChipActive,
                ]}
                onPress={() => setActiveDateRange(range)}
                activeOpacity={0.7}
              >
                <AppText
                  variant="caption"
                  weight="semibold"
                  style={{
                    color: activeDateRange === range ? '#fff' : Theme.colors.textMuted,
                  }}
                >
                  {range}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </AppCard>

        <View style={styles.summaryRow}>
          <AppCard style={styles.summaryMini}>
            <AppText variant="label" muted>Transactions</AppText>
            <AppText variant="h3" weight="bold" style={{ color: Theme.colors.primary, marginTop: 4 }}>
              {filtered.length}
            </AppText>
          </AppCard>
          <AppCard style={styles.summaryMini}>
            <AppText variant="label" muted>Paid</AppText>
            <AppText variant="h3" weight="bold" style={{ color: Theme.colors.success, marginTop: 4 }}>
              {totalPaid}
            </AppText>
          </AppCard>
          <AppCard style={styles.summaryMini}>
            <AppText variant="label" muted>Revenue</AppText>
            <AppText variant="h3" weight="bold" style={{ color: Theme.colors.primary, marginTop: 4 }}>
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
                  color: activeFilter === chip.key ? '#fff' : Theme.colors.textMuted,
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
                    { backgroundColor: tx.type === 'refund' ? Theme.colors.warningBg : colors.primary + '1A' },
                  ]}>
                    {tx.type === 'refund' ? (
                      <ArrowDownLeft size={18} color={Theme.colors.warning} />
                    ) : (
                      <ArrowUpRight size={18} color={Theme.colors.primary} />
                    )}
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
                    style={{ color: tx.type === 'refund' ? Theme.colors.warning : Theme.colors.text }}
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

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Filter size={40} color={Theme.colors.textMuted} style={{ opacity: 0.4 }} />
            <AppText variant="body" muted style={{ marginTop: 12 }}>No transactions found</AppText>
          </View>
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
    gap: 4,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
  },
  txStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
