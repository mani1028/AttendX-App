import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Theme, colors } from '../../theme/tokens';
import { RootStackParamList } from '../../navigation/types';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import LinearGradient from 'react-native-linear-gradient';
import {
  ChevronLeft,
  Plus,
  Check,
  Crown,
  Star,
  Zap,
  Users,
} from 'lucide-react-native';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  activeSubscribers: number;
  status: 'active' | 'draft' | 'archived';
  tier: 'basic' | 'standard' | 'premium';
}

const MOCK_DATA: PricingPlan[] = [
  {
    id: '1',
    name: 'Basic',
    price: '₹999',
    period: '/month',
    features: [
      'Up to 3 branches',
      'Basic attendance tracking',
      'Student management',
      'Email support',
      '30-day data retention',
    ],
    activeSubscribers: 45,
    status: 'active',
    tier: 'basic',
  },
  {
    id: '2',
    name: 'Standard',
    price: '₹2,499',
    period: '/month',
    features: [
      'Up to 10 branches',
      'Face recognition attendance',
      'Parent notifications',
      'Report generation',
      '90-day data retention',
      'Priority support',
    ],
    activeSubscribers: 128,
    status: 'active',
    tier: 'standard',
  },
  {
    id: '3',
    name: 'Premium',
    price: '₹4,999',
    period: '/month',
    features: [
      'Unlimited branches',
      'AI-powered analytics',
      'Real-time GPS tracking',
      'Custom integrations',
      '365-day data retention',
      'Dedicated account manager',
      'API access',
    ],
    activeSubscribers: 67,
    status: 'active',
    tier: 'premium',
  },
];

const TIER_CONFIG = {
  basic: {
    gradient: ['#3b82f6', '#60a5fa'] as [string, string],
    icon: <Zap size={22} color="#fff" />,
    borderColor: Theme.colors.blue,
  },
  standard: {
    gradient: ['#7c3aed', '#a78bfa'] as [string, string],
    icon: <Star size={22} color="#fff" />,
    borderColor: Theme.colors.violet,
  },
  premium: {
    gradient: ['#d97706', '#fbbf24'] as [string, string],
    icon: <Crown size={22} color="#fff" />,
    borderColor: Theme.colors.amber,
  },
};

const STATUS_MAP = {
  active: { label: 'Active', bg: Theme.colors.successBg, text: Theme.colors.success },
  draft: { label: 'Draft', bg: Theme.colors.warningBg, text: Theme.colors.warning },
  archived: { label: 'Archived', bg: Theme.colors.cardAlt, text: Theme.colors.textMuted },
};

export default function PricingManagerScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [plans] = useState<PricingPlan[]>(MOCK_DATA);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <AppText variant="h3" weight="bold" style={styles.headerTitle}>
          Pricing Plans
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85}>
          <Plus size={18} color="#fff" />
          <AppText weight="bold" style={styles.addBtnText}>Add Plan</AppText>
        </TouchableOpacity>

        {plans.map(plan => {
          const tier = TIER_CONFIG[plan.tier];
          const status = STATUS_MAP[plan.status];

          return (
            <AppCard key={plan.id} style={styles.planCard}>
              <LinearGradient
                colors={tier.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.planGradient}
              >
                <View style={styles.planGradientTop}>
                  <View style={styles.planIconBox}>{tier.icon}</View>
                  <View style={[styles.planStatusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <AppText style={styles.planStatusText}>{status.label}</AppText>
                  </View>
                </View>
                <AppText style={styles.planName}>{plan.name}</AppText>
                <View style={styles.priceRow}>
                  <AppText style={styles.planPrice}>{plan.price}</AppText>
                  <AppText style={styles.planPeriod}>{plan.period}</AppText>
                </View>
              </LinearGradient>

              <View style={styles.planBody}>
                <View style={styles.subscribersRow}>
                  <Users size={14} color={Theme.colors.textMuted} />
                  <AppText variant="caption" muted> {plan.activeSubscribers} active subscribers</AppText>
                </View>

                <View style={styles.featuresDivider} />

                <AppText variant="label" muted style={{ marginBottom: Theme.spacing.sm }}>Features</AppText>
                {plan.features.map((feat, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={[styles.featureCheck, { backgroundColor: `${tier.borderColor}15` }]}>
                      <Check size={12} color={tier.borderColor} />
                    </View>
                    <AppText variant="body" style={styles.featureText}>{feat}</AppText>
                  </View>
                ))}

                <View style={styles.planActions}>
                  <AppButton title="Edit Plan" type="secondary" size="sm" style={{ flex: 1 }} />
                  <AppButton title="View Details" size="sm" style={{ flex: 1 }} />
                </View>
              </View>
            </AppCard>
          );
        })}
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 48,
    borderRadius: Theme.radius.lg,
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
  },
  planCard: {
    marginBottom: Theme.spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  planGradient: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  planGradientTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  planIconBox: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planStatusBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.full,
  },
  planStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 2,
  },
  planBody: {
    padding: Theme.spacing.md,
  },
  subscribersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Theme.spacing.sm,
  },
  featuresDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: Theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.text,
  },
  planActions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
});
