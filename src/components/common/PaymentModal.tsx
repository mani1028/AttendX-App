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

import AppButton from './AppButton';
import { Theme } from '../../theme/tokens';


interface Plan {
  id: string;
  name: string;
  price: string;
  period?: string;
  features: string[];
  recommended?: boolean;
}

const plans: Plan[] = [
  { id: 'trial', name: 'Trial', price: 'FREE', features: ['Up to 100 students', 'Basic attendance tracking', 'Limited reports', 'Email support'] },
  { id: 'starter', name: 'Starter', price: '₹4,999', period: '/month', features: ['Up to 500 students', 'Advanced attendance', 'Full reports', 'Priority support'], recommended: true },
  { id: 'professional', name: 'Professional', price: '₹9,999', period: '/month', features: ['Unlimited students', 'All Starter features', 'Phone support', 'API access'] },
];

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

  const handleSelect = async (planId: string) => {
    setProcessing(true);
    try {
      const orderRes = await API.post('/payment/create-order-by-plan', {
        school_name: schoolName,
        plan: planId,
        email,
      });
      const { order_id, status, payment_url } = orderRes.data;
      if (status === 'trial') {
        await onSelectPlan(planId, order_id);
        onClose();
        return;
      }
      // For paid plans, open payment URL in browser
      if (payment_url) {
        await Linking.openURL(payment_url);
        // After returning from browser, we assume payment is done; but we need verification.
        // For simplicity, we'll call onSelectPlan with order_id and no payment_id, then backend verifies later.
        await onSelectPlan(planId, order_id);
        onClose();
      } else {
        Alert.alert('Error', 'Payment URL not available');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to initiate payment');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) {return null;}

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Your Plan</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.plansContainer}>
            {plans.map(plan => (
              <TouchableOpacity accessibilityRole="button"
                key={plan.id}
                style={[styles.planCard, selectedPlan === plan.id && styles.selectedPlan]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                {plan.recommended && <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>RECOMMENDED</Text></View>}
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}<Text style={styles.period}>{plan.period || ''}</Text></Text>
                {plan.features.map((f, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Text style={styles.check}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.buttons}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton
              title={processing ? 'Processing...' : 'Continue'}
              onPress={() => selectedPlan && handleSelect(selectedPlan)}
              disabled={!selectedPlan || processing}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: Theme.colors.card },
  closeBtn: { padding: Theme.spacing.xs },
  closeText: { fontSize: 20, color: '#94a3b8' },
  plansContainer: { gap: 16, paddingBottom: Theme.spacing.md },
  planCard: { borderWidth: 2, borderColor: '#334155', borderRadius: 16, padding: Theme.spacing.md, backgroundColor: '#1e293b' },
  selectedPlan: { borderColor: Theme.colors.blue, backgroundColor: Theme.colors.primary },
  recommendedBadge: { position: 'absolute', top: -10, left: '50%', transform: [{ translateX: -50 }], backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: Theme.spacing.xs, borderRadius: 20 },
  recommendedText: { fontSize: 10, fontWeight: '700', color: Theme.colors.card },
  planName: { ...Theme.typography.h3, color: Theme.colors.card, marginBottom: Theme.spacing.sm },
  planPrice: { fontSize: 24, fontWeight: '800', color: Theme.colors.blue, marginBottom: 12 },
  period: { ...Theme.typography.caption, fontWeight: '400', color: '#94a3b8' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  check: { ...Theme.typography.body, color: Theme.colors.success },
  featureText: { fontSize: 13, color: '#cbd5e1' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  infoText: { textAlign: 'center', ...Theme.typography.label, color: Theme.colors.textSec, marginTop: Theme.spacing.md },
});
