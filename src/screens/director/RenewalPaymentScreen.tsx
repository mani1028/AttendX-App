// src/screens/director/RenewalPaymentScreen.tsx

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
import { Check, Loader2, AlertCircle, CreditCard, Calendar, Lock, Info, Shield, GitBranch, ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';

import { normalizePricingPlan, sortPricingPlans, parsePublicPricingPlans, selectPublicPaidPlans, getEffectiveBranchLimit, formatBranchLimit, isAtBranchLimit } from '../../utils/pricingPlans';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { getPublicPaymentSettings, isAutoPayGloballyEnabled } from '../../services/paymentService';
import type { RootStackParamList } from '../../navigation/types';
import { renewalPaymentStyles as styles } from '../../components/director/renewalPayment/renewalPaymentStyles';
import PlanCard from '../../components/director/renewalPayment/PlanCard';
import SubscriptionStatusCard from '../../components/director/renewalPayment/SubscriptionStatusCard';
import RenewalCheckoutModal from '../../components/director/renewalPayment/RenewalCheckoutModal';
import type { SubscriptionInfo } from '../../components/director/renewalPayment/SubscriptionStatusCard';
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

type RenewalPaymentRouteProp = RouteProp<RootStackParamList, 'RenewalPayment'>;

export default function RenewalPaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute<RenewalPaymentRouteProp>();
  const insets = useSafeAreaInsets();
  const upgradeMode = route.params?.upgradeMode ?? null;
  const preselectPlanId = route.params?.preselectPlan ?? null;
  const isUpgradeFlow = upgradeMode === 'branch' || upgradeMode === 'plan';

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

  const renewalTitle = useMemo(() => {
    if (upgradeMode === 'branch') { return 'Add a Branch'; }
    if (upgradeMode === 'plan') { return 'Upgrade Your Plan'; }
    if (subInfo?.days_remaining !== undefined && subInfo.days_remaining < 0) { return 'Renew Your Subscription'; }
    return 'Subscription & Renewal';
  }, [upgradeMode, subInfo?.days_remaining]);

  const renewalSubtitle = useMemo(() => {
    if (upgradeMode === 'branch') {
      return 'Pick a plan with more branch slots, then add your new location from the dashboard.';
    }
    if (upgradeMode === 'plan') {
      return 'Move to a higher tier and unlock more features across your institution.';
    }
    if (subInfo?.days_remaining !== undefined && subInfo.days_remaining < 0) {
      return 'Your subscription has expired. Select a plan to regain access.';
    }
    return 'Choose a plan and renew your subscription';
  }, [upgradeMode, subInfo?.days_remaining]);

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

  useEffect(() => {
    if (!preselectPlanId || preselectHandled.current || displayPlans.length === 0 || loadingPlan || error) {
      return;
    }
    const target = displayPlans.find((plan) => String(plan.id) === String(preselectPlanId));
    if (target) {
      preselectHandled.current = true;
      handleSelect(target);
    }
  }, [preselectPlanId, displayPlans, handleSelect, loadingPlan, error]);


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
      <RenewalCheckoutModal
        visible={checkoutData !== null}
        checkoutData={checkoutData}
        topInset={insets.top}
        onClose={() => setCheckoutData(null)}
        onMessage={handleWebViewMessage}
      />

      {loading ? (
        <View style={styles.loaderWrap}>
          <ScreenSkeleton variant="list" />
          <Text style={styles.loaderMsg}>Loading subscription data…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StandardPageHeader
            scrollWithContent
            containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
            title={renewalTitle}
            subtitle={renewalSubtitle}
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
            <SubscriptionStatusCard
              subInfo={subInfo}
              branchCount={branchCount}
              branchLimit={branchLimit}
              atBranchLimit={atBranchLimit}
              upgradeMode={upgradeMode}
            />

            {/* Billing Cycle            {/* Billing Cycle selection */}
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
            <View style={{ marginBottom: Theme.spacing.md }}>
              <Text style={styles.sectionTitle}>
                {upgradeMode === 'branch'
                  ? 'Select a Plan with More Branches'
                  : isUpgradeFlow
                    ? 'Select a Plan to Upgrade'
                    : `Select a Plan to ${subInfo.days_remaining !== undefined && subInfo.days_remaining < 0 ? 'Renew' : 'Upgrade'}`}
              </Text>
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
                  return (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrent={isCurrent}
                      loadingP={loadingP}
                      canCheckout={canCheckout}
                      isPopular={isPopular}
                      billingCycle={billingCycle}
                      branchCount={branchCount}
                      wantsAutoPay={wantsAutoPay}
                      loadingPlan={loadingPlan}
                      onSelect={handleSelect}
                    />
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
