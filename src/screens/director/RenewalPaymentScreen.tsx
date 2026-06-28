// src/screens/director/RenewalPaymentScreen.tsx

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
import { Check, Loader2, AlertCircle, CreditCard, Calendar, Lock, Info, Shield, GitBranch, ChevronLeft, CheckCircle2 } from 'lucide-react-native';

import { normalizePricingPlan, sortPricingPlans, parsePublicPricingPlans, selectPublicPaidPlans, getEffectiveBranchLimit, formatBranchLimit, isAtBranchLimit } from '../../utils/pricingPlans';
import { WebView } from 'react-native-webview';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { getPublicPaymentSettings, isAutoPayGloballyEnabled } from '../../services/paymentService';



// Types (simplified for brevity)
interface Plan {
  id: string;
  title: string;
  description?: string;
  priceValue: number;
  isFree?: boolean;
  isCustomPricing?: boolean;
  highlighted?: boolean;
  selectedPriceText?: string;
  originalPriceText?: string;
  plan_code?: string;
  hasPromo?: boolean;
  isCurrent?: boolean;
  perBranch?: boolean;
  unitPriceText?: string;
  totalPriceText?: string;
  priceBreakdown?: string;
  branchCount?: number;
  max_branches?: number;
}
interface SubscriptionInfo {
  school_name?: string;
  director_name?: string;
  billing_cycle?: string;
  auto_renew?: boolean;
  status?: string;
  current_plan?: string;
  days_remaining?: number;
  subscription_end_at?: string;
  trial_end_at?: string;
  total_branches?: number;
  last_payment_at?: string;
  last_payment_amount?: number;
}

type RootStackParamList = {
  RenewalPayment: undefined;
};

type RenewalPaymentRouteProp = RouteProp<RootStackParamList, 'RenewalPayment'>;

export default function RenewalPaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute<RenewalPaymentRouteProp>();
  const insets = useSafeAreaInsets();

  // State mirrors the web version
  const [plans, setPlans] = useState<any[]>([]);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [branchCount, setBranchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [wantsAutoPay, setWantsAutoPay] = useState(false);
  const [enableAutoPayGlobal, setEnableAutoPayGlobal] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const [schoolId, setSchoolId] = useState('');

  const [checkoutData, setCheckoutData] = useState<{
    key: string;
    amount: number;
    orderId: string;
    subscriptionId: string;
    description: string;
    email: string;
  } | null>(null);

  const preselectHandled = useRef(false);

  // Compute display plans reactively from raw plans and billing cycle
  const displayPlans = useMemo(() => {
    const branches = Math.max(1, branchCount || 1);
    const selected = selectPublicPaidPlans(plans, 3);
    const normalized = selected.map(p => normalizePricingPlan(p, billingCycle, branches));
    return sortPricingPlans(normalized);
  }, [plans, billingCycle, branchCount]);

  const branchLimit = useMemo(() => getEffectiveBranchLimit(subInfo), [subInfo]);
  const atBranchLimit = useMemo(() => isAtBranchLimit(branchCount, branchLimit), [branchCount, branchLimit]);

  const fetchPricingPlans = useCallback(async (): Promise<any[]> => {
    const endpoints = ['pricing/public/plans', '/pricing/public/plans', 'pricing/plans'];
    for (const endpoint of endpoints) {
      try {
        const res = await API.get(endpoint, { suppressFallback404Log: true } as any);
        const parsed = parsePublicPricingPlans(res.data);
        if (parsed.length > 0) { return parsed; }
      } catch {
        // try next endpoint
      }
    }
    return [];
  }, []);

  // Helper formatting functions (mirrored from web)
  const fmtDate = (v?: string) => {
    if (!v) {return '—';}
    const d = new Date(v);
    return isNaN(d.getTime())
      ? String(v).slice(0, 10)
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const daysColor = (d: number | null) => {
    if (d === null) {return Theme.colors.textSec;}
    if (d < 0) {return Theme.colors.error;}
    if (d <= 3) {return Theme.colors.warning;}
    if (d <= 7) {return Theme.colors.warning;}
    return Theme.colors.primary;
  };

  const formatStatus = (s?: string) => String(s || 'unknown').replace(/_/g, ' ');

  // Load data – similar to the web's load function
  const load = useCallback(async () => {
    // In a real app, schoolId would come from auth/session storage. We fetch from AsyncStorage.
    const code = (await storage.getString(StorageKeys.SCHOOL_CODE)) || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
    if (!code) {
      setError('School ID missing. Please log in again.');
      setLoading(false);
      return;
    }
    setSchoolId(code);
    setLoading(true);
    setError('');
    try {
      const [statusRes, loadedPlans, settings] = await Promise.all([
        API.post('payment/subscription-status', { school_id: code }),
        fetchPricingPlans(),
        getPublicPaymentSettings(),
      ]);

      const data = statusRes.data as SubscriptionInfo;
      setSubInfo(data);
      setBranchCount(data.total_branches || 0);
      if (data.billing_cycle === 'monthly' || data.billing_cycle === 'yearly') {
        setBillingCycle(data.billing_cycle);
      }
      const autoPayEnabled = isAutoPayGloballyEnabled(settings);
      setEnableAutoPayGlobal(autoPayEnabled);
      if (data.auto_renew && autoPayEnabled) {
        setWantsAutoPay(true);
      } else {
        setWantsAutoPay(false);
      }

      setPlans(loadedPlans);
    } catch (e: any) {
      setError('Unable to load billing information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchPricingPlans]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll activation after a successful order
  const pollActivation = useCallback(async (schoolIdStr: string, attempts = 12) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await API.post('payment/subscription-status', { school_id: schoolIdStr });
        const st = String(res.data?.status || '').toLowerCase();
        if (st === 'active_paid' || res.data?.auto_renew || (res.data?.days_remaining || 0) > 20) {
          setPaySuccess(true);
          setTimeout(() => (navigation as any).navigate('DirectorDashboard'), 2800);
          return true;
        }
      } catch {
        // retry silently
      }
      await new Promise(r => setTimeout(() => r(null), 2000));
    }
    setPaySuccess(true);
    setTimeout(() => (navigation as any).navigate('DirectorDashboard'), 2800);
    return false;
  }, [navigation]);

  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.event === 'success') {
        const response = msg.data;
        const oId = checkoutData?.orderId;
        setCheckoutData(null);
        setLoading(true);
        setError('');

        try {
          await API.post('payment/verify', {
            razorpay_order_id: response.razorpay_order_id || oId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            payment_method: 'razorpay',
          });
        } catch (e) {
          // ignore verification error and rely on polling
        }
        await pollActivation(schoolId);
      } else if (msg.event === 'dismiss' || msg.event === 'fail') {
        setCheckoutData(null);
        if (msg.event === 'fail') {
          Alert.alert('Payment Failed', msg.data?.description || 'The transaction was unsuccessful.');
        }
      }
    } catch (e) {
      setCheckoutData(null);
    }
  }, [checkoutData, schoolId, pollActivation]);

  const handleSelect = useCallback(
    async (plan: any) => {
      if (plan.isCustomPricing || plan.priceValue <= 0) {
        Alert.alert('Contact', 'Please contact us at https://attendx.ai/contact');
        return;
      }
      setLoadingPlan(plan.id);
      setError('');
      try {
        const orderRes = await API.post(
          'payment/renewal/create-order',
          { school_id: schoolId, plan_id: plan.id, billing_cycle: billingCycle, autoPay: wantsAutoPay },
          { headers: { 'x-user-role': 'director' } }
        );
        const email = (await storage.getString(StorageKeys.USER_EMAIL)) || '';
        setCheckoutData({
          key: orderRes.data.key,
          amount: orderRes.data.amount || 0,
          orderId: orderRes.data.order_id || '',
          subscriptionId: orderRes.data.subscription_id || '',
          description: `${plan.title} — ${wantsAutoPay ? 'Auto-Pay' : 'One-time'} (${billingCycle})`,
          email: email,
        });
      } catch (e: any) {
        setError(e?.response?.data?.detail || e.message || 'Payment setup failed.');
      } finally {
        setLoadingPlan(null);
      }
    },
    [billingCycle, wantsAutoPay, schoolId]
  );

  const getCheckoutHtml = (data: any) => {
    if (!data) {return '';}
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .loader {
              border: 4px solid #e2e8f0;
              border-top: 4px solid #1e3a8a;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        </head>
        <body>
          <div class="loader"></div>
          <script>
            window.onload = function() {
              try {
                var options = {
                  "key": "${data.key}",
                  "amount": ${data.amount},
                  "currency": "INR",
                  "name": "AttendX",
                  "description": "${data.description}",
                  "prefill": {
                    "email": "${data.email}"
                  },
                  "theme": {
                    "color": Theme.colors.primary
                  },
                  "handler": function (response) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      event: 'success',
                      data: response
                    }));
                  },
                  "modal": {
                    "ondismiss": function() {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        event: 'dismiss'
                      }));
                    }
                  }
                };
                if ("${data.orderId}") {
                  options.order_id = "${data.orderId}";
                }
                if ("${data.subscriptionId}") {
                  options.subscription_id = "${data.subscriptionId}";
                  delete options.order_id;
                  delete options.amount;
                }
                var rzp = new Razorpay(options);
                rzp.on('payment.failed', function (response) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    event: 'fail',
                    data: response.error
                  }));
                });
                rzp.open();
              } catch (err) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  event: 'fail',
                  data: { description: err.message }
                }));
              }
            };
          </script>
        </body>
      </html>
    `;
  };

  // UI rendering – simplified but retains key sections
  if (paySuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successBox}>
          <Check size={34} color="#16a34a" strokeWidth={2.5} />
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successMsg}>Your subscription is now active. Redirecting to your dashboard…</Text>
        </View>
      </View>
    );
  }

  if (error && !subInfo) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color={Theme.colors.error} />
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Modal
        visible={checkoutData !== null}
        animationType="slide"
        onRequestClose={() => setCheckoutData(null)}
      >
        <View style={{ flex: 1, backgroundColor: Theme.colors.background, paddingTop: insets.top }}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity accessibilityRole="button" onPress={() => setCheckoutData(null)} style={styles.webViewCloseBtn}>
              <ChevronLeft size={24} color={Theme.colors.text} />
              <Text style={styles.webViewCloseTxt}>Cancel Payment</Text>
            </TouchableOpacity>
          </View>
          <WebView
            originWhitelist={['*']}
            source={{ html: getCheckoutHtml(checkoutData) }}
            onMessage={handleWebViewMessage}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <ActivityIndicator
                size="large"
                color={Theme.colors.primary}
                style={StyleSheet.absoluteFill}
              />
            )}
          />
        </View>
      </Modal>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loaderMsg}>Loading subscription data…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StandardPageHeader
            title="Subscription & Renewal"
            subtitle="Choose a plan and renew your subscription"
            onBackPress={() => navigation.goBack()}
          />

          <View style={styles.content}>
            {error ? (
              <View style={styles.inlineError}>
                <AlertCircle size={18} color={Theme.colors.error} />
                <Text style={styles.inlineErrorText}>{error}</Text>
              </View>
            ) : null}

            {subInfo ? (
              <>
            {/* Status Panel */}
            <View style={styles.card}>
              <View style={styles.statusHeader}>
                <CreditCard size={20} color={Theme.colors.card} />
                <View style={{ marginLeft: Theme.spacing.sm }}>
                  <Text style={styles.statusHeaderTitle}>Subscription Status</Text>
                  <Text style={styles.statusHeaderSub}>{subInfo.school_name || 'Your School'}</Text>
                </View>
              </View>
              <View style={styles.statusBody}>
                <Text style={styles.label}>Plan</Text>
                <Text style={styles.value}>{subInfo.current_plan || 'No Active Plan'}</Text>
                <Text style={styles.label}>Status</Text>
                <Text style={styles.value}>{formatStatus(subInfo.status)}</Text>
                <Text style={styles.label}>Auto-Renewal</Text>
                <Text style={styles.value}>{subInfo.auto_renew ? 'Enabled' : 'Disabled'}</Text>
                <Text style={styles.label}>Valid Until</Text>
                <Text style={styles.value}>{fmtDate(subInfo.subscription_end_at || subInfo.trial_end_at)}</Text>
                <View style={styles.branchRow}>
                  <GitBranch size={16} color={Theme.colors.primary} />
                  <Text style={styles.branchRowLabel}>Active Branches</Text>
                  <Text style={[styles.branchRowValue, atBranchLimit && styles.branchRowValueLimit]}>
                    {branchCount} / {formatBranchLimit(branchLimit)}
                  </Text>
                </View>
                {branchCount > 0 && (
                  <Text style={styles.branchHint}>
                    Plans are billed per branch. Your total updates with each active branch.
                  </Text>
                )}
              </View>
            </View>

            {/* Billing Cycle selection */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Select Billing Interval</Text>
              <View style={styles.segmentedControl}>
                {['monthly', 'yearly'].map(cycle => {
                  const active = billingCycle === cycle;
                  return (
                    <TouchableOpacity accessibilityRole="button"
                      key={cycle}
                      onPress={() => setBillingCycle(cycle as any)}
                      style={[styles.segmentedTab, active && styles.segmentedTabActive]}
                    >
                      <Text style={[styles.segmentedTabText, active && styles.segmentedTabTextActive]}>
                        {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                      </Text>
                      {cycle === 'yearly' && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeTxt}>-15%</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Payment mode */}
            {enableAutoPayGlobal && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Choose Payment Mode</Text>
                <View style={styles.segmentedControl}>
                  {[{ val: false, title: 'One‑time Payment' }, { val: true, title: 'Automatic Renewal' }].map(item => {
                    const active = wantsAutoPay === item.val;
                    return (
                      <TouchableOpacity accessibilityRole="button"
                        key={String(item.val)}
                        onPress={() => setWantsAutoPay(item.val)}
                        style={[styles.segmentedTab, active && styles.segmentedTabActive]}
                      >
                        <Text style={[styles.segmentedTabText, active && styles.segmentedTabTextActive]}>
                          {item.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Plans list */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Select a Plan to {subInfo.days_remaining !== undefined && subInfo.days_remaining < 0 ? 'Renew' : 'Upgrade'}</Text>
              {displayPlans.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.emptyMsg}>No public plans found. Please contact support.</Text>
                </View>
              ) : (
                displayPlans.map(plan => {
                  const isCurrent = Boolean(subInfo?.current_plan && plan.title?.toLowerCase() === subInfo.current_plan.toLowerCase());
                  const loadingP = loadingPlan === plan.id;
                  const canCheckout = !plan.isCustomPricing && plan.priceValue > 0;
                  const isPopular = plan.highlighted && !isCurrent;

                  const features: string[] = plan.features && plan.features.length > 0 ? plan.features : ['Core Features Included', 'Student & Staff Attendance', 'Support Tier Included'];

                  return (
                    <View
                      key={plan.id}
                      style={[
                        styles.planCard,
                        isCurrent && styles.planCardCurrent,
                        isPopular && styles.planCardPopular,
                      ]}
                    >
                      {/* Header Row */}
                      <View style={styles.planCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.planCardTitle}>{plan.title}</Text>
                          {plan.description && <Text style={styles.planCardDesc}>{plan.description}</Text>}
                        </View>

                        {isCurrent && (
                          <View style={styles.currentPlanBadge}>
                            <Text style={styles.currentPlanBadgeTxt}>Current</Text>
                          </View>
                        )}

                        {isPopular && (
                          <View style={styles.popularPlanBadge}>
                            <Text style={styles.popularPlanBadgeTxt}>Popular</Text>
                          </View>
                        )}
                      </View>

                      {/* Pricing Row */}
                      <View style={styles.planCardPricing}>
                        {plan.hasPromo && plan.originalPriceText ? (
                          <Text style={styles.planCardStrike}>{plan.originalPriceText}/branch</Text>
                        ) : null}
                        <View style={styles.planCardPriceRow}>
                          <Text style={styles.planCardPrice}>
                            {plan.isCustomPricing
                              ? 'Contact Sales'
                              : plan.totalPriceText || plan.selectedPriceText}
                          </Text>
                          {!plan.isCustomPricing && (plan.totalPriceText || plan.priceValue > 0) && (
                            <Text style={styles.planCardPeriod}>
                              / {billingCycle === 'monthly' ? 'month' : 'year'}
                            </Text>
                          )}
                        </View>
                      </View>
                      {plan.priceBreakdown ? (
                        <Text style={styles.planPriceBreakdown}>{plan.priceBreakdown}</Text>
                      ) : null}
                      {plan.perBranch && plan.unitPriceText ? (
                        <Text style={styles.planPerBranchMeta}>
                          {plan.unitPriceText} per branch · {plan.branchCount || branchCount || 1} active
                        </Text>
                      ) : null}

                      {/* Features Checklist */}
                      <View style={styles.planFeaturesList}>
                        {features.map((feature, idx) => (
                          <View key={idx} style={styles.featureItem}>
                            <CheckCircle2 size={16} color={isCurrent ? Theme.colors.primary : Theme.colors.success} style={styles.featureIcon} />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Action Button */}
                      <TouchableOpacity accessibilityRole="button"
                        onPress={() => handleSelect(plan)}
                        disabled={loadingPlan !== null || isCurrent || !canCheckout}
                        style={[
                          styles.planCardBtn,
                          isCurrent && styles.planCardBtnCurrent,
                          loadingP && styles.planCardBtnLoading,
                          !canCheckout && styles.planCardBtnDisabled,
                        ]}
                      >
                        {loadingP ? (
                          <ActivityIndicator size="small" color={Theme.colors.card} />
                        ) : (
                          <Text style={[styles.planCardBtnTxt, isCurrent && styles.planCardBtnTxtCurrent]}>
                            {isCurrent
                              ? 'Active Plan'
                              : !canCheckout
                                ? 'Contact Support'
                                : wantsAutoPay
                                  ? 'Subscribe Now'
                                  : 'Pay / Renew Now'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loaderWrap: {
    marginTop: 60,
    alignItems: 'center',
  },
  loaderMsg: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 13,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  errorMsg: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.error,
    ...Theme.typography.body,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
  },
  retryTxt: {
    color: Theme.colors.card,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.errorBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  inlineErrorText: {
    flex: 1,
    color: Theme.colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: Theme.spacing.md,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: Theme.colors.primaryDark,
    padding: 12,
    borderRadius: 12,
  },
  statusHeaderTitle: {
    color: Theme.colors.card,
    ...Theme.typography.bodyMd,
  },
  statusHeaderSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  statusBody: {
    padding: 12,
  },
  label: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.sm,
  },
  value: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#eef2f6',
    borderRadius: 14,
    padding: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
  },
  segmentedTabActive: {
    backgroundColor: Theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedTabText: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textSec,
  },
  segmentedTabTextActive: {
    color: Theme.colors.card,
  },
  badge: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: Theme.spacing.xs,
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16a34a',
  },
  planCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  planCardCurrent: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.background,
  },
  planCardPopular: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  planCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  planCardDesc: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  currentPlanBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
  },
  currentPlanBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  popularPlanBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
  },
  popularPlanBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  planCardPricing: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
    paddingBottom: Theme.spacing.md,
  },
  planCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planCardPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: Theme.colors.text,
  },
  planCardPeriod: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginLeft: Theme.spacing.xs,
    fontWeight: '600',
  },
  planCardStrike: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  planPriceBreakdown: {
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: '700',
    marginTop: -12,
    marginBottom: 10,
  },
  planPerBranchMeta: {
    fontSize: 11,
    color: Theme.colors.textSec,
    marginTop: -8,
    marginBottom: 10,
    fontWeight: '600',
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
  },
  branchRowLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  branchRowValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.primary,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  branchRowValueLimit: {
    color: '#92400e',
    backgroundColor: '#fef3c7',
  },
  branchHint: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  planFeaturesList: {
    marginBottom: Theme.spacing.lg,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    fontWeight: '500',
  },
  planCardBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planCardBtnCurrent: {
    backgroundColor: Theme.colors.border,
  },
  planCardBtnLoading: {
    backgroundColor: '#94a3b8',
  },
  planCardBtnDisabled: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  planCardBtnTxt: {
    ...Theme.typography.bodyMd,
    fontWeight: '800',
    color: Theme.colors.card,
  },
  planCardBtnTxtCurrent: {
    color: Theme.colors.textSec,
  },
  emptyMsg: {
    textAlign: 'center',
    color: Theme.colors.textSec,
    fontWeight: '700',
    marginTop: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.lg,
  },
  successBox: {
    backgroundColor: Theme.colors.background,
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  successTitle: {
    marginTop: Theme.spacing.md,
    fontSize: 22,
    fontWeight: '900',
    color: Theme.colors.text,
  },
  successMsg: {
    marginTop: Theme.spacing.sm,
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    textAlign: 'center',
  },
  webViewHeader: {
    height: 56,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
  },
  webViewCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webViewCloseTxt: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
  },
});
