import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Theme, colors } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { RootStackParamList } from '../../navigation/types';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import {
  Search,
  CreditCard,
  Building2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Repeat,
} from 'lucide-react-native';
import { getAutoPaySchools, type AutoPaySchool } from '../../services/paymentService';

const STATUS_CONFIG = {
  active: { label: 'Active', bg: Theme.colors.successBg, text: Theme.colors.success },
  pending: { label: 'Pending', bg: Theme.colors.warningBg, text: Theme.colors.warning },
  failed: { label: 'Failed', bg: Theme.colors.errorBg, text: Theme.colors.error },
};

export default function AutoPayTrackerScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState<AutoPaySchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadSchools = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError('');
    try {
      const data = await getAutoPaySchools();
      setSchools(data);
    } catch (err) {
      console.error('Failed to load auto-pay schools:', err);
      setLoadError('Unable to load auto-pay schools. Pull to retry.');
      setSchools([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const onRefresh = useCallback(() => {
    loadSchools(true);
  }, [loadSchools]);

  const filtered = schools.filter(s =>
    s.schoolName.toLowerCase().includes(search.toLowerCase()) ||
    s.planName.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = schools.filter(s => s.status === 'active').length;
  const issueCount = schools.filter(s => s.status !== 'active').length;

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Auto Pay Tracker"
        subtitle="Schools with automatic renewal enabled"
        onBackPress={() => navigation.goBack()}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={onRefresh}
            accessibilityLabel="Refresh"
          >
            <RefreshCw size={18} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <View style={innerPageLayoutStyles.contentFront}>
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
              <AppText variant="label" muted>Auto-Pay Schools</AppText>
              <AppText variant="h3" weight="bold" style={{ color: Theme.colors.primary }}>
                {schools.length}
              </AppText>
            </View>
            <View style={styles.statBox}>
              <AppText variant="label" muted>Active</AppText>
              <AppText variant="h3" weight="bold" style={{ color: Theme.colors.success }}>
                {activeCount}
              </AppText>
            </View>
            <View style={styles.statBox}>
              <AppText variant="label" muted>Needs Attention</AppText>
              <AppText variant="h3" weight="bold" style={{ color: Theme.colors.warning }}>
                {issueCount}
              </AppText>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
          ) : loadError ? (
            <View style={styles.emptyState}>
              <AlertTriangle size={40} color={Theme.colors.warning} style={{ opacity: 0.7 }} />
              <AppText variant="body" style={{ marginTop: 12, textAlign: 'center' }}>{loadError}</AppText>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Repeat size={40} color={Theme.colors.textMuted} style={{ opacity: 0.4 }} />
              <AppText variant="body" weight="semibold" style={{ marginTop: 12 }}>
                {search ? 'No matching schools found' : 'No schools with automatic renewal enabled'}
              </AppText>
              {!search && (
                <AppText variant="caption" muted style={{ marginTop: 6, textAlign: 'center' }}>
                  Schools appear here after a director enables auto-renewal on subscription.
                </AppText>
              )}
            </View>
          ) : (
            filtered.map(school => {
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
            })
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
    gap: Theme.spacing.md,
  },
  detailItem: {
    flex: 1,
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
    paddingHorizontal: Theme.spacing.lg,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
});
