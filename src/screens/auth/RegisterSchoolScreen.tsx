import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';

// Types
interface FormData {
  schoolName: string;
  schoolCode: string;
  board: string;
  email: string;
  address: string;
  password: string;
  hmName: string;
}

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
}

const SCHOOL_CODE_OPTIONS = [
  { label: 'SSC', value: 'SSC' },
  { label: 'CBSE', value: 'CBSE' },
  { label: 'ICSE', value: 'ICSE' },
  { label: 'IB', value: 'IB' },
];

const sanitizeCodePart = (value: string): string =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

// Input Field Component
const InputField: React.FC<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  editable?: boolean;
}> = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, editable }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={[styles.input, !editable && styles.inputDisabled]}
      placeholder={placeholder}
      placeholderTextColor="#475569"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      editable={editable}
    />
  </View>
);

// Success View Component
const SuccessView: React.FC<{
  successId: string;
  email: string;
  password: string;
  schoolName: string;
  redirectCountdown: number;
  onGoLogin: () => void;
}> = ({ successId, email, password, schoolName, redirectCountdown, onGoLogin }) => (
  <View style={styles.successContainer}>
    <View style={styles.successIcon}>
      <Text style={styles.successIconText}>✓</Text>
    </View>
    <Text style={styles.successTitle}>Institution Onboarded!</Text>
    <Text style={styles.successSubtitle}>Your school has been successfully registered.</Text>

    <View style={styles.successCard}>
      <View style={styles.successCardItem}>
        <Text style={styles.successCardLabel}>School ID</Text>
        <Text style={styles.successCardValue}>{successId}</Text>
      </View>
      <View style={styles.successDivider} />
      <View style={styles.successCardItem}>
        <Text style={styles.successCardLabel}>School Name</Text>
        <Text style={styles.successCardValueLarge}>{schoolName}</Text>
      </View>
      <View style={styles.successDivider} />
      <View style={styles.successCardItem}>
        <Text style={styles.successCardLabel}>Login Email</Text>
        <Text style={styles.successCardValueMono}>{email}</Text>
      </View>
      <View style={styles.successDivider} />
      <View style={styles.successCardItem}>
        <Text style={styles.successCardLabel}>Login Password</Text>
        <Text style={styles.successCardValueMono}>••••••••</Text>
        <Text style={styles.successCardHint}>Saved during registration</Text>
      </View>
    </View>

    <AppButton title="Go to Login" onPress={onGoLogin} style={styles.successBtn} />
    <Text style={styles.successCountdown}>
      Redirecting to login in {redirectCountdown}s...
    </Text>
  </View>
);

// Payment Modal Component
const PaymentModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectPlan: (planId: string, orderId: string | null) => void;
  schoolName: string;
  email: string;
  loading: boolean;
}> = ({ visible, onClose, onSelectPlan, schoolName, email, loading }) => {
  const plans: PaymentPlan[] = [
    { id: 'basic', name: 'Basic', price: 999, duration: 'month', features: ['Up to 500 students', 'Basic attendance tracking', 'Email support'] },
    { id: 'professional', name: 'Professional', price: 2499, duration: 'month', features: ['Up to 2000 students', 'Advanced analytics', 'Priority support', 'API access'] },
    { id: 'enterprise', name: 'Enterprise', price: 4999, duration: 'month', features: ['Unlimited students', 'Custom features', '24/7 dedicated support', 'SLA guarantee'] },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Plan</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>Choose a subscription plan for {schoolName}</Text>
            
            {plans.map(plan => (
              <TouchableOpacity
                key={plan.id}
                style={styles.planCard}
                onPress={() => onSelectPlan(plan.id, null)}
                disabled={loading}
              >
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>₹{plan.price}<Text style={styles.planDuration}>/{plan.duration}</Text></Text>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.planFeature}>
                    <Text style={styles.planFeatureIcon}>✓</Text>
                    <Text style={styles.planFeatureText}>{feature}</Text>
                  </View>
                ))}
                <View style={styles.planSelectBtn}>
                  <Text style={styles.planSelectText}>Select {plan.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.modalFooterText}>Secure payment powered by Razorpay</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function RegisterSchoolScreen() {
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [schoolEmail, setSchoolEmail] = useState<string | null>(null);
  const [schoolPassword, setSchoolPassword] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [isCreatingSchool, setIsCreatingSchool] = useState<boolean>(false);

  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  const [formData, setFormData] = useState<FormData>({
    schoolName: '',
    schoolCode: '',
    board: '',
    email: '',
    address: '',
    password: '',
    hmName: '',
  });

  const generatedSchoolCode = useMemo(() => {
    const prefix = sanitizeCodePart(formData.board);
    const custom = sanitizeCodePart(formData.schoolCode);
    if (!prefix || !custom) return '';
    const generated = `${prefix}${custom}`;
    return generated ? generated.toUpperCase() : '';
  }, [formData.board, formData.schoolCode]);

  // Redirect countdown effect
  useEffect(() => {
    if (!successId) return;

    setRedirectCountdown(5);
    const interval = setInterval(() => {
      setRedirectCountdown(prev => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const timer = setTimeout(() => {
      navigation.replace('Login' as never, {
        prefillSchoolId: successId,
        prefillUsername: schoolEmail || '',
        registrationSuccess: true,
      } as never);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [successId, schoolEmail, navigation]);

  const handleChange = (key: keyof FormData, value: string) => {
    const finalValue = key === 'schoolCode' ? sanitizeCodePart(value) : value;

    setFormData(prev => ({ ...prev, [key]: finalValue }));
    if (key === 'email') {
      setEmailVerified(false);
      setOtpSent(false);
      setOtp('');
    }
    setErr('');
    setMsg('');
  };

  const sendOtp = async () => {
    const email = formData.email.trim();

    if (!email) {
      Alert.alert('Error', 'Please enter email first');
      return;
    }

    setOtpSending(true);
    setErr('');
    setMsg('');

    try {
      const res = await API.post('/schools/send-otp', { email });
      setOtpSent(true);
      setEmailVerified(false);
      setMsg(res.data?.message || 'OTP sent successfully');
      Alert.alert('Success', 'OTP sent to your email');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to send OTP';
      
      if (error?.response?.status === 409) {
        Alert.alert('Error', 'This email is already registered. Please use a different email or login.');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    const email = formData.email.trim();

    if (!email) {
      Alert.alert('Error', 'Please enter email');
      return;
    }

    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    setOtpVerifying(true);
    setErr('');
    setMsg('');

    try {
      const res = await API.post('/schools/verify-otp', {
        email,
        otp: otp.trim(),
      });

      setEmailVerified(true);
      Alert.alert('Success', 'Email verified successfully');
    } catch (error: any) {
      setEmailVerified(false);
      const errorMessage = error?.response?.data?.detail || error?.message || 'OTP verification failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setOtpVerifying(false);
    }
  };

  const validateForm = (): boolean => {
    if (!emailVerified) {
      Alert.alert('Error', 'Please verify your email before completing registration');
      return false;
    }

    const schoolCodeRaw = (formData.schoolCode || '').trim().toUpperCase();
    const board = (formData.board || '').trim();

    if (!schoolCodeRaw) {
      Alert.alert('Error', 'Please enter your school code.');
      return false;
    }

    if (!board) {
      Alert.alert('Error', 'Please select your board type.');
      return false;
    }

    if (!/^[A-Z0-9]{3,20}$/.test(schoolCodeRaw)) {
      Alert.alert('Error', 'School code must contain 3-20 letters or numbers.');
      return false;
    }

    if (!formData.schoolName.trim()) {
      Alert.alert('Error', 'Please enter school name.');
      return false;
    }

    if (!formData.hmName.trim()) {
      Alert.alert('Error', 'Please enter headmaster name.');
      return false;
    }

    if (!formData.password.trim()) {
      Alert.alert('Error', 'Please enter a password.');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return false;
    }

    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter school address.');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    setShowPaymentModal(true);
  };

  const handlePaymentSelected = async (planId: string, orderId: string | null) => {
    setIsCreatingSchool(true);
    setErr('');
    setMsg('');

    const payload = {
      schoolCode: formData.schoolCode,
      schoolName: formData.schoolName,
      board: formData.board,
      email: formData.email,
      password: formData.password,
      address: formData.address,
      plan: planId,
      razorpay_order_id: orderId || null,
      hms: [{
        name: formData.hmName,
        phone: "0000000000",
        email: formData.email,
        designation: "Headmaster",
        position: "Administrator"
      }]
    };

    try {
      const response = await API.post('/schools/create', payload);

      const schoolCode = response.data.school_code;
      await AsyncStorage.setItem("school_code", schoolCode);
      await AsyncStorage.removeItem("just_registered");
      
      setSchoolEmail(formData.email);
      setSchoolPassword(formData.password);
      setSchoolName(formData.schoolName);
      setSuccessId(schoolCode);
      setShowPaymentModal(false);
      
      Alert.alert('Success', 'School registered successfully!');
    } catch (error: any) {
      let errorMessage = 'Registration failed';
      
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail) && detail.length > 0) {
          errorMessage = detail[0]?.msg || detail[0]?.detail || 'Validation error';
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      if (errorMessage.toLowerCase().includes('already registered')) {
        Alert.alert('Error', `${errorMessage} Try logging in instead.`);
        setShowPaymentModal(false);
        return;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsCreatingSchool(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>🏫</Text>
          </View>
          <Text style={styles.logoTitle}>AttendX</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Main Card */}
        <AppCard style={styles.mainCard}>
          {!successId ? (
            <>
              <Text style={styles.title}>Register New Institution</Text>
              <Text style={styles.subtitle}>Verify your email first, then complete registration.</Text>

              {msg && <View style={styles.successMsg}><Text style={styles.successMsgText}>{msg}</Text></View>}
              {err && <View style={styles.errorMsg}><Text style={styles.errorMsgText}>{err}</Text></View>}

              {/* School Name & HM Name */}
              <View style={styles.row}>
                <InputField
                  label="SCHOOL NAME"
                  placeholder="St. Mary's Academy"
                  value={formData.schoolName}
                  onChangeText={(text) => handleChange('schoolName', text)}
                />
                <InputField
                  label="DIRECTOR NAME"
                  placeholder="John Doe"
                  value={formData.hmName}
                  onChangeText={(text) => handleChange('hmName', text)}
                />
              </View>

              {/* School Code & Board */}
              <View style={styles.row}>
                <InputField
                  label="SCHOOL CODE"
                  placeholder="987456"
                  value={formData.schoolCode}
                  onChangeText={(text) => handleChange('schoolCode', text)}
                  keyboardType="numeric"
                />
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>BOARD TYPE</Text>
                  <View style={styles.pickerContainer}>
                    {SCHOOL_CODE_OPTIONS.map(option => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.pickerOption, formData.board === option.value && styles.pickerOptionActive]}
                        onPress={() => handleChange('board', option.value)}
                      >
                        <Text style={[styles.pickerOptionText, formData.board === option.value && styles.pickerOptionTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {generatedSchoolCode && (
                <Text style={styles.generatedCode}>Generated School ID: {generatedSchoolCode}</Text>
              )}

              {/* Email & Password */}
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>OFFICIAL EMAIL</Text>
                  <View style={styles.emailRow}>
                    <TextInput
                      style={[styles.input, styles.emailInput, emailVerified && styles.inputDisabled]}
                      placeholder="admin@school.com"
                      placeholderTextColor="#475569"
                      value={formData.email}
                      onChangeText={(text) => handleChange('email', text)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!emailVerified}
                    />
                    <TouchableOpacity
                      style={[styles.verifyBtn, (otpSending || emailVerified) && styles.verifyBtnDisabled]}
                      onPress={sendOtp}
                      disabled={otpSending || emailVerified}
                    >
                      <Text style={styles.verifyBtnText}>
                        {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <InputField
                  label="PORTAL PASSWORD"
                  placeholder="••••••••"
                  value={formData.password}
                  onChangeText={(text) => handleChange('password', text)}
                  secureTextEntry
                />
              </View>

              {/* OTP Section */}
              {otpSent && !emailVerified && (
                <View style={styles.otpRow}>
                  <InputField
                    label="ENTER OTP"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.verifyOtpBtn}
                    onPress={verifyOtp}
                    disabled={otpVerifying}
                  >
                    <Text style={styles.verifyOtpBtnText}>
                      {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Address */}
              <InputField
                label="SCHOOL ADDRESS"
                placeholder="123 Education Lane, NY"
                value={formData.address}
                onChangeText={(text) => handleChange('address', text)}
              />

              {/* Submit Button */}
              <AppButton
                title={loading ? 'Initializing...' : 'Complete Registration'}
                onPress={handleSubmit}
                disabled={loading || !emailVerified || !generatedSchoolCode}
                style={styles.submitBtn}
              />
            </>
          ) : (
            <SuccessView
              successId={successId}
              email={schoolEmail || ''}
              password={schoolPassword || ''}
              schoolName={schoolName || ''}
              redirectCountdown={redirectCountdown}
              onGoLogin={() => navigation.replace('Login' as never)}
            />
          )}
        </AppCard>
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSelectPlan={handlePaymentSelected}
        schoolName={formData.schoolName}
        email={formData.email}
        loading={isCreatingSchool}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 5,
  },
  logoText: {
    fontSize: 24,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: 12,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backBtnText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  mainCard: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
  },
  successMsg: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  successMsgText: {
    color: '#34d399',
    fontSize: 14,
  },
  errorMsg: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  errorMsgText: {
    color: '#f87171',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(2,6,23,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#fff',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(2,6,23,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pickerOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pickerOptionText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerOptionTextActive: {
    color: '#fff',
  },
  generatedCode: {
    fontSize: 12,
    color: '#34d399',
    marginBottom: 16,
    marginTop: -8,
  },
  emailRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
  },
  verifyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#2563eb',
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  verifyOtpBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#059669',
    marginBottom: 4,
  },
  verifyOtpBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitBtn: {
    marginTop: 16,
    paddingVertical: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 50,
    color: '#3b82f6',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
  },
  successCard: {
    backgroundColor: 'rgba(2,6,23,0.6)',
    borderRadius: 40,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.3)',
    width: '100%',
    marginBottom: 24,
  },
  successCardItem: {
    marginBottom: 12,
  },
  successCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  successCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  successCardValueLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  successCardValueMono: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#94a3b8',
  },
  successCardHint: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  successDivider: {
    height: 1,
    backgroundColor: 'rgba(51,65,85,0.8)',
    marginVertical: 12,
  },
  successBtn: {
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  successCountdown: {
    fontSize: 12,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 32,
    width: '100%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#94a3b8',
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 16,
  },
  planDuration: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748b',
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planFeatureIcon: {
    color: '#34d399',
    fontSize: 14,
  },
  planFeatureText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  planSelectBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  planSelectText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalFooterText: {
    fontSize: 12,
    color: '#64748b',
  },
});