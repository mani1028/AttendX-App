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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
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
    id: 'trial',
    name: 'Basic Attendance',
    price: 0,
    duration: '7 Days Trial',
    icon: '⚡',
    features: [
      'Student Attendance Tracking',
      'Teacher Attendance',
      'Daily Reports',
      'Single Branch Access',
      'Basic Dashboard',
    ],
    color: '#3b82f6',
  },
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
    color: '#2563eb',
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
    <AppCard style={[styles.planCard, plan.popular && styles.planCardPopular]}>
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
  const navigation = useNavigation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
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
  }, [navigation]);

  const handlePlanSelect = async (plan: Plan) => {
    if (!registrationData) {
      Alert.alert('Error', 'Session expired. Please register again.');
      navigation.replace('RegisterSchool' as never);
      return;
    }

    setLoadingPlan(plan.name);

    const payload = {
      schoolName: registrationData.schoolName,
      email: registrationData.email,
      password: registrationData.password,
      address: registrationData.address,
      hms: [{
        name: registrationData.hmName,
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
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
            <Text style={styles.backBtnLabel}>Edit Registration Details</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Scale your institution with our secure, isolated data architecture.
          </Text>
        </View>

        {/* Pricing Cards */}
        <View style={styles.cardsContainer}>
          {plans.map((plan) => (
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
    backgroundColor: '#020617',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#020617',
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
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  backBtnText: {
    fontSize: 14,
    color: '#64748b',
  },
  backBtnLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 300,
  },
  cardsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  planCard: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
    position: 'relative',
  },
  planCardPopular: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#2563eb',
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
    letterSpacing: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  planIcon: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  planIconText: {
    fontSize: 20,
  },
  planHeaderRight: {
    alignItems: 'flex-end',
  },
  planDuration: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  planPriceSuffix: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: {
    fontSize: 11,
    color: '#60a5fa',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
  },
  selectBtn: {
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectBtnPopular: {
    backgroundColor: '#2563eb',
    borderColor: 'transparent',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  selectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  selectBtnTextPopular: {
    color: '#fff',
  },
  footerText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
});