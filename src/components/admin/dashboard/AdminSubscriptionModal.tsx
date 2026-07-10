import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { X, AlertTriangle, AlertCircle, DollarSign } from 'lucide-react-native';
import * as adminService from '../../../services/adminService';
import { colors, Theme } from '../../../theme/tokens';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import Loader from '../../common/Loader';
import AdminStatusBadge from './AdminStatusBadge';
import { modalStyles } from './modalStyles';
import { formatDate, getDaysLeft } from './helpers';
import type { AdminSchool, AdminSubscription, AdminPayment } from './types';
import { formatErrorMessage } from '../../../utils/helpers';

// Subscription Modal
interface AdminSubscriptionModalProps {
  visible: boolean;
  school: AdminSchool | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminSubscriptionModal({
  visible, school, onClose, onSuccess,
}: AdminSubscriptionModalProps) {
  const [subscription, setSubscription] = useState<AdminSubscription | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extendDays, setExtendDays] = useState('0');
  const [markPaid, setMarkPaid] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [activeTab, setActiveTab] = useState<'manage' | 'history'>('manage');

  useEffect(() => {
    if (visible && school) {
      fetchSubscription();
      fetchPayments();
    }
  }, [visible, school]);

  const fetchSubscription = async () => {
    if (!school) {return;}
    setLoading(true);
    try {
      const sub = await adminService.getSchoolSubscription(school.id);
      setSubscription(sub);
    } catch (err) {
      console.error('Failed to load subscription', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!school) {return;}
    try {
      const paymentsList = await adminService.getSchoolPayments(school.id);
      setPayments(paymentsList);
    } catch (err) {
      console.error('Failed to load payments', err);
    }
  };

  const handleSave = async () => {
    if (!school) {return;}
    setSaving(true);
    try {
      const payload: any = {};
      if (parseInt(extendDays) > 0) {payload.extend_trial_days = parseInt(extendDays);}
      if (markPaid) {
        payload.mark_paid = true;
        payload.amount_paid = parseFloat(amountPaid) || 0;
        payload.payment_method = paymentMethod;
      }
      await adminService.updateSubscription(school.id, payload);
      Alert.alert('Success', 'Subscription updated successfully');
      await fetchSubscription();
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const daysLeft = subscription?.trial_end_at
    ? getDaysLeft(subscription.trial_end_at)
    : subscription?.subscription_end_at
      ? getDaysLeft(subscription.subscription_end_at)
      : null;

  const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft < 0;

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={modalStyles.modalOverlay}>
          <View style={[modalStyles.modalContent, { padding: 40 }]}>
            <Loader />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.modalOverlay}>
        <View style={[modalStyles.modalContent, modalStyles.subscriptionModal]}>
          <View style={modalStyles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText style={modalStyles.modalTitle}>Manage Subscription</AppText>
              <AppText style={{ ...Theme.typography.caption, color: colors.textMuted }}>{school?.name}</AppText>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={modalStyles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Tab Buttons */}
          <View style={modalStyles.tabBar}>
            <TouchableOpacity accessibilityRole="button"
              style={[modalStyles.tabBtn, activeTab === 'manage' && modalStyles.tabBtnActive]}
              onPress={() => setActiveTab('manage')}
            >
              <AppText style={[modalStyles.tabText, activeTab === 'manage' && modalStyles.tabTextActive]}>
                Manage
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[modalStyles.tabBtn, activeTab === 'history' && modalStyles.tabBtnActive]}
              onPress={() => setActiveTab('history')}
            >
              <AppText style={[modalStyles.tabText, activeTab === 'history' && modalStyles.tabTextActive]}>
                History
              </AppText>
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.modalBody}>
            {activeTab === 'manage' && subscription && (
              <>
                {isExpiringSoon && (
                  <View style={modalStyles.warningBanner}>
                    <AlertTriangle size={14} color={colors.warning} />
                    <AppText style={modalStyles.warningText}>Trial ending in {daysLeft} days!</AppText>
                  </View>
                )}
                {isExpired && (
                  <View style={[modalStyles.warningBanner, { backgroundColor: colors.errorSoft }]}>
                    <AlertCircle size={14} color={colors.error} />
                    <AppText style={[modalStyles.warningText, { color: colors.error }]}>Subscription expired! Access blocked.</AppText>
                  </View>
                )}

                <View style={modalStyles.infoGrid}>
                  <View style={modalStyles.infoItem}>
                    <AppText style={modalStyles.infoLabel}>Current Plan</AppText>
                    <AppText style={modalStyles.infoValue}>{subscription.current_plan_name || 'Basic Attendance'}</AppText>
                  </View>
                  <View style={modalStyles.infoItem}>
                    <AppText style={modalStyles.infoLabel}>Status</AppText>
                    <AdminStatusBadge status={subscription.subscription_status || ''} type="subscription" />
                  </View>
                  {!!subscription.trial_end_at && (
                    <View style={modalStyles.infoItem}>
                      <AppText style={modalStyles.infoLabel}>Trial End Date</AppText>
                      <AppText style={modalStyles.infoValue}>{formatDate(subscription.trial_end_at)}</AppText>
                    </View>
                  )}
                  <View style={modalStyles.infoItem}>
                    <AppText style={modalStyles.infoLabel}>Access Enabled</AppText>
                    <AppText style={[modalStyles.infoValue, { color: subscription.access_enabled ? colors.success : colors.error }]}>
                      {subscription.access_enabled ? 'Yes' : 'No'}
                    </AppText>
                  </View>
                </View>

                <View style={modalStyles.formGroup}>
                  <AppText style={modalStyles.formLabel}>Extend trial (days)</AppText>
                  <TextInput
                    style={modalStyles.formInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={extendDays}
                    onChangeText={setExtendDays}
                  />
                </View>

                <View style={modalStyles.formGroup}>
                  <View style={modalStyles.switchRow}>
                    <AppText style={modalStyles.switchLabel}>Mark as paid</AppText>
                    <Switch
                      value={markPaid}
                      onValueChange={setMarkPaid}
                      trackColor={{ false: colors.border, true: colors.accent }}
                      thumbColor={Platform.OS === 'android' ? Theme.colors.card : undefined}
                    />
                  </View>
                </View>

                {markPaid && (
                  <>
                    <View style={modalStyles.formGroup}>
                      <AppText style={modalStyles.formLabel}>Amount paid (₹)</AppText>
                      <TextInput
                        style={modalStyles.formInput}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                        placeholderTextColor={colors.textMuted}
                        value={amountPaid}
                        onChangeText={setAmountPaid}
                      />
                    </View>
                    <View style={modalStyles.formGroup}>
                      <AppText style={modalStyles.formLabel}>Payment method</AppText>
                      <View style={modalStyles.pickerContainer}>
                        {['card', 'upi', 'netbanking', 'wallet'].map(method => (
                          <TouchableOpacity accessibilityRole="button"
                            key={method}
                            style={[modalStyles.pickerOption, paymentMethod === method && modalStyles.pickerOptionActive]}
                            onPress={() => setPaymentMethod(method)}
                          >
                            <AppText style={[modalStyles.pickerText, paymentMethod === method && modalStyles.pickerTextActive]}>
                              {method.charAt(0).toUpperCase() + method.slice(1)}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </>
            )}

            {activeTab === 'history' && (
              payments.length === 0 ? (
                <View style={modalStyles.emptyPayments}>
                  <DollarSign size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: Theme.spacing.md }} />
                  <AppText style={modalStyles.emptyText}>No payment records found</AppText>
                </View>
              ) : (
                payments.map((payment, index) => (
                  <View key={payment.id || index} style={modalStyles.paymentItem}>
                    <View style={modalStyles.paymentHeader}>
                      <AppText style={modalStyles.paymentDate}>{formatDate(payment.paid_at)}</AppText>
                      <View style={[modalStyles.statusBadge, payment.status === 'paid' ? { backgroundColor: colors.successSoft } : { backgroundColor: colors.warningSoft }]}>
                        <AppText style={[modalStyles.statusText, { color: payment.status === 'paid' ? colors.success : colors.warning }]}>
                          {payment.status}
                        </AppText>
                      </View>
                    </View>
                    <AppText style={modalStyles.paymentAmount}>₹{payment.amount}</AppText>
                    <AppText style={modalStyles.paymentPlan}>Plan: {payment.plan_name}</AppText>
                    <AppText style={modalStyles.paymentMethod}>Method: {payment.payment_method}</AppText>
                    {!!payment.razorpay_payment_id && (
                      <AppText style={modalStyles.paymentTxId}>TX: {payment.razorpay_payment_id}</AppText>
                    )}
                  </View>
                ))
              )
            )}
          </ScrollView>

          <View style={modalStyles.modalFooter}>
            <View style={{ flex: 1 }}>
              <AppButton title="Cancel" onPress={onClose} type="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
