import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronDown, ReceiptText, Search } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import { Theme } from '../../theme/tokens';
import * as accountantService from '../../services/accountantService';
import type { PaymentRecord } from '../../services/accountantService';

type MethodFilter = 'all' | 'cash' | 'online';

const METHOD_OPTIONS = [
  { label: 'All Methods', value: 'all' },
  { label: 'Cash', value: 'cash' },
  { label: 'Online', value: 'online' },
];

const formatDateLabel = (value?: string): string => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getPaymentDateKey = (payment: PaymentRecord): string => {
  const raw = payment.payment_date || payment.paid_at || payment.created_at || '';
  if (!raw) {
    return '';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw.slice(0, 7);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (key: string): string => {
  if (!key || !/^\d{4}-\d{2}/.test(key)) {
    return key || 'Unknown';
  }
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

export default function AccountantPaymentHistoryScreen() {
  const navigation = useNavigation();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const load = useCallback(async () => {
    try {
      const schoolCode = (await AsyncStorage.getItem('school_code')) || '';
      const rows = await accountantService.getAllPaymentHistory(schoolCode);
      setPayments(rows);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthOptions = useMemo(() => {
    const keys = Array.from(
      new Set(payments.map(getPaymentDateKey).filter(Boolean)),
    ).sort((a, b) => b.localeCompare(a));

    return [
      { label: 'All Months', value: 'all' },
      ...keys.map(key => ({ label: formatMonthLabel(key), value: key })),
    ];
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return payments.filter(payment => {
      if (methodFilter !== 'all' && payment.method !== methodFilter) {
        return false;
      }
      if (monthFilter !== 'all' && getPaymentDateKey(payment) !== monthFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      const haystack = [
        payment.student_name,
        payment.roll_no,
        payment.fee_type,
        payment.receipt_no,
        payment.transaction_id,
        payment.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [payments, searchQuery, methodFilter, monthFilter]);

  const totalAmount = useMemo(
    () => filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [filteredPayments],
  );

  const renderItem = ({ item }: { item: PaymentRecord }) => {
    const methodLabel = item.method === 'online' ? 'Online' : 'Cash';
    const methodColor = item.method === 'online' ? '#0284c7' : '#16a34a';
    const methodBg = item.method === 'online' ? '#eff6ff' : '#ecfdf5';

    return (
      <AppCard style={styles.row}>
        <View style={styles.rowTop}>
          <View style={styles.rowMain}>
            <AppText weight="semibold" numberOfLines={1}>
              {item.student_name || item.roll_no || 'Student'}
            </AppText>
            {item.roll_no ? (
              <AppText style={styles.meta}>Roll: {item.roll_no}</AppText>
            ) : null}
            <AppText style={styles.meta}>
              {formatDateLabel(item.payment_date || item.paid_at || item.created_at)}
              {item.fee_type ? ` · ${item.fee_type}` : ''}
            </AppText>
            {item.receipt_no ? (
              <AppText style={styles.meta}>Receipt: {item.receipt_no}</AppText>
            ) : null}
          </View>
          <View style={styles.rowRight}>
            <AppText weight="bold" style={styles.amount}>
              ₹{Number(item.amount || 0).toLocaleString('en-IN')}
            </AppText>
            <View style={[styles.methodBadge, { backgroundColor: methodBg }]}>
              <AppText style={[styles.methodBadgeText, { color: methodColor }]} weight="semibold">
                {methodLabel}
              </AppText>
            </View>
          </View>
        </View>
      </AppCard>
    );
  };

  const listHeader = (
    <>
      <StandardPageHeader
        scrollWithContent
        title="Fee Collection History"
        subtitle="Search and filter all recorded payments"
        onBackPress={() => navigation.goBack()}
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
      />

      <View style={innerPageLayoutStyles.scrollBody}>
        <View style={styles.summaryRow}>
          <AppCard style={styles.summaryCard}>
            <AppText style={styles.summaryLabel}>Payments</AppText>
            <AppText weight="bold" style={styles.summaryValue}>{filteredPayments.length}</AppText>
          </AppCard>
          <AppCard style={styles.summaryCard}>
            <AppText style={styles.summaryLabel}>Total Collected</AppText>
            <AppText weight="bold" style={[styles.summaryValue, styles.summaryValueGreen]}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </AppText>
          </AppCard>
        </View>

        <View style={styles.searchWrap}>
          <Search size={18} color={Theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student, roll no, receipt…"
            placeholderTextColor={Theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filtersRow}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.filterChip}
            onPress={() => setShowMethodPicker(true)}
          >
            <AppText style={styles.filterChipText} weight="semibold">
              {METHOD_OPTIONS.find(option => option.value === methodFilter)?.label || 'All Methods'}
            </AppText>
            <ChevronDown size={16} color={Theme.colors.textSec} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.filterChip}
            onPress={() => setShowMonthPicker(true)}
          >
            <AppText style={styles.filterChipText} weight="semibold" numberOfLines={1}>
              {monthOptions.find(option => option.value === monthFilter)?.label || 'All Months'}
            </AppText>
            <ChevronDown size={16} color={Theme.colors.textSec} />
          </TouchableOpacity>
        </View>

        {(methodFilter !== 'all' || monthFilter !== 'all' || searchQuery.trim()) ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.clearFiltersBtn}
            onPress={() => {
              setSearchQuery('');
              setMethodFilter('all');
              setMonthFilter('all');
            }}
          >
            <AppText style={styles.clearFiltersText} weight="semibold">Clear filters</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={listHeader}
          contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
          ListFooterComponent={
            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
          }
        />
      ) : (
        <FlatList
          style={styles.listView}
          data={filteredPayments}
          keyExtractor={(item, idx) => String(item.id || item.fee_id || idx)}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            innerPageLayoutStyles.scrollPageContent,
            innerPageLayoutStyles.scrollBody,
            { paddingBottom: 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={(
            <View style={styles.emptyWrap}>
              <ReceiptText size={40} color={Theme.colors.textMuted} />
              <AppText style={styles.emptyTitle} weight="semibold">No payments found</AppText>
              <AppText style={styles.empty}>
                {payments.length === 0
                  ? 'No fee collections recorded yet.'
                  : 'Try adjusting your search or filters.'}
              </AppText>
            </View>
          )}
        />
      )}

      <CustomPickerModal
        visible={showMethodPicker}
        title="Payment Method"
        options={METHOD_OPTIONS}
        selectedValue={methodFilter}
        onValueChange={value => setMethodFilter(value as MethodFilter)}
        onClose={() => setShowMethodPicker(false)}
      />

      <CustomPickerModal
        visible={showMonthPicker}
        title="Filter by Month"
        options={monthOptions}
        selectedValue={monthFilter}
        onValueChange={setMonthFilter}
        onClose={() => setShowMonthPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  listView: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: { flex: 1, padding: 14 },
  summaryLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  summaryValue: { fontSize: 20, color: Theme.colors.text, marginTop: 4 },
  summaryValueGreen: { color: Theme.colors.success },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    backgroundColor: Theme.colors.card,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 15,
    paddingVertical: 8,
  },
  filtersRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    backgroundColor: Theme.colors.card,
  },
  filterChipText: { flex: 1, fontSize: 13, color: Theme.colors.text },
  clearFiltersBtn: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 8 },
  clearFiltersText: { color: Theme.colors.primary, fontSize: 13 },
  row: { marginBottom: 10, padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowMain: { flex: 1, minWidth: 0 },
  rowRight: { alignItems: 'flex-end', gap: 8 },
  meta: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 2 },
  amount: { color: Theme.colors.success, fontSize: 16 },
  methodBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  methodBadgeText: { fontSize: 11 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { color: Theme.colors.text, fontSize: 16 },
  empty: { textAlign: 'center', color: Theme.colors.textMuted, paddingHorizontal: 24 },
});
