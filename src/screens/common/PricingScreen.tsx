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
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';

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

      <TouchableOpacity
        style={[styles.selectBtn, plan.popular && styles.selectBtnPopular]}
        onPress={() => onSelect(plan)}
        disabled={!!loading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
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
  const lastScrollY = useRef(0);

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    
    if (currentScrollY > lastScrollY.current + 10) {
      if (currentScrollY > 100) {
        setTabBarVisible(false);
      }
      lastScrollY.current = currentScrollY;
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
      lastScrollY.current = currentScrollY;
    }
  };

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
              color: p.color || '#3b82f6'
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
          const email = await AsyncStorage.getItem('email') || '';
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
            [{ text: 'OK', onPress: () => navigation.replace('RegisterSchool' as never) }]
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
        navigation.replace('RegisterSchool' as never);
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
            { text: 'OK', onPress: () => navigation.goBack() }
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
            { text: 'OK', onPress: () => navigation.goBack() }
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
        phone: "0000000000",
        email: registrationData.email,
        designation: "Headmaster",
        position: "Administrator",
      }],
      plan: plan.id,
    };

    try {
      if (plan.price === 0) {
        await API.post('/schools/create', payload);
        await AsyncStorage.removeItem('registrationData');
        Alert.alert('Success', 'Trial activated successfully!', [
          { text: 'OK', onPress: () => navigation.replace('Login' as never) }
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
          { text: 'OK', onPress: () => navigation.replace('Login' as never) }
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
    backgroundColor: '#f8fafc',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  backBtnText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '700',
  },
  backBtnLabel: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  planCard: {
    padding: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 30,
    position: 'relative',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  planCardPopular: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    shadowColor: '#3b82f6',
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
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -1,
  },
  planPriceSuffix: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#3b82f6',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 20,
  },
  selectBtn: {
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectBtnPopular: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  selectBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  selectBtnTextPopular: {
    color: '#fff',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
});