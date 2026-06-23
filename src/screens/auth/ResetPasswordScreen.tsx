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

import { ChevronLeft, Lock, CheckCircle } from 'lucide-react-native';
import { Theme } from '../../theme/tokens';


export default function ResetPasswordScreen({ route, navigation }: any) {
  const { schoolId, identifier, resetToken } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const reset = async () => {
    if (!password) {return setError('Please enter a new password.');}
    if (!confirmPassword) {return setError('Please confirm your password.');}
    if (password !== confirmPassword) {return setError('Passwords do not match.');}
    if (password.length < 6) {return setError('Password must be at least 6 characters.');}

    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(schoolId, identifier, resetToken, password, confirmPassword);
      setDone(true);
      setTimeout(() => navigation.replace('Login'), 2200);
    } catch (err: any) {
      const msg = formatErrorMessage(err?.response?.data?.detail || err?.response?.data?.message) || 'Failed to reset password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer bgColor="#f5f7fa" statusBarStyle="dark-content">
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
            {done ? (
              <View style={styles.doneContainer}>
                <View style={styles.doneIcon}>
                  <CheckCircle size={48} color={Theme.colors.success} />
                </View>
                <Text style={styles.cardTitle}>Password Updated!</Text>
                <Text style={styles.cardSubtitle}>Your password has been reset. Redirecting to login...</Text>
              </View>
            ) : (
              <>
                <View style={styles.iconCircle}>
                  <Lock size={32} color="#6648dc" />
                </View>
                <Text style={styles.cardTitle}>New Password</Text>
                <Text style={styles.cardSubtitle}>Choose a strong, unique password for your account.</Text>

                <AppInput
                  label="NEW PASSWORD"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChangeText={t => { setPassword(t); setError(''); }}
                  secureTextEntry
                  leftIcon={<Lock size={16} color="#8898aa" />}
                />
                <AppInput
                  label="CONFIRM PASSWORD"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={t => { setConfirmPassword(t); setError(''); }}
                  secureTextEntry
                  leftIcon={<Lock size={16} color="#8898aa" />}
                />

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <AppButton
                  title={loading ? 'Resetting...' : 'Reset Password'}
                  onPress={reset}
                  disabled={loading}
                  loading={loading}
                  size="lg"
                  style={{ marginTop: Theme.spacing.sm }}
                />
              </>
            )}
          </Animated.View>

          {!done && (
            <TouchableOpacity accessibilityRole="button" onPress={() => navigation.replace('Login')} style={styles.backLink}>
              <ChevronLeft size={14} color="#8898aa" />
              <Text style={styles.backLinkText}>Back to Login</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: Theme.spacing.lg, paddingBottom: Theme.spacing.xxl },
  blobTop: { position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(30,58,138,0.06)' },
  blobBottom: { position: 'absolute', bottom: -60, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(56,189,248,0.05)' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: Theme.spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.colors.background, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  logo: { width: 160, height: 50 },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 28, padding: 28, shadowColor: '#6648dc', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(30,58,138,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Theme.colors.text, textAlign: 'center', letterSpacing: -0.5, marginBottom: Theme.spacing.sm },
  cardSubtitle: { ...Theme.typography.body, color: '#8898aa', textAlign: 'center', marginBottom: 28, lineHeight: 22, fontWeight: '500' },
  errorBox: { backgroundColor: 'rgba(220,38,38,0.1)', borderRadius: 12, padding: 12, marginBottom: 12, alignSelf: 'stretch', borderLeftWidth: 3, borderLeftColor: Theme.colors.error },
  errorText: { color: Theme.colors.error, fontSize: 13, fontWeight: '500' },
  doneContainer: { alignItems: 'center', paddingVertical: 12 },
  doneIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(5,150,105,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Theme.spacing.lg, gap: 6 },
  backLinkText: { ...Theme.typography.body, color: '#8898aa', fontWeight: '500' },
});
