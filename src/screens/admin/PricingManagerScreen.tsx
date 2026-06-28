import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Theme, colors } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { RootStackParamList } from '../../navigation/types';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { Crown, Star, Zap, CreditCard } from 'lucide-react-native';
import * as adminService from '../../services/adminService';
import { buildPlanDisplayFeatures, formatStoredPriceDisplay } from '../../utils/pricingPlans';

interface PricingPlan {
  id: string;
  plan_code: string;
  title: string;
  description?: string;
  monthly_price?: string | number;
  yearly_price?: string | number;
  active?: boolean;
  highlighted?: boolean;
  max_branches?: number;
  media_retention_days?: number;
  sort_order?: number;
}

const getTierIcon = (planCode: string) => {
  const code = planCode.toLowerCase();
  if (code.includes('enterprise') || code.includes('premium')) {
    return <Crown size={22} color="#fff" />;
  }
  if (code.includes('pro') || code.includes('standard')) {
    return <Star size={22} color="#fff" />;
  }
  return <Zap size={22} color="#fff" />;
};

const getTierGradient = (planCode: string): [string, string] => {
  const code = planCode.toLowerCase();
  if (code.includes('enterprise') || code.includes('premium')) {
    return ['#d97706', '#fbbf24'];
  }
  if (code.includes('pro') || code.includes('standard')) {
    return ['#7c3aed', '#a78bfa'];
  }
  if (code.includes('trial') || code.includes('basic')) {
    return ['#3b82f6', '#60a5fa'];
  }
  return ['#0f766e', '#14b8a6'];
};

export default function PricingManagerScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await adminService.getAllPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load pricing plans:', err);
      setPlans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlans();
  }, [fetchPlans]);

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Pricing Plans"
        subtitle="Live plans from database"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <View style={innerPageLayoutStyles.contentFront}>
          {loading ? (
            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
          ) : plans.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <CreditCard size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
              <AppText style={styles.emptyTitle}>No plans found</AppText>
              <AppText style={styles.emptyText}>Plans are loaded from /pricing/admin/all</AppText>
            </AppCard>
          ) : (
            plans.map(plan => {
              const features = buildPlanDisplayFeatures(plan);
              const gradient = getTierGradient(plan.plan_code || plan.title);
              return (
                <AppCard key={String(plan.id || plan.plan_code)} style={styles.planCard}>
                  <View style={[styles.planHeader, { backgroundColor: gradient[0] }]}>
                    {getTierIcon(plan.plan_code || plan.title)}
                    <View style={styles.planHeaderCopy}>
                      <AppText weight="bold" style={styles.planTitle}>{plan.title}</AppText>
                      <AppText style={styles.planCode}>{String(plan.plan_code || '').toUpperCase()}</AppText>
                    </View>
                    <View style={styles.badges}>
                      {plan.active !== false && (
                        <View style={styles.activeBadge}>
                          <AppText style={styles.activeBadgeText}>Active</AppText>
                        </View>
                      )}
                      {plan.highlighted && (
                        <View style={styles.featuredBadge}>
                          <AppText style={styles.featuredBadgeText}>Featured</AppText>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.planBody}>
                    {plan.description ? (
                      <AppText style={styles.planDesc}>{plan.description}</AppText>
                    ) : null}

                    <View style={styles.priceRow}>
                      <View style={styles.priceItem}>
                        <AppText style={styles.priceLabel}>Monthly</AppText>
                        <AppText weight="bold" style={styles.priceValue}>{formatStoredPriceDisplay(plan.monthly_price)}</AppText>
                      </View>
                      <View style={styles.priceItem}>
                        <AppText style={styles.priceLabel}>Yearly</AppText>
                        <AppText weight="bold" style={styles.priceValue}>{formatStoredPriceDisplay(plan.yearly_price)}</AppText>
                      </View>
                      <View style={styles.priceItem}>
                        <AppText style={styles.priceLabel}>Branches</AppText>
                        <AppText weight="bold" style={styles.priceValue}>{plan.max_branches ?? 1}</AppText>
                      </View>
                    </View>

                    {features.length > 0 && (
                      <View style={styles.featureList}>
                        {features.slice(0, 6).map(feature => (
                          <AppText key={feature} style={styles.featureItem}>• {feature}</AppText>
                        ))}
                      </View>
                    )}
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
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: Theme.colors.textMuted,
    textAlign: 'center',
  },
  planCard: {
    marginBottom: 14,
    overflow: 'hidden',
    padding: 0,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  planHeaderCopy: {
    flex: 1,
  },
  planTitle: {
    color: '#fff',
    fontSize: 18,
  },
  planCode: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  featuredBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featuredBadgeText: {
    color: '#92400e',
    fontSize: 10,
    fontWeight: '700',
  },
  planBody: {
    padding: 16,
  },
  planDesc: {
    fontSize: 13,
    color: Theme.colors.textSec,
    lineHeight: 20,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderLight,
    paddingTop: 12,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  priceValue: {
    fontSize: 15,
    color: Theme.colors.text,
    marginTop: 4,
  },
  featureList: {
    marginTop: 12,
    gap: 4,
  },
  featureItem: {
    fontSize: 12,
    color: Theme.colors.textSec,
    lineHeight: 18,
  },
});
