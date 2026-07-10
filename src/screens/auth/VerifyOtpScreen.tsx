import { useNavigation } from '@react-navigation/native';
import React, { useState, useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { authService } from '../../api/authService';
import { AppInput } from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ScreenContainer from '../../components/ScreenContainer';
import { formatErrorMessage } from '../../utils/helpers';

import { ChevronLeft, Key } from 'lucide-react-native';
import { Theme } from '../../theme/tokens';


export default function VerifyOtpScreen({ route, navigation }: any) {
  const { schoolId, identifier } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) {return;}
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const verify = async () => {
    if (!otp || otp.trim().length < 4) {
      setError('Please enter the OTP sent to your registered email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authService.verifyOtp(schoolId, identifier, otp.trim());
      const resetToken = (res as any)?.reset_token || (res as any)?.data?.reset_token || '';
      if (!resetToken) {
        setError('OTP verification failed. No reset token received.');
        return;
      }
      navigation.navigate('ResetPassword', { schoolId, identifier, resetToken });
    } catch (err: any) {
      const msg = formatErrorMessage(err?.response?.data?.detail || err?.response?.data?.message) || 'Invalid OTP. Please check and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) {return;}
    setError('');
    try {
      await authService.requestOtp(schoolId, identifier);
      setResendCooldown(60);
    } catch (err: any) {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  return (
    <ScreenContainer bgColor={Theme.colors.background} statusBarStyle="dark-content">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.blobTop} />
          <View style={styles.blobBottom} />

          <View style={styles.topRow}>
            <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ChevronLeft size={20} color={Theme.colors.text} />
            </TouchableOpacity>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <View style={{ width: 36 }} />
          </View>

          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.iconCircle}>
              <Key size={32} color={Theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Verify OTP</Text>
            <Text style={styles.cardSubtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.identifierText}>{identifier}</Text>
            </Text>

            <AppInput
              label="ONE-TIME PASSWORD"
              placeholder="• • • • • •"
              value={otp}
              onChangeText={t => { setOtp(t); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              inputStyle={styles.otpInput}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <AppButton
              title={loading ? 'Verifying...' : 'Verify OTP'}
              onPress={verify}
              disabled={loading}
              loading={loading}
              size="lg"
              style={{ marginTop: Theme.spacing.sm }}
            />

            <TouchableOpacity accessibilityRole="button" onPress={resendOtp} disabled={resendCooldown > 0} style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendDisabled]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('ForgotPassword')} style={styles.backLink}>
            <ChevronLeft size={14} color={Theme.colors.textMuted} />
            <Text style={styles.backLinkText}>Back to Forgot Password</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: Theme.spacing.lg, paddingBottom: Theme.spacing.xxl },
  blobTop: { position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(0,31,80,0.06)' },
  blobBottom: { position: 'absolute', bottom: -60, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(56,189,248,0.05)' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Theme.spacing.xl, marginBottom: Theme.spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: Theme.radius.lg, backgroundColor: Theme.colors.background, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  logo: { width: 160, height: 50 },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 28, padding: 28, shadowColor: Theme.colors.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: Theme.radius.xxxl, backgroundColor: 'rgba(0,31,80,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: Theme.spacing.xl },
  cardTitle: { fontSize: Theme.typography.h2.fontSize, fontWeight: '800', color: Theme.colors.text, textAlign: 'center', letterSpacing: -0.5, marginBottom: Theme.spacing.sm },
  cardSubtitle: { ...Theme.typography.body, color: Theme.colors.textMuted, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  identifierText: { color: Theme.colors.primary, fontWeight: '600' },
  otpInput: { textAlign: 'center', ...Theme.typography.h2, letterSpacing: 12 },
  errorBox: { backgroundColor: 'rgba(220,38,38,0.1)', borderRadius: Theme.radius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.md, alignSelf: 'stretch', borderLeftWidth: 3, borderLeftColor: Theme.colors.error },
  errorText: { color: Theme.colors.error, fontSize: Theme.typography.caption.fontSize, fontWeight: '500' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Theme.spacing.xl },
  resendText: { ...Theme.typography.body, color: Theme.colors.textMuted },
  resendLink: { ...Theme.typography.body, color: Theme.colors.primary, fontWeight: '600' },
  resendDisabled: { color: Theme.colors.textMuted },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Theme.spacing.lg, gap: 6 },
  backLinkText: { ...Theme.typography.body, color: Theme.colors.textMuted, fontWeight: '500' },
});
