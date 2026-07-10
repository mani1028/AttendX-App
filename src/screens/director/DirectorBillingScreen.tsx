import { Theme } from '../../theme/tokens';
import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Alert, Modal, Platform, SafeAreaView } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Repeat,
  Ban,
  Eye,
  X,
} from 'lucide-react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Buffer } from 'buffer';
import { WebView } from 'react-native-webview';
import AppText from '../../components/common/AppText';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  cancelAutoRenewal,
  downloadDirectorReceiptPdf,
  fetchDirectorReceiptHtml,
} from '../../services/paymentService';
import { getDirectorBillingData } from '../../services/directorService';


import type { RootStackParamList } from '../../navigation/types';
import { directorBillingStyles as styles } from '../../components/director/directorBilling/directorBillingStyles';


export default function DirectorBillingScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'DirectorBilling'>>();
  const variant = route.params?.variant || 'subscription';
  const paymentsOnly = variant === 'payments';
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [cancellingAutoRenew, setCancellingAutoRenew] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [schoolCode, setSchoolCode] = useState('');
  const [receiptPreview, setReceiptPreview] = useState<{
    paymentId: string;
    title: string;
    html: string;
  } | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [downloadingPaymentId, setDownloadingPaymentId] = useState<string | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  const fetchSubscription = useCallback(async () => {
    try {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) || '';
      setSchoolCode(code);
      if (!code) {
        return;
      }

      const { subscription: sub, payments: paymentList } = await getDirectorBillingData(code);
      setSubscription(sub);
      setPayments(paymentList);
      setAutoRenew(Boolean(sub?.auto_renew));
    } catch (err) {
      console.log('Failed to fetch subscription', err);
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [fadeAnim, slideAnim]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchSubscription();
    }, [fetchSubscription]),
  );

  const handleDisableAutoRenew = () => {
    Alert.alert(
      'Disable Auto-Renewal?',
      'Your subscription stays active until the end of the current billing cycle. Automatic charges will stop after that.',
      [
        { text: 'Keep Auto-Renewal', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setCancellingAutoRenew(true);
            try {
              const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || '';
              await cancelAutoRenewal(schoolCode);
              setAutoRenew(false);
              Alert.alert('Success', 'Automatic renewal has been disabled.');
              await fetchSubscription();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.detail || err?.message || 'Failed to disable auto-renewal.',
              );
            } finally {
              setCancellingAutoRenew(false);
            }
          },
        },
      ],
    );
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {navigation.goBack();}
    else {(navigation as any).navigate('DirectorDashboard');}
  };

  const arrayBufferToBase64 = (data: ArrayBuffer | unknown): string => {
    if (data instanceof ArrayBuffer) {
      return Buffer.from(new Uint8Array(data)).toString('base64');
    }
    return Buffer.from(data as any).toString('base64');
  };

  const handleViewReceipt = async (paymentId: string | number) => {
    if (!schoolCode || !paymentId) {
      Alert.alert('Error', 'School code missing. Please log in again.');
      return;
    }

    const id = String(paymentId);
    setLoadingReceiptId(id);
    try {
      const html = await fetchDirectorReceiptHtml(paymentId, schoolCode);
      setReceiptPreview({
        paymentId: id,
        title: `Receipt #SP-${id}`,
        html,
      });
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.detail || err?.message || 'Failed to open invoice.',
      );
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const handleDownloadReceipt = async (paymentId?: string | number) => {
    const targetId = paymentId ?? receiptPreview?.paymentId;
    if (!schoolCode || !targetId) {
      Alert.alert('Error', 'School code missing. Please log in again.');
      return;
    }

    const id = String(targetId);
    setDownloadingPaymentId(id);
    try {
      const data = await downloadDirectorReceiptPdf(targetId, schoolCode);
      const fileName = `Receipt_${id}.pdf`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      const base64Data = arrayBufferToBase64(data);

      await RNFS.writeFile(filePath, base64Data, 'base64');
      const exists = await RNFS.exists(filePath);
      if (!exists) { throw new Error('Written file not found'); }

      const finalUrl = Platform.OS === 'android'
        ? `content://com.visys.attendx.fileprovider/internal_files/${fileName}`
        : `file://${filePath}`;

      await Share.open({
        url: finalUrl,
        type: 'application/pdf',
        title: 'Subscription Invoice',
        failOnCancel: false,
      });
    } catch (err: any) {
      const message = String(err?.message || '').toLowerCase();
      if (!message.includes('user did not share') && !message.includes('cancel')) {
        Alert.alert(
          'Error',
          err?.response?.data?.detail || err?.message || 'Failed to download invoice.',
        );
      }
    } finally {
      setDownloadingPaymentId(null);
    }
  };

  const closeReceiptPreview = () => setReceiptPreview(null);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ScreenSkeleton variant="list" />
      </View>
    );
  }

  const planName = subscription?.current_plan_name?.toUpperCase() || subscription?.current_plan_code?.toUpperCase() || 'NO ACTIVE PLAN';

  const rawExpiry = subscription?.subscription_end_at || subscription?.trial_end_at;
  const validUntil = rawExpiry ? new Date(rawExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

  const renewalCost = subscription?.renewal_cost ?? subscription?.last_payment_amount ?? null;
  const displayCost = renewalCost ? `₹${renewalCost}` : '';

  const getStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'active_paid':
        return { label: 'ACTIVE', color: Theme.colors.success, icon: ShieldCheck };
      case 'trial_active':
        return { label: 'ACTIVE TRIAL', color: Theme.colors.primary, icon: ShieldCheck };
      case 'grace_period':
        return { label: 'GRACE PERIOD', color: Theme.colors.warning, icon: AlertTriangle };
      case 'payment_due':
        return { label: 'PAYMENT DUE', color: Theme.colors.error, icon: AlertCircle };
      case 'suspended':
        return { label: 'SUSPENDED', color: Theme.colors.error, icon: XCircle };
      case 'cancelled':
        return { label: 'CANCELLED', color: Theme.colors.textSec, icon: XCircle };
      default:
        return {
          label: (status || 'INACTIVE').toUpperCase(),
          color: Theme.colors.error,
          icon: AlertCircle,
        };
    }
  };

  const statusConfig = getStatusConfig(subscription?.subscription_status);
  const StatusIcon = statusConfig.icon;

  const hasPendingPayment = payments.some(
    p => (p.status || '').toLowerCase() === 'created' || (p.status || '').toLowerCase() === 'pending'
  );

  const getPaymentStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid' || s === 'success' || s === 'captured') {
      return {
        icon: CheckCircle2,
        color: Theme.colors.success,
        bgColor: '#e6f4ea',
        label: 'Paid',
      };
    }
    if (s === 'failed' || s === 'cancelled') {
      return {
        icon: XCircle,
        color: Theme.colors.error,
        bgColor: '#fce8e6',
        label: 'Failed',
      };
    }
    return {
      icon: Clock,
      color: Theme.colors.primaryLight,
      bgColor: '#e8f0fe',
      label: 'Pending',
    };
  };

  return (
    <View style={styles.container}>


      <ScrollView
        style={[styles.content, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title={paymentsOnly ? 'Payment History' : 'Billing & Plan'}
        subtitle={paymentsOnly ? 'Subscription payment records' : 'Manage subscription and payment history'}
        onBackPress={handleBackPress}
      />

        <Animated.View style={[innerPageLayoutStyles.contentFront, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {!paymentsOnly && (
          <View style={styles.heroCard}>
            <View style={styles.heroGradient}>
              <View style={styles.heroHeader}>
                <View style={{ flex: 1, marginRight: Theme.spacing.sm }}>
                  <AppText style={styles.heroLabel}>CURRENT PLAN</AppText>
                  <AppText style={styles.heroPlan} numberOfLines={1}>{planName}</AppText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                  <StatusIcon size={14} color={Theme.colors.card} />
                  <AppText style={[styles.statusText, { color: Theme.colors.card }]}>
                    {statusConfig.label}
                  </AppText>
                </View>
              </View>

              <View style={styles.heroFooter}>
                <View>
                  <AppText style={[styles.validLabel, { color: 'rgba(255,255,255,0.8)' }]}>Valid Until</AppText>
                  <AppText style={[styles.validDate, { color: Theme.colors.card }]}>{validUntil}</AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {!!displayCost && (
                    <AppText style={[styles.validLabel, { color: 'rgba(255,255,255,0.9)', marginBottom: 6, fontWeight: '600' }]}>
                      Renewal Cost: {displayCost}
                    </AppText>
                  )}
                  <TouchableOpacity accessibilityRole="button" style={styles.upgradeBtn} onPress={() => (navigation as any).navigate('RenewalPayment')}>
                    <Zap size={16} color={Theme.colors.primaryLight} fill={Theme.colors.primaryLight} />
                    <AppText style={styles.upgradeText}>Renew Plan</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
          )}

          {!paymentsOnly && hasPendingPayment && (
            <View style={styles.alertBanner}>
              <AlertTriangle size={18} color="#b45309" />
              <View style={{ flex: 1 }}>
                <AppText style={styles.alertTitle}>Verification Pending</AppText>
                <AppText style={styles.alertMessage}>
                  We have received your payment, and it is currently pending verification. Your subscription plan status will be updated automatically as soon as it is confirmed.
                </AppText>
              </View>
            </View>
          )}

          {!paymentsOnly && autoRenew && (
            <View style={styles.autoRenewCard}>
              <View style={styles.autoRenewHeader}>
                <View style={styles.autoRenewIcon}>
                  <Repeat size={18} color={Theme.colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.autoRenewTitle} weight="bold">Automatic Renewal Active</AppText>
                  <AppText style={styles.autoRenewSub}>
                    Your plan renews automatically at the end of each billing cycle.
                  </AppText>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.disableAutoRenewBtn}
                onPress={handleDisableAutoRenew}
                disabled={cancellingAutoRenew}
              >
                {cancellingAutoRenew ? (
                  <ActivityIndicator size="small" color={Theme.colors.error} />
                ) : (
                  <>
                    <Ban size={16} color={Theme.colors.error} />
                    <AppText style={styles.disableAutoRenewText} weight="bold">Disable Auto-Renewal</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {!paymentsOnly && (
            <>
          <AppText style={styles.sectionTitle}>Payment Method</AppText>
          <View style={styles.card}>
            <View style={styles.methodRow}>
              <View style={styles.methodIcon}>
                <CreditCard size={24} color={Theme.colors.primary} />
              </View>
              <View style={styles.methodDetails}>
                <AppText style={styles.methodName}>Invoice Billing</AppText>
                <AppText style={styles.methodSub}>Pay via bank transfer or UPI</AppText>
              </View>
            </View>
          </View>
            </>
          )}

          <AppText style={styles.sectionTitle}>{paymentsOnly ? 'All Payments' : 'Recent Invoices'}</AppText>
          <View style={styles.card}>
            {payments.length > 0 ? (
              payments.map((payment, i) => {
                const pStatusConfig = getPaymentStatusConfig(payment.status);
                const PaymentIcon = pStatusConfig.icon;
                const formattedDate = payment.paid_at || payment.created_at
                  ? new Date(payment.paid_at || payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'N/A';
                return (
                  <View key={payment.id || i} style={[styles.invoiceRow, i > 0 && styles.borderTop]}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.invoiceMain}
                      onPress={() => handleViewReceipt(payment.id)}
                      disabled={loadingReceiptId === String(payment.id)}
                    >
                      <View style={[styles.invoiceIcon, { backgroundColor: pStatusConfig.bgColor }]}>
                        {loadingReceiptId === String(payment.id) ? (
                          <ActivityIndicator size="small" color={pStatusConfig.color} />
                        ) : (
                          <PaymentIcon size={20} color={pStatusConfig.color} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.invoiceName}>{payment.plan_name || 'Renewal Plan'}</AppText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <AppText style={styles.invoiceDate}>{formattedDate}</AppText>
                          <View style={[styles.rowStatusBadge, { backgroundColor: pStatusConfig.bgColor }]}>
                            <AppText style={[styles.rowStatusText, { color: pStatusConfig.color }]}>
                              {pStatusConfig.label}
                            </AppText>
                          </View>
                        </View>
                      </View>
                      <AppText style={styles.invoiceAmt}>₹ {payment.amount || '0'}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.viewBtn}
                      onPress={() => handleViewReceipt(payment.id)}
                      disabled={loadingReceiptId === String(payment.id)}
                    >
                      <Eye size={18} color={Theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.downloadBtn}
                      onPress={() => handleDownloadReceipt(payment.id)}
                      disabled={downloadingPaymentId === String(payment.id)}
                    >
                      {downloadingPaymentId === String(payment.id) ? (
                        <ActivityIndicator size="small" color={Theme.colors.textSec} />
                      ) : (
                        <Download size={18} color={Theme.colors.textSec} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <AppText style={styles.emptyStateText}>No payment history found.</AppText>
              </View>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      <Modal
        visible={Boolean(receiptPreview)}
        animationType="slide"
        onRequestClose={closeReceiptPreview}
      >
        <SafeAreaView style={styles.receiptModal}>
          <View style={styles.receiptModalHeader}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.receiptModalTitle} weight="bold">
                {receiptPreview?.title || 'Invoice'}
              </AppText>
              <AppText style={styles.receiptModalSub}>Subscription payment receipt</AppText>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.receiptCloseBtn}
              onPress={closeReceiptPreview}
            >
              <X size={22} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>

          {receiptPreview?.html ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: receiptPreview.html }}
              style={styles.receiptWebView}
            />
          ) : null}

          <View style={styles.receiptModalFooter}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.receiptDownloadBtn}
              onPress={() => handleDownloadReceipt()}
              disabled={downloadingPaymentId === receiptPreview?.paymentId}
            >
              {downloadingPaymentId === receiptPreview?.paymentId ? (
                <ActivityIndicator size="small" color={Theme.colors.card} />
              ) : (
                <>
                  <Download size={18} color={Theme.colors.card} />
                  <AppText style={styles.receiptDownloadText} weight="bold">Download PDF</AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
