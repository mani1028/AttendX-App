import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import { Theme } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { getPublicPaymentSettings, isAutoPayGloballyEnabled } from '../../services/paymentService';
import {
  normalizePricingPlan,
  parsePublicPricingPlans,
  selectPublicPaidPlans,
} from '../../utils/pricingPlans';



// Types
interface Plan {
  id: string;
  name: string;
  plan_code?: string;
  price: number;
  priceDisplay?: string;
  priceBreakdown?: string;
  duration: string;
  icon: string;
  features: string[];
  popular?: boolean;
  color: string;
  isCustomPricing?: boolean;
}

const PLAN_ICONS = ['🚀', '⭐', '👑'];

// Plan Card Component
const PlanCard: React.FC<{
  plan: Plan;
  onSelect: (plan: Plan) => void;
  loading: string | null;
}> = ({ plan, onSelect, loading }) => {
  const isLoading = loading === plan.name;
  const displayPrice = plan.isCustomPricing
    ? 'Contact Sales'
    : plan.price === 0
      ? '—'
      : plan.priceDisplay || `₹${plan.price}`;

  return (
    <AppCard style={StyleSheet.flatten([styles.planCard, plan.popular && styles.planCardPopular])}>
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>Most Popular</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <View style={styles.planIcon}>
          <Text style={styles.planIconText}>{plan.icon}</Text>
        </View>
        <View style={styles.planHeaderRight}>
          <Text style={styles.planDuration}>{plan.duration}</Text>
          <Text style={styles.planName}>{plan.name}</Text>
        </View>
      </View>

      <View style={styles.planPriceContainer}>
        <Text style={styles.planPrice}>{displayPrice}</Text>
        {!plan.isCustomPricing && plan.price !== 0 && (
          <Text style={styles.planPriceSuffix}>/ month · 1 branch</Text>
        )}
      </View>
      {plan.priceBreakdown ? (
        <Text style={styles.planBreakdown}>{plan.priceBreakdown}</Text>
      ) : null}

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>✓</Text>
            </View>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity accessibilityRole="button"
        style={[styles.selectBtn, plan.popular && styles.selectBtnPopular]}
        onPress={() => onSelect(plan)}
        disabled={!!loading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Theme.colors.card} />
        ) : (
          <Text style={[styles.selectBtnText, plan.popular && styles.selectBtnTextPopular]}>
            {plan.isCustomPricing ? 'Contact Sales' : 'Get Started'}
          </Text>
        )}
      </TouchableOpacity>
    </AppCard>
  );
};

export default function PricingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userToken, setTabBarVisible } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [plansList, setPlansList] = useState<Plan[]>([]);
  const [autoPayInfoEnabled, setAutoPayInfoEnabled] = useState(false);
  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const handleScroll = useScrollTabBar();


  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const endpoints = ['pricing/public/plans', '/pricing/public/plans', 'pricing/plans', '/plans', '/payment/plans'];
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

        const normalized = selectPublicPaidPlans(loaded, 3).map((plan, idx) => {
          const mapped = normalizePricingPlan(plan, 'monthly', 1);
          return {
            id: String(mapped.registrationPlan || mapped.id),
            name: mapped.title,
            plan_code: mapped.plan_code,
            price: mapped.priceValue,
            priceDisplay: mapped.totalPriceText,
            priceBreakdown: mapped.priceBreakdown,
            duration: 'Monthly',
            icon: PLAN_ICONS[idx] || '🚀',
            features: mapped.features.length > 0 ? mapped.features : ['Core features included'],
            popular: mapped.highlighted,
            color: mapped.highlighted ? Theme.colors.blue : '#64748b',
            isCustomPricing: mapped.isCustomPricing,
          } satisfies Plan;
        });

        if (normalized.length > 0) {
          setPlansList(normalized);
        }
      } catch (err) {
        console.log('Failed to fetch plans', err);
      }
    };
    fetchPlans();
    getPublicPaymentSettings()
      .then(settings => setAutoPayInfoEnabled(isAutoPayGloballyEnabled(settings)))
      .catch(() => setAutoPayInfoEnabled(false));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (userToken) {
          // If logged in, fetch details from AsyncStorage to enable plan upgrades
          const schoolName = await AsyncStorage.getItem('school_name') || await AsyncStorage.getItem('schoolName') || '';
          const email = await storage.getString(StorageKeys.USER_EMAIL) || '';
          const name = await AsyncStorage.getItem('user_name') || '';
          setRegistrationData({
            schoolName,
            email,
            directorName: name,
            isLoggedIn: true,
          });
          return;
        }

        const data = await AsyncStorage.getItem('registrationData');
        if (data) {
          setRegistrationData(JSON.parse(data));
        } else {
          Alert.alert(
            'Session Expired',
            'Please register again.',
            [{ text: 'OK', onPress: () => navigation.replace('RegisterSchool' as any) }]
          );
        }
      } catch (error) {
        console.error('Failed to load registration data:', error);
      }
    };
    loadData();
  }, [navigation, userToken]);

  const handlePlanSelect = async (plan: Plan) => {
    if (!registrationData) {
      Alert.alert('Error', 'Session expired. Please register again.');
      if (userToken) {
        navigation.goBack();
      } else {
        navigation.replace('RegisterSchool' as any);
      }
      return;
    }

    if (plan.isCustomPricing) {
      Alert.alert('Contact Sales', 'Please contact us at https://attendx.ai/contact for custom pricing.');
      return;
    }

    setLoadingPlan(plan.name);

    if (registrationData.isLoggedIn) {
      try {
        const orderRes = await API.post('/payment/create-order-by-plan', {
          school_name: registrationData.schoolName,
          plan: plan.plan_code || plan.id,
          email: registrationData.email,
        });

        const { order_id, payment_url } = orderRes.data;

        if (payment_url) {
          await Linking.openURL(payment_url);
          Alert.alert(
            'Payment Initiated',
            'Complete the payment in your browser. You will be redirected back.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert('Success', 'Subscription updated successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } catch (error: any) {
        console.error(error);
        Alert.alert('Error', error?.response?.data?.detail || 'Upgrade failed');
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    const payload = {
      schoolName: registrationData.schoolName,
      schoolCode: registrationData.schoolCode,
      board: registrationData.board,
      email: registrationData.email,
      password: registrationData.password,
      address: registrationData.address,
      directors: [{
        name: registrationData.directorName,
        phone: '0000000000',
        email: registrationData.email,
        designation: 'Headmaster',
        position: 'Administrator',
      }],
      plan: plan.plan_code || plan.id,
    };

    try {
      if (plan.price === 0 || plan.isCustomPricing) {
        Alert.alert('Unavailable', 'Please choose a paid plan or contact sales.');
        return;
      }

      const orderRes = await API.post('/payment/create-order-by-plan', {
        school_name: registrationData.schoolName,
        plan: plan.plan_code || plan.id,
        email: registrationData.email,
      });

      // For mobile, we need to handle payment differently
      // Open payment URL in browser or use webview
      const paymentUrl = orderRes.data.payment_url;
      if (paymentUrl) {
        await Linking.openURL(paymentUrl);
        // Poll for payment status or handle deep link callback
        Alert.alert(
          'Payment Initiated',
          'Complete the payment in your browser. You will be redirected back.',
          [{ text: 'OK' }]
        );
      } else {
        // Fallback: direct school creation
        await API.post('/schools/create', payload);
        await AsyncStorage.removeItem('registrationData');
        Alert.alert('Success', 'Registration completed!', [
          { text: 'OK', onPress: () => navigation.replace('Login' as any) },
        ]);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error?.response?.data?.detail || 'Action failed');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Choose Your Plan"
        subtitle="Per-branch pricing — scale as your institution grows"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={innerPageLayoutStyles.contentFront}>
        {autoPayInfoEnabled && !registrationData?.isLoggedIn && (
          <View style={styles.autoPayBanner}>
            <Text style={styles.autoPayBannerText}>
              New school registration uses a one-time payment. After login, directors can enable automatic renewal from Subscription & Renewal.
            </Text>
          </View>
        )}
        {/* Pricing Cards */}
        <View style={styles.cardsContainer}>
          {plansList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.emptyText}>Loading plans…</Text>
          </View>
        ) : (
          plansList.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={handlePlanSelect}
              loading={loadingPlan}
            />
          ))
        )}
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          Secure checkout powered by Razorpay. All data is encrypted via SSL.
        </Text>
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
  cardsContainer: {
    gap: 20,
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.md,
  },
  planCard: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 30,
    position: 'relative',
    shadowColor: Theme.colors.textSec,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  planCardPopular: {
    borderColor: Theme.colors.blue,
    borderWidth: 2,
    shadowColor: Theme.colors.blue,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: Theme.colors.blue,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.card,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  planIcon: {
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  planIconText: {
    fontSize: 22,
  },
  planHeaderRight: {
    alignItems: 'flex-end',
  },
  planDuration: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.blue,
    marginBottom: Theme.spacing.xs,
    backgroundColor: '#eff6ff',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Theme.spacing.lg,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -1,
  },
  planPriceSuffix: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginLeft: Theme.spacing.xs,
    fontWeight: '500',
  },
  planBreakdown: {
    fontSize: 12,
    color: Theme.colors.blue,
    fontWeight: '700',
    marginBottom: Theme.spacing.md,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: Theme.colors.textSec,
    fontSize: 14,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: {
    ...Theme.typography.caption,
    fontWeight: '800',
    color: Theme.colors.blue,
  },
  featureText: {
    flex: 1,
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    fontWeight: '500',
    lineHeight: 20,
  },
  selectBtn: {
    paddingVertical: Theme.spacing.md,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  selectBtnPopular: {
    backgroundColor: Theme.colors.blue,
    borderColor: Theme.colors.blue,
    shadowColor: Theme.colors.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  selectBtnText: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.textSec,
  },
  selectBtnTextPopular: {
    color: Theme.colors.card,
  },
  footerText: {
    ...Theme.typography.caption,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  autoPayBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  autoPayBannerText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 20,
    fontWeight: '500',
  },
});
