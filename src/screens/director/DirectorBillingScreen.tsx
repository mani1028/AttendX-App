import { Theme } from '../../theme/tokens';
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import LinearGradient from 'react-native-linear-gradient';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Buffer } from 'buffer';
import { WebView } from 'react-native-webview';
import AppText from '../../components/common/AppText';
import API from '../../services/api';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  cancelAutoRenewal,
  downloadDirectorReceiptPdf,
  fetchDirectorReceiptHtml,
  getSubscriptionStatus,
} from '../../services/paymentService';


export default function DirectorBillingScreen() {
  const navigation = useNavigation();
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
      const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || '';
      setSchoolCode(schoolCode);
      const headers = schoolCode ? { 'X-School-Code': schoolCode } : {};

      const [overviewRes, statusRes] = await Promise.allSettled([
        API.get('/director/dashboard/overview', { headers, suppressFallback404Log: true } as any),
        schoolCode ? getSubscriptionStatus(schoolCode) : Promise.resolve(null),
      ]);

      if (overviewRes.status === 'fulfilled' && overviewRes.value.data?.ok) {
        const data = overviewRes.value.data;
        setSubscription(data.subscription || null);

        let paymentData = data.payments || data.subscription?.payments;
        if (!paymentData) {
          try {
            const payRes = await API.get('/director/payments', { headers, suppressFallback404Log: true } as any);
            if (payRes.data?.ok) {
              paymentData = payRes.data.payments || payRes.data.data || [];
            }
          } catch {
            // ignore
          }
        }
        setPayments(Array.isArray(paymentData) ? paymentData : []);
      }

      if (statusRes.status === 'fulfilled' && statusRes.value) {
        const statusData = statusRes.value as Record<string, unknown>;
        setAutoRenew(Boolean(statusData.auto_renew));
      } else if (overviewRes.status === 'fulfilled') {
        setAutoRenew(Boolean(overviewRes.value.data?.subscription?.auto_renew));
      }
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
        <ActivityIndicator size="large" color={Theme.colors.primary} />
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
        return { label: 'GRACE PERIOD', color: '#f59e0b', icon: AlertTriangle };
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
      color: '#3B82F6',
      bgColor: '#e8f0fe',
      label: 'Pending',
    };
  };

  return (
    <View style={styles.container}>


      <StandardPageHeader
        title="Billing & Plan"
        subtitle="Manage subscription and payment history"
        onBackPress={handleBackPress}
      />

      <ScrollView
        style={[styles.content, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[innerPageLayoutStyles.contentFront, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          <View style={styles.heroCard}>
            <LinearGradient colors={[Theme.colors.primary, '#3B82F6']} style={styles.heroGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
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
                    <Zap size={16} color="#3B82F6" fill="#3B82F6" />
                    <AppText style={styles.upgradeText}>Renew Plan</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>

          {hasPendingPayment && (
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

          {autoRenew && (
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

          <AppText style={styles.sectionTitle}>Recent Invoices</AppText>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  heroCard: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  heroGradient: {
    borderRadius: 24,
    padding: Theme.spacing.lg,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  heroLabel: { ...Theme.typography.caption, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5, marginBottom: Theme.spacing.xs, opacity: 0.8 },
  heroPlan: { fontSize: 32, fontWeight: '900', color: Theme.colors.card, letterSpacing: -1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  statusText: { ...Theme.typography.caption, fontWeight: '800', letterSpacing: 0.5 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 20 },
  validLabel: { fontSize: 13, marginBottom: Theme.spacing.xs, opacity: 0.9 },
  validDate: { fontSize: 18, fontWeight: '800' },
  upgradeBtn: { backgroundColor: Theme.colors.background, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Theme.spacing.md, paddingVertical: 10, borderRadius: 12, gap: 8 },
  upgradeText: { color: '#3B82F6', ...Theme.typography.body, fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Theme.colors.text, marginBottom: 12, marginTop: Theme.spacing.lg, letterSpacing: -0.5 },
  card: { backgroundColor: Theme.colors.card, borderRadius: 20, padding: Theme.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: Theme.colors.background },
  methodRow: { flexDirection: 'row', alignItems: 'center' },
  methodIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: Theme.spacing.md },
  methodDetails: { flex: 1 },
  methodName: { fontSize: 16, fontWeight: '800', color: Theme.colors.text, marginBottom: 2 },
  methodSub: { fontSize: 13, color: Theme.colors.textSec, fontWeight: '500' },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  invoiceMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  borderTop: { borderTopWidth: 1, borderTopColor: Theme.colors.background },
  invoiceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: Theme.spacing.md },
  invoiceName: { ...Theme.typography.bodyMd, fontWeight: '700', color: Theme.colors.text, marginBottom: 2 },
  invoiceDate: { fontSize: 13, color: Theme.colors.textSec, fontWeight: '500' },
  invoiceAmt: { fontSize: 16, fontWeight: '800', color: Theme.colors.primary, marginRight: 8 },
  viewBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  downloadBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  emptyState: { paddingVertical: 20, alignItems: 'center' },
  emptyStateText: { ...Theme.typography.body, color: '#94a3b8', fontWeight: '500' },
  rowStatusBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  rowStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 16,
    padding: Theme.spacing.md,
    marginBottom: 20,
    gap: 12,
  },
  alertTitle: {
    ...Theme.typography.body,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 2,
  },
  alertMessage: {
    ...Theme.typography.caption,
    color: '#b45309',
    fontWeight: '500',
    lineHeight: 16,
  },
  autoRenewCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: Theme.spacing.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Theme.colors.successBg,
  },
  autoRenewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  autoRenewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoRenewTitle: {
    fontSize: 15,
    color: Theme.colors.text,
    marginBottom: 4,
  },
  autoRenewSub: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    lineHeight: 18,
  },
  disableAutoRenewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.errorBg,
    backgroundColor: '#fff5f5',
  },
  disableAutoRenewText: {
    color: Theme.colors.error,
    fontSize: 14,
  },
  receiptModal: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  receiptModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
    backgroundColor: Theme.colors.card,
  },
  receiptModalTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  receiptModalSub: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  receiptCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptWebView: {
    flex: 1,
    backgroundColor: Theme.colors.card,
  },
  receiptModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
    backgroundColor: Theme.colors.card,
  },
  receiptDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  receiptDownloadText: {
    color: Theme.colors.card,
    fontSize: 15,
  },
});
