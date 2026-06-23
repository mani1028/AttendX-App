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
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';



// Types
interface Plan {
  id: string;
  name: string;
  price: number;
  priceDisplay?: number;
  duration: string;
  icon: string;
  features: string[];
  popular?: boolean;
  color: string;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Smart School',
    price: 4999,
    priceDisplay: 599,
    duration: 'Monthly',
    icon: '🛡️',
    features: [
      'Face Recognition Attendance',
      'Student + Teacher Dashboard',
      'Homework Management',
      'Marks & Exams Tracking',
      'Parent Notifications',
      'Leave Requests (Parent Control)',
      'Multi-Class & Section Support',
    ],
    popular: true,
    color: '#6648dc',
  },
  {
    id: 'professional',
    name: 'Advanced Institution',
    price: 9999,
    priceDisplay: 1500,
    duration: 'Monthly',
    icon: '👑',
    features: [
      'Multi-Branch Management',
      'Centralized Attendance System',
      'Advanced Analytics & Reports',
      'Role-Based Dashboards (Admin/Teacher/Student)',
      'API Integration',
      'SMS & WhatsApp Alerts',
      'Custom Branding',
      '24/7 Priority Support',
    ],
    color: '#8b5cf6',
  },
];

// Plan Card Component
const PlanCard: React.FC<{
  plan: Plan;
  onSelect: (plan: Plan) => void;
  loading: string | null;
}> = ({ plan, onSelect, loading }) => {
  const isLoading = loading === plan.name;
  const displayPrice = plan.price === 0 ? 'Free' : `₹${plan.priceDisplay || plan.price}`;

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
        {plan.price !== 0 && <Text style={styles.planPriceSuffix}>/ month</Text>}
      </View>

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
            {plan.price === 0 ? 'Activate Trial' : 'Get Started'}
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
  const [plansList, setPlansList] = useState<Plan[]>(plans);
  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const handleScroll = useScrollTabBar();


  useEffect(() => {
    const fetchPlans = async () => {
      try {
        let res;
        try {
          res = await API.get('/plans', { suppressFallback404Log: true } as any);
        } catch (e) {
          try {
            res = await API.get('/payment/plans', { suppressFallback404Log: true } as any);
          } catch (e2) {
            return; // keep default plans
          }
        }

        if (res && res.data) {
          const apiPlans = Array.isArray(res.data.plans) ? res.data.plans : Array.isArray(res.data) ? res.data : [];
          // Filter out explicitly hidden plans
          const visiblePlans = apiPlans.filter((p: any) => p.is_hidden !== true && p.status !== 'inactive');

          if (visiblePlans.length > 0) {
            setPlansList(visiblePlans.map((p: any, idx: number) => ({
              id: p.id || p.plan_id || p.code || `plan_${idx}`,
              name: p.name || p.plan_name || p.title || 'Plan',
              price: p.price !== undefined ? p.price : 0,
              priceDisplay: p.priceDisplay || p.price,
              duration: p.duration || p.billing_cycle || 'Monthly',
              icon: p.icon || '🚀',
              features: Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? p.features.split(',') : []),
              popular: p.popular || p.is_popular || false,
              color: p.color || Theme.colors.blue,
            })));
          }
        }
      } catch (err) {
        console.log('Failed to fetch plans', err);
      }
    };
    fetchPlans();
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

    setLoadingPlan(plan.name);

    if (registrationData.isLoggedIn) {
      try {
        const orderRes = await API.post('/payment/create-order-by-plan', {
          school_name: registrationData.schoolName,
          plan: plan.id,
          email: registrationData.email,
        });

        const { order_id, status, payment_url } = orderRes.data;

        if (status === 'trial') {
          Alert.alert('Success', 'Trial activated successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }

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
      plan: plan.id,
    };

    try {
      if (plan.price === 0) {
        await API.post('/schools/create', payload);
        await AsyncStorage.removeItem('registrationData');
        Alert.alert('Success', 'Trial activated successfully!', [
          { text: 'OK', onPress: () => navigation.replace('Login' as any) },
        ]);
        return;
      }

      // For paid plans - create order
      const orderRes = await API.post('/payment/create-order', {
        school_name: registrationData.schoolName,
        amount: Math.round(plan.price / 100),
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
      {/* Background */}
      <View style={styles.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
            <Text style={styles.backBtnLabel}>
              {userToken ? 'Back to Billing' : 'Edit Registration Details'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Scale your institution with our secure, isolated data architecture.
          </Text>
        </View>

        {/* Pricing Cards */}
        <View style={styles.cardsContainer}>
          {plansList.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={handlePlanSelect}
              loading={loadingPlan}
            />
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          Secure checkout powered by Razorpay. All data is encrypted via SSL.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  backBtnText: {
    ...Theme.typography.body,
    color: Theme.colors.blue,
    fontWeight: '700',
  },
  backBtnLabel: {
    fontSize: 13,
    color: Theme.colors.blue,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.textSec,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 20,
    marginBottom: Theme.spacing.xl,
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
});
