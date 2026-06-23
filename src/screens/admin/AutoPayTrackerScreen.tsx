import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Theme, colors } from '../../theme/tokens';
import { RootStackParamList } from '../../navigation/types';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import {
  ChevronLeft,
  Search,
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';

interface SchoolAutoPay {
  id: string;
  schoolName: string;
  planName: string;
  autoPayEnabled: boolean;
  paymentMethod: 'card' | 'bank';
  lastPaymentDate: string;
  nextPaymentDate: string;
  nextPaymentAmount: string;
  status: 'active' | 'pending' | 'failed';
}

const MOCK_DATA: SchoolAutoPay[] = [
  {
    id: '1',
    schoolName: 'Sunrise Academy',
    planName: 'Premium',
    autoPayEnabled: true,
    paymentMethod: 'card',
    lastPaymentDate: '2026-05-01',
    nextPaymentDate: '2026-06-01',
    nextPaymentAmount: '₹4,999',
    status: 'active',
  },
  {
    id: '2',
    schoolName: 'Green Valley School',
    planName: 'Standard',
    autoPayEnabled: true,
    paymentMethod: 'bank',
    lastPaymentDate: '2026-05-03',
    nextPaymentDate: '2026-06-03',
    nextPaymentAmount: '₹2,499',
    status: 'active',
  },
  {
    id: '3',
    schoolName: 'Lighthouse Public School',
    planName: 'Basic',
    autoPayEnabled: false,
    paymentMethod: 'card',
    lastPaymentDate: '2026-04-15',
    nextPaymentDate: '—',
    nextPaymentAmount: '₹999',
    status: 'pending',
  },
  {
    id: '4',
    schoolName: 'Horizon International',
    planName: 'Premium',
    autoPayEnabled: true,
    paymentMethod: 'card',
    lastPaymentDate: '2026-04-28',
    nextPaymentDate: '2026-05-28',
    nextPaymentAmount: '₹4,999',
    status: 'failed',
  },
  {
    id: '5',
    schoolName: 'Crescent Moon Academy',
    planName: 'Standard',
    autoPayEnabled: true,
    paymentMethod: 'bank',
    lastPaymentDate: '2026-05-05',
    nextPaymentDate: '2026-06-05',
    nextPaymentAmount: '₹2,499',
    status: 'active',
  },
  {
    id: '6',
    schoolName: 'Royal Oak School',
    planName: 'Basic',
    autoPayEnabled: false,
    paymentMethod: 'bank',
    lastPaymentDate: '2026-03-20',
    nextPaymentDate: '—',
    nextPaymentAmount: '₹999',
    status: 'pending',
  },
  {
    id: '7',
    schoolName: 'Silver Bells Academy',
    planName: 'Premium',
    autoPayEnabled: true,
    paymentMethod: 'card',
    lastPaymentDate: '2026-05-10',
    nextPaymentDate: '2026-06-10',
    nextPaymentAmount: '₹4,999',
    status: 'active',
  },
  {
    id: '8',
    schoolName: 'Maple Leaf Public School',
    planName: 'Standard',
    autoPayEnabled: true,
    paymentMethod: 'bank',
    lastPaymentDate: '2026-04-30',
    nextPaymentDate: '2026-05-30',
    nextPaymentAmount: '₹2,499',
    status: 'failed',
  },
];

const STATUS_CONFIG = {
  active: { label: 'Active', bg: Theme.colors.successBg, text: Theme.colors.success },
  pending: { label: 'Pending', bg: Theme.colors.warningBg, text: Theme.colors.warning },
  failed: { label: 'Failed', bg: Theme.colors.errorBg, text: Theme.colors.error },
};

export default function AutoPayTrackerScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState<SchoolAutoPay[]>(MOCK_DATA);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const filtered = schools.filter(s =>
    s.schoolName.toLowerCase().includes(search.toLowerCase()) ||
    s.planName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAutoPay = (id: string) => {
    setSchools(prev =>
      prev.map(s => (s.id === id ? { ...s, autoPayEnabled: !s.autoPayEnabled } : s))
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <AppText variant="h3" weight="bold" style={styles.headerTitle}>
          Auto Pay Tracker
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search schools or plans..."
              placeholderTextColor={Theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <AppText variant="label" muted>Enabled</AppText>
            <AppText variant="h3" weight="bold" style={{ color: Theme.colors.success }}>
              {schools.filter(s => s.autoPayEnabled).length}
            </AppText>
          </View>
          <View style={styles.statBox}>
            <AppText variant="label" muted>Disabled</AppText>
            <AppText variant="h3" weight="bold" style={{ color: Theme.colors.error }}>
              {schools.filter(s => !s.autoPayEnabled).length}
            </AppText>
          </View>
          <View style={styles.statBox}>
            <AppText variant="label" muted>Total</AppText>
            <AppText variant="h3" weight="bold" style={{ color: Theme.colors.primary }}>
              {schools.length}
            </AppText>
          </View>
        </View>

        {filtered.map(school => {
          const st = STATUS_CONFIG[school.status];
          return (
            <AppCard key={school.id} style={styles.schoolCard}>
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <View style={styles.schoolIconBox}>
                    <Building2 size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" weight="bold">{school.schoolName}</AppText>
                    <AppText variant="caption" muted>{school.planName} Plan</AppText>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <AppText style={[styles.statusText, { color: st.text }]}>{st.label}</AppText>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                  <AppText variant="caption" muted>Auto-Pay</AppText>
                  <View style={styles.toggleRow}>
                    {school.autoPayEnabled ? (
                      <CheckCircle2 size={16} color={Theme.colors.success} />
                    ) : (
                      <XCircle size={16} color={Theme.colors.error} />
                    )}
                    <Switch
                      value={school.autoPayEnabled}
                      onValueChange={() => toggleAutoPay(school.id)}
                      trackColor={{ false: Theme.colors.border, true: Theme.colors.successBg }}
                      thumbColor={school.autoPayEnabled ? Theme.colors.success : Theme.colors.textMuted}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <AppText variant="caption" muted>Method</AppText>
                  <View style={styles.methodRow}>
                    <CreditCard size={14} color={Theme.colors.textMuted} />
                    <AppText variant="body" weight="semibold" style={{ marginLeft: 4 }}>
                      {school.paymentMethod === 'card' ? 'Card' : 'Bank'}
                    </AppText>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <AppText variant="caption" muted>Next Payment</AppText>
                  <AppText variant="body" weight="bold" style={{ color: Theme.colors.primary }}>
                    {school.nextPaymentAmount}
                  </AppText>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.dateItem}>
                  <Clock size={12} color={Theme.colors.textMuted} />
                  <AppText variant="caption" muted> Last: {school.lastPaymentDate}</AppText>
                </View>
                <View style={styles.dateItem}>
                  <AlertTriangle size={12} color={Theme.colors.textMuted} />
                  <AppText variant="caption" muted> Next: {school.nextPaymentDate}</AppText>
                </View>
              </View>
            </AppCard>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Search size={40} color={Theme.colors.textMuted} style={{ opacity: 0.4 }} />
            <AppText variant="body" muted style={{ marginTop: 12 }}>No schools found</AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.card,
  },
  headerTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  searchRow: {
    marginBottom: Theme.spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  schoolCard: {
    marginBottom: Theme.spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Theme.spacing.sm,
  },
  schoolIconBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.md,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
