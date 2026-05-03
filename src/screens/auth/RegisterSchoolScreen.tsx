import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import API from '../../services/api';
import AppButton from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import { formatErrorMessage } from '../../utils/helpers';

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

// Success View Component
const SuccessView: React.FC<{
  successId: string;
  email: string;
  schoolName: string;
  redirectCountdown: number;
  onGoLogin: () => void;
}> = ({ successId, email, schoolName, redirectCountdown, onGoLogin }) => (
  <View style={styles.successContainer}>
    <View style={styles.successIcon}>
      <Text style={styles.successIconText}>✓</Text>
    </View>
    <Text style={styles.cardTitle}>Institution Onboarded!</Text>
    <Text style={styles.cardSubtitle}>Your school has been successfully registered.</Text>

    <View style={styles.successDetails}>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>SCHOOL ID</Text>
        <Text style={styles.detailValue}>{successId}</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>SCHOOL NAME</Text>
        <Text style={styles.detailValueSmall}>{schoolName}</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>LOGIN EMAIL</Text>
        <Text style={styles.detailValueSmall}>{email}</Text>
      </View>
    </View>

    <AppButton title="GO TO LOGIN" onPress={onGoLogin} style={styles.actionButton} />
    <Text style={styles.successCountdown}>
      Redirecting to login in {redirectCountdown}s...
    </Text>
  </View>
);

export default function RegisterSchoolScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [schoolEmail, setSchoolEmail] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [isCreatingSchool, setIsCreatingSchool] = useState<boolean>(false);

  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');

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
    return `${prefix}${custom}`.toUpperCase();
  }, [formData.board, formData.schoolCode]);

  useEffect(() => {
    if (!successId) return;
    const interval = setInterval(() => setRedirectCountdown(prev => Math.max(0, prev - 1)), 1000);
    const timer = setTimeout(() => {
      navigation.replace('Login', { prefillSchoolId: successId, prefillUsername: schoolEmail || '' } as any);
    }, 5000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [successId, schoolEmail, navigation]);

  const handleChange = (key: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: key === 'schoolCode' ? sanitizeCodePart(value) : value }));
    if (key === 'email') { setEmailVerified(false); setOtpSent(false); setOtp(''); }
  };

  const sendOtp = async () => {
    if (!formData.email.trim()) return Alert.alert('Error', 'Please enter email first');
    setOtpSending(true);
    try {
      await API.post('/schools/send-otp', { email: formData.email.trim() });
      setOtpSent(true);
      Alert.alert('Success', 'OTP sent to your email');
    } catch (error: any) {
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail) || 'Failed to send OTP');
    } finally { setOtpSending(false); }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) return Alert.alert('Error', 'Please enter OTP');
    setOtpVerifying(true);
    try {
      await API.post('/schools/verify-otp', { email: formData.email.trim(), otp: otp.trim() });
      setEmailVerified(true);
      Alert.alert('Success', 'Email verified successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Invalid OTP');
    } finally { setOtpVerifying(false); }
  };

  const handleSubmit = () => {
    if (!emailVerified) return Alert.alert('Error', 'Please verify email first');
    if (!formData.schoolName || !formData.hmName || !formData.schoolCode || !formData.board || !formData.password || !formData.address) {
      return Alert.alert('Error', 'Please fill all fields');
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSelected = async (planId: string) => {
    setIsCreatingSchool(true);
    const payload = {
      schoolCode: formData.schoolCode,
      schoolName: formData.schoolName,
      board: formData.board,
      email: formData.email,
      password: formData.password,
      address: formData.address,
      plan: planId,
      hms: [{ name: formData.hmName, phone: "0000000000", email: formData.email, designation: "Headmaster", position: "Administrator" }]
    };

    try {
      const response = await API.post('/schools/create', payload);
      setSchoolEmail(formData.email);
      setSchoolName(formData.schoolName);
      setSuccessId(response.data.school_code);
      setShowPaymentModal(false);
    } catch (error: any) {
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail) || 'Registration failed');
    } finally { setIsCreatingSchool(false); }
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerSection}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandSubtitle}>Empowering institutions with next-gen management solutions</Text>
          </View>

          <View style={styles.card}>
            {!successId ? (
              <>
                <Text style={styles.cardTitle}>Register Institution</Text>
                <Text style={styles.cardSubtitle}>Complete the form to onboard your school</Text>

                <AppInput label="SCHOOL NAME" placeholder="St. Mary's Academy" value={formData.schoolName} onChangeText={t => handleChange('schoolName', t)} />
                <AppInput label="DIRECTOR NAME" placeholder="John Doe" value={formData.hmName} onChangeText={t => handleChange('hmName', t)} />

                <View style={styles.row}>
                  <View style={{flex: 1}}>
                    <AppInput label="SCHOOL CODE" placeholder="987456" value={formData.schoolCode} onChangeText={t => handleChange('schoolCode', t)} keyboardType="numeric" />
                  </View>
                  <View style={{flex: 1.2}}>
                    <Text style={styles.fieldLabel}>BOARD TYPE</Text>
                    <View style={styles.boardOptions}>
                      {SCHOOL_CODE_OPTIONS.map(opt => (
                        <TouchableOpacity key={opt.value} style={[styles.boardBtn, formData.board === opt.value && styles.boardBtnActive]} onPress={() => handleChange('board', opt.value)}>
                          <Text style={[styles.boardBtnText, formData.board === opt.value && styles.boardBtnTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {generatedSchoolCode ? <Text style={styles.generatedCode}>SYSTEM ID: {generatedSchoolCode}</Text> : null}

                <View style={styles.emailContainer}>
                  <View style={{flex: 1}}>
                    <AppInput label="OFFICIAL EMAIL" placeholder="admin@school.com" value={formData.email} onChangeText={t => handleChange('email', t)} keyboardType="email-address" autoCapitalize="none" editable={!emailVerified} />
                  </View>
                  <TouchableOpacity style={[styles.inlineVerifyBtn, (otpSending || emailVerified) && styles.btnDisabled]} onPress={sendOtp} disabled={otpSending || emailVerified}>
                    <Text style={styles.inlineVerifyBtnText}>{emailVerified ? 'VERIFIED' : otpSending ? '...' : 'VERIFY'}</Text>
                  </TouchableOpacity>
                </View>

                {otpSent && !emailVerified && (
                  <View style={styles.otpSection}>
                    <View style={{flex: 1}}>
                      <AppInput label="ENTER OTP" placeholder="XXXXXX" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} />
                    </View>
                    <TouchableOpacity style={styles.inlineVerifyBtn} onPress={verifyOtp} disabled={otpVerifying}>
                      <Text style={styles.inlineVerifyBtnText}>{otpVerifying ? '...' : 'CONFIRM'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <AppInput label="ADDRESS" placeholder="123 Education Lane, NY" value={formData.address} onChangeText={t => handleChange('address', t)} />
                <AppInput label="PORTAL PASSWORD" placeholder="••••••••" value={formData.password} onChangeText={t => handleChange('password', t)} secureTextEntry />

                <AppButton title="COMPLETE REGISTRATION" onPress={handleSubmit} disabled={!emailVerified} style={styles.actionButton} />

                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
                  <Text style={styles.linkText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            ) : (
              <SuccessView successId={successId} email={schoolEmail || ''} schoolName={schoolName || ''} redirectCountdown={redirectCountdown} onGoLogin={() => navigation.replace('Login' as any)} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Plan</Text>
            {['Basic', 'Professional', 'Enterprise'].map(plan => (
              <TouchableOpacity key={plan} style={styles.planItem} onPress={() => handlePaymentSelected(plan.toLowerCase())} disabled={isCreatingSchool}>
                <Text style={styles.planItemText}>{plan}</Text>
                <Text style={styles.planSelectLabel}>SELECT</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F8FAFC' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 30, marginTop: 20, width: '100%' },
  logo: { width: 300, height: 100, marginBottom: 16, alignSelf: 'center' },
  brandSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  cardSubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
  boardOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  boardBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  boardBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  boardBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  boardBtnTextActive: { color: '#FFFFFF' },
  generatedCode: { fontSize: 12, fontWeight: '700', color: '#2563EB', marginBottom: 16, marginTop: -8, textAlign: 'right' },
  emailContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  otpSection: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  inlineVerifyBtn: { height: 48, backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', marginBottom: 16 },
  inlineVerifyBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  actionButton: { height: 56, borderRadius: 16, backgroundColor: '#2563EB', marginTop: 12 },
  linkContainer: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  successContainer: { alignItems: 'center', paddingVertical: 10 },
  successIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successIconText: { fontSize: 30, color: '#16A34A' },
  successDetails: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginVertical: 20, gap: 12 },
  detailItem: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0', pb: 8 },
  detailLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  detailValue: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  detailValueSmall: { fontSize: 16, fontWeight: '600', color: '#475569' },
  successCountdown: { fontSize: 12, color: '#94A3B8', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 12 },
  planItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  planItemText: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  planSelectLabel: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  modalCloseBtn: { marginTop: 8, alignItems: 'center', padding: 12 },
  modalCloseBtnText: { color: '#EF4444', fontWeight: '700' }
});