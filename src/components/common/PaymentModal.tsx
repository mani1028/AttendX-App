import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import API from '../../services/api';
import { getPublicPaymentSettings, isAutoPayGloballyEnabled } from '../../services/paymentService';
import {
  normalizePricingPlan,
  parsePublicPricingPlans,
  selectPublicPaidPlans,
} from '../../utils/pricingPlans';
import AppButton from './AppButton';
import { Theme } from '../../theme/tokens';

interface NormalizedPlan {
  id: string | number;
  title: string;
  plan_code?: string;
  registrationPlan: string;
  totalPriceText: string;
  priceBreakdown?: string;
  features: string[];
  highlighted?: boolean;
  isCustomPricing?: boolean;
  priceValue: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planId: string, orderId: string | null, paymentId?: string) => void;
  schoolName: string;
  email: string;
}

export default function PaymentModal({ isOpen, onClose, onSelectPlan, schoolName, email }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plans, setPlans] = useState<NormalizedPlan[]>([]);
  const [autoPayInfoEnabled, setAutoPayInfoEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen) { return; }

    getPublicPaymentSettings()
      .then(settings => setAutoPayInfoEnabled(isAutoPayGloballyEnabled(settings)))
      .catch(() => setAutoPayInfoEnabled(false));

    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const endpoints = ['pricing/public/plans', '/pricing/public/plans', 'pricing/plans'];
        let loaded: any[] = [];
        for (const endpoint of endpoints) {
          try {
            const res = await API.get(endpoint, { suppressFallback404Log: true } as any);
            const parsed = parsePublicPricingPlans(res.data);
            if (parsed.length > 0) {
              loaded = parsed;
              break;
            }
          } catch {
            // try next endpoint
          }
        }
        const normalized = selectPublicPaidPlans(loaded, 3).map(plan =>
          normalizePricingPlan(plan, 'monthly', 1),
        );
        setPlans(normalized);
      } catch {
        setPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [isOpen]);

  const handleSelect = async (plan: NormalizedPlan) => {
    if (plan.isCustomPricing) {
      Alert.alert('Contact Sales', 'Please contact us at https://attendx.ai/contact for custom pricing.');
      return;
    }

    setProcessing(true);
    try {
      const orderRes = await API.post('/payment/create-order-by-plan', {
        school_name: schoolName,
        plan: plan.registrationPlan || plan.plan_code || plan.id,
        email,
      });
      const { order_id, payment_url } = orderRes.data;

      if (payment_url) {
        await Linking.openURL(payment_url);
        await onSelectPlan(String(plan.registrationPlan || plan.id), order_id);
        onClose();
      } else {
        await onSelectPlan(String(plan.registrationPlan || plan.id), order_id);
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to initiate payment');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) {return null;}

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Your Plan</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            All plans are billed per branch. Pricing scales as you add locations.
          </Text>

          {autoPayInfoEnabled && (
            <View style={styles.autoPayBanner}>
              <Text style={styles.autoPayBannerText}>
                Registration uses a one-time payment. After login, you can enable automatic renewal from Director → Subscription.
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.plansContainer}>
            {loadingPlans ? (
              <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginVertical: 24 }} />
            ) : plans.length === 0 ? (
              <Text style={styles.emptyText}>No plans available. Please try again later.</Text>
            ) : (
              plans.map(plan => {
                const planKey = String(plan.id);
                const isSelected = selectedPlan === planKey;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={planKey}
                    style={[styles.planCard, isSelected && styles.selectedPlan, plan.highlighted && styles.recommendedPlan]}
                    onPress={() => setSelectedPlan(planKey)}
                  >
                    {plan.highlighted && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>POPULAR</Text>
                      </View>
                    )}
                    <Text style={styles.planName}>{plan.title}</Text>
                    <Text style={styles.planPrice}>
                      {plan.isCustomPricing ? 'Contact Sales' : plan.totalPriceText}
                      {!plan.isCustomPricing && plan.totalPriceText ? (
                        <Text style={styles.period}>/month (1 branch)</Text>
                      ) : null}
                    </Text>
                    {plan.priceBreakdown ? (
                      <Text style={styles.breakdown}>{plan.priceBreakdown}</Text>
                    ) : null}
                    {plan.features.slice(0, 6).map((feature, idx) => (
                      <View key={`${planKey}-feature-${idx}`} style={styles.featureRow}>
                        <Text style={styles.check}>✓</Text>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.buttons}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton
              title={processing ? 'Processing...' : 'Continue'}
              onPress={() => {
                const plan = plans.find(p => String(p.id) === selectedPlan);
                if (plan) { handleSelect(plan); }
              }}
              disabled={!selectedPlan || processing || loadingPlans}
            />
          </View>
          <Text style={styles.infoText}>You can upgrade or change your plan anytime from your dashboard.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: Theme.colors.text, borderRadius: 24, width: '100%', maxHeight: '90%', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: Theme.colors.card },
  subtitle: { fontSize: 12, color: '#94a3b8', marginBottom: 16, lineHeight: 18 },
  closeBtn: { padding: Theme.spacing.xs },
  closeText: { fontSize: 20, color: '#94a3b8' },
  plansContainer: { gap: 16, paddingBottom: Theme.spacing.md },
  emptyText: { color: '#94a3b8', textAlign: 'center', paddingVertical: 24 },
  planCard: { borderWidth: 2, borderColor: '#334155', borderRadius: 16, padding: Theme.spacing.md, backgroundColor: '#1e293b' },
  selectedPlan: { borderColor: Theme.colors.blue, backgroundColor: Theme.colors.primary },
  recommendedPlan: { borderColor: '#8b5cf6' },
  recommendedBadge: { position: 'absolute', top: -10, left: '50%', transform: [{ translateX: -50 }], backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: Theme.spacing.xs, borderRadius: 20 },
  recommendedText: { fontSize: 10, fontWeight: '700', color: Theme.colors.card },
  planName: { ...Theme.typography.h3, color: Theme.colors.card, marginBottom: Theme.spacing.sm },
  planPrice: { fontSize: 24, fontWeight: '800', color: Theme.colors.blue, marginBottom: 8 },
  period: { ...Theme.typography.caption, fontWeight: '400', color: '#94a3b8' },
  breakdown: { fontSize: 12, color: '#93c5fd', marginBottom: 10, fontWeight: '600' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  check: { ...Theme.typography.body, color: Theme.colors.success },
  featureText: { fontSize: 13, color: '#cbd5e1', flex: 1 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  infoText: { textAlign: 'center', ...Theme.typography.label, color: Theme.colors.textSec, marginTop: Theme.spacing.md },
  autoPayBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  autoPayBannerText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
    fontWeight: '500',
  },
});
