import { useNavigation } from '@react-navigation/native';
import { motion } from '../../theme/motion';
import React, { useState, useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { authService } from '../../api/authService';
import { formatErrorMessage } from '../../utils/helpers';
import { Theme } from '../../theme/tokens';
import { ChevronLeft, Eye, EyeOff, Building2, User, Lock, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ForgotPasswordScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [schoolId, setSchoolId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...motion.springs.gentle, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const sendOtp = async () => {
    setError(''); setMessage('');
    const sid = (schoolId || '').trim().toUpperCase();
    const id  = (identifier || '').trim();
    if (!sid) { setError('Enter your School Code.'); return; }
    if (!id)  { setError('Enter email or employee ID.'); return; }
    setSendingOtp(true);
    try {
      const res: any = await authService.requestOtp(sid, id);
      const otpNote = res?.data?.otp ? ` (Debug: ${res.data.otp})` : '';
      setMessage(`${res?.data?.detail || 'OTP has been sent to your email.'}${otpNote}`);
      setOtpSent(true);
      setOtpVerified(false);
    } catch (err: any) {
      setError(formatErrorMessage(err?.response?.data?.detail) || 'Unable to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setError(''); setMessage('');
    const sid   = (schoolId || '').trim().toUpperCase();
    const id    = (identifier || '').trim();
    const otpV  = (otp || '').trim();
    if (!otpV) { setError('Please enter the OTP.'); return; }
    setVerifyingOtp(true);
    try {
      const res: any = await authService.verifyOtp(sid, id, otpV);
      const token = String(res?.reset_token || res?.data?.reset_token || '').trim();
      if (!token) {throw new Error('Reset token missing');}
      setMessage(res?.detail || res?.data?.detail || 'OTP verified.');
      setOtpVerified(true);
      setResetToken(token);
    } catch (err: any) {
      setError(formatErrorMessage(err?.response?.data?.detail) || 'OTP verification failed.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const resetPassword = async () => {
    setError(''); setMessage('');
    const sid  = (schoolId || '').trim().toUpperCase();
    const id   = (identifier || '').trim();
    const tok  = (resetToken || '').trim();
    const np   = (newPassword || '').trim();
    const cp   = (confirmPassword || '').trim();
    if (!np || !cp) { setError('Fill all password fields.'); return; }
    if (np !== cp) { setError('Passwords do not match.'); return; }
    setResettingPassword(true);
    try {
      const res: any = await authService.resetPassword(sid, id, tok, np, cp);
      setMessage(res?.data?.detail || 'Password updated successfully!');
      setTimeout(() => navigation.navigate('Login'), 2000);
    } catch (err: any) {
      setError(formatErrorMessage(err?.response?.data?.detail) || 'Password reset failed.');
    } finally {
      setResettingPassword(false);
    }
  };

  const btnLabel = otpVerified
    ? (resettingPassword ? 'Updating...' : 'RESET PASSWORD')
    : otpSent
      ? (verifyingOtp ? 'Verifying...' : 'VERIFY OTP')
      : (sendingOtp ? 'Sending...' : 'SEND OTP');

  const btnDisabled = sendingOtp || verifyingOtp || resettingPassword;
  const btnAction = otpVerified ? resetPassword : otpSent ? verifyOtp : sendOtp;

  return (
    <View style={styles.root}>


      {/* Background decorations matching LoginScreen */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <ChevronLeft size={24} color={Theme.colors.text} />
             </TouchableOpacity>
             <Text style={styles.headerTitle}>Recovery</Text>
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.cardTitle}>{otpVerified ? 'New Password' : 'Forgot Password'}</Text>
            <Text style={styles.cardSubtitle}>
              {otpVerified
                ? 'Please set a new secure password for your institution account.'
                : 'Recover school user passwords by school code and registered identity.'}
            </Text>

            {(error || message) ? (
              <View style={[styles.banner, error ? styles.bannerErr : styles.bannerOk]}>
                <AlertCircle size={16} color={error ? Theme.colors.error : Theme.colors.success} />
                <Text style={[styles.bannerTxt, { color: error ? Theme.colors.error : Theme.colors.success }]}>
                  {error || message}
                </Text>
              </View>
            ) : null}

            <View style={styles.form}>
              {!otpVerified && (
                <>
                  <Field label="School Code">
                    <View style={[styles.inputGroup, focusedField === 'school' && styles.inputActive]}>
                      <Building2 size={18} color={focusedField === 'school' ? Theme.colors.primary : Theme.colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="SSC12345 / CBSE12345"
                        placeholderTextColor={Theme.colors.textMuted}
                        value={schoolId}
                        onChangeText={t => setSchoolId(t.toUpperCase())}
                        onFocus={() => setFocusedField('school')}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="characters"
                        editable={!otpSent}
                      />
                    </View>
                  </Field>

                  <Field label="Email / Employee ID / Roll No.">
                    <View style={[styles.inputGroup, focusedField === 'user' && styles.inputActive]}>
                      <User size={18} color={focusedField === 'user' ? Theme.colors.primary : Theme.colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="teacher@example.com or EMP001"
                        placeholderTextColor={Theme.colors.textMuted}
                        value={identifier}
                        onChangeText={setIdentifier}
                        onFocus={() => setFocusedField('user')}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!otpSent}
                      />
                    </View>
                  </Field>
                </>
              )}

              {otpSent && !otpVerified && (
                <Field label="Enter OTP">
                  <View style={[styles.inputGroup, focusedField === 'otp' && styles.inputActive]}>
                    <ShieldCheck size={18} color={focusedField === 'otp' ? Theme.colors.primary : Theme.colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit verification code"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={otp}
                      onChangeText={setOtp}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="number-pad"
                      maxLength={8}
                    />
                  </View>
                </Field>
              )}

              {otpVerified && (
                <>
                  <Field label="New Password">
                    <View style={[styles.inputGroup, focusedField === 'pass1' && styles.inputActive]}>
                      <Lock size={18} color={focusedField === 'pass1' ? Theme.colors.primary : Theme.colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={Theme.colors.textMuted}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        onFocus={() => setFocusedField('pass1')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                        {showNewPassword ? <EyeOff size={18} color={Theme.colors.textMuted} /> : <Eye size={18} color={Theme.colors.textMuted} />}
                      </TouchableOpacity>
                    </View>
                  </Field>

                  <Field label="Confirm Password">
                    <View style={[styles.inputGroup, focusedField === 'pass2' && styles.inputActive]}>
                      <Lock size={18} color={focusedField === 'pass2' ? Theme.colors.primary : Theme.colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={Theme.colors.textMuted}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        onFocus={() => setFocusedField('pass2')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                        {showConfirmPassword ? <EyeOff size={18} color={Theme.colors.textMuted} /> : <Eye size={18} color={Theme.colors.textMuted} />}
                      </TouchableOpacity>
                    </View>
                  </Field>
                </>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={btnAction}
              disabled={btnDisabled}
              style={styles.submitBtnWrapper}
            >
              <View style={styles.submitBtn}>
                {btnDisabled ? (
                  <ActivityIndicator color={Theme.colors.card} />
                ) : (
                  <Text style={styles.submitTxt}>{btnLabel}</Text>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.dividerLine} />

            <View style={styles.footer}>
              <Text style={styles.footerNote}>Identity Verification Required</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
  kav: { flex: 1 },
  blob1: {
    position: 'absolute', top: -SCREEN_W * 0.1, right: -SCREEN_W * 0.1,
    width: SCREEN_W * 0.7, height: SCREEN_W * 0.7, borderRadius: SCREEN_W * 0.35,
    backgroundColor: Theme.colors.violet, opacity: 0.06,
  },
  blob2: {
    position: 'absolute', bottom: -SCREEN_W * 0.2, left: -SCREEN_W * 0.2,
    width: SCREEN_W * 0.8, height: SCREEN_W * 0.8, borderRadius: SCREEN_W * 0.4,
    backgroundColor: Theme.colors.secondary, opacity: 0.04,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.background,
    marginRight: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxxl,
    padding: Theme.spacing.lg,
    shadowColor: Theme.colors.violet,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 6,
    borderWidth: 1,
    borderColor: Theme.colors.background,
  },
  cardTitle: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  cardSubtitle: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: Theme.spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
  },
  bannerErr: { backgroundColor: '#fef2f2', borderColor: Theme.colors.redLight },
  bannerOk: { backgroundColor: '#ecfdf5', borderColor: Theme.colors.greenLight },
  bannerTxt: { fontSize: Theme.typography.caption.fontSize, fontWeight: '600', marginLeft: Theme.spacing.sm, flex: 1 },
  form: { gap: Theme.spacing.md },
  field: { gap: Theme.spacing.sm },
  fieldLabel: {
    ...Theme.typography.label,
    fontWeight: '700',
    color: Theme.colors.textSec,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: Theme.spacing.xs,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    height: 54,
    paddingHorizontal: Theme.spacing.md,
  },
  inputActive: {
    borderColor: Theme.colors.violet,
    backgroundColor: Theme.colors.background,
    shadowColor: Theme.colors.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: Theme.spacing.md,
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  eyeBtn: { padding: Theme.spacing.xs },
  submitBtnWrapper: {
    marginTop: Theme.spacing.lg,
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
    shadowColor: Theme.colors.violet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.violet,
  },
  submitTxt: {
    color: Theme.colors.card,
    ...Theme.typography.bodyMd,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  dividerLine: { width: '100%', height: 1, backgroundColor: Theme.colors.background, marginVertical: Theme.spacing.lg },
  footer: { alignItems: 'center' },
  footerNote: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
