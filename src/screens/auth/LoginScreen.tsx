import { Theme } from '../../theme/tokens';
import { useScreenEntrance } from '../../theme/motion';
import React, { useState, useRef, useEffect } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated,
  Dimensions,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { setSessionData } from '../../utils/authSession';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { setAuthToken } from '../../services/api';
import { formatErrorMessage } from '../../utils/helpers';
import { Eye, EyeOff, AlertCircle, Building2, User, Lock, ChevronRight } from 'lucide-react-native';
import GradientButton from '../../components/GradientButton';
import { useRoute } from '@react-navigation/native';
import AccountSwitcher from '../../components/common/AccountSwitcher';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const isSmallDevice = SCREEN_H < 750;

type Props = { navigation: any };

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { signIn, savedAccounts, switchToAccount, logoutAccount } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(true);
  const route: any = useRoute();
  const presetRole = route?.params?.role || 'student';
  const [schoolId, setSchoolId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [loginMessageType, setLoginMessageType] = useState<'error' | 'success'>('error');
  const [focusedField, setFocusedField] = useState<'school' | 'user' | 'pass' | null>(null);

  const { fadeAnim, slideAnim } = useScreenEntrance();

  const handleLogin = async () => {
    setLoginMessage('');
    if (!username.trim() || !password.trim()) {
      setLoginMessage('Please enter your credentials.');
      setLoginMessageType('error');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const normalized = await authService.login(schoolId.trim(), username.trim(), password, presetRole);
      if (!normalized.token) {
        throw new Error('Login succeeded but no token was provided by the server.');
      }
      setLoginMessage('Login successful!');
      setLoginMessageType('success');
      const enteredSchoolCode = schoolId.trim().toUpperCase();
      await setSessionData({
        ...normalized,
        school_code: normalized.schoolCode || enteredSchoolCode || undefined,
        schoolCode: normalized.schoolCode || enteredSchoolCode || undefined,
      });
      setAuthToken(normalized.token || '');
      await signIn(
        normalized.role,
        normalized.user?.name || username,
        normalized.token || '',
        normalized.user?.isClassTeacher ?? false,
      );
    } catch (err: any) {
      const msg = formatErrorMessage(err?.response?.data?.detail || err?.message || 'Login failed');
      setLoginMessage(msg);
      setLoginMessageType('error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />

      {/* Background Accents */}
      <View style={styles.cornerTopRight} pointerEvents="none" />
      <View style={styles.cornerBottomLeft} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + (isSmallDevice ? 20 : 40) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with LOGO */}
          <Animated.View style={[styles.brand, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcome}>Welcome Back</Text>
            <Text style={styles.subWelcome}>SECURE INSTITUTION PORTAL</Text>
          </Animated.View>

          {/* LOGIN CARD */}
          <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={[Theme.colors.primary, Theme.colors.blue]} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.cardTopGradient} />
            <View style={styles.cardInner}>

              {savedAccounts.length > 0 && showSavedOnly ? (
                <View style={styles.savedAccountsContainer}>
                  <Text style={styles.savedAccountsTitle}>Choose an account</Text>
                  {savedAccounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={styles.savedAccountCard}
                      onPress={async () => {
                        setLoginMessage('');
                        if (!acc.token?.trim()) {
                          await logoutAccount(acc.id);
                          setSchoolId(acc.schoolCode || '');
                          setUsername(acc.employeeId || acc.studentId || acc.userId || '');
                          setPassword('');
                          setShowSavedOnly(false);
                          setLoginMessage('Session expired. Please log in again.');
                          setLoginMessageType('error');
                          return;
                        }

                        setLoading(true);
                        try {
                          const success = await switchToAccount(acc);
                          if (!success) {
                            setSchoolId(acc.schoolCode || '');
                            setUsername(acc.employeeId || acc.studentId || acc.userId || '');
                            setPassword('');
                            setShowSavedOnly(false);
                            setLoginMessage('Session expired. Please log in again.');
                            setLoginMessageType('error');
                          }
                        } catch {
                          await logoutAccount(acc.id);
                          setLoginMessage('Session expired. Please log in again.');
                          setLoginMessageType('error');
                          setShowSavedOnly(false);
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      <View style={styles.savedAvatar}>
                        {acc.photoUrl ? (
                          <Image source={{ uri: acc.photoUrl }} style={styles.avatarImg} />
                        ) : (
                          <User size={24} color={Theme.colors.primary} />
                        )}
                      </View>
                      <View style={styles.savedInfo}>
                        <Text style={styles.savedName}>{acc.name || 'User'}</Text>
                        <Text style={styles.savedRole}>{String(acc.role || '').toUpperCase()} • {acc.schoolCode}</Text>
                      </View>
                      <ChevronRight size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity onPress={() => setShowSavedOnly(false)} style={styles.loginAnotherBtn}>
                    <Text style={styles.loginAnotherTxt}>Log into another account</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {loginMessage ? (
                    <View style={[styles.banner, loginMessageType === 'success' ? styles.bannerOk : styles.bannerErr]}>
                      <AlertCircle size={16} color={loginMessageType === 'success' ? Theme.colors.success : Theme.colors.error} />
                      <Text style={[styles.bannerTxt, { color: loginMessageType === 'success' ? Theme.colors.success : Theme.colors.error }]}>
                        {loginMessage}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.form}>
                    <Field label="School ID">
                      <View style={[styles.inputGroup, focusedField === 'school' && styles.inputActive]}>
                        <Building2 size={20} color={focusedField === 'school' ? Theme.colors.primary : '#8B9BB4'} />
                        <TextInput
                          style={styles.input}
                          placeholder="SSC1111"
                          placeholderTextColor="#B7C0D0"
                          value={schoolId}
                          onChangeText={t => setSchoolId(t.toUpperCase())}
                          onFocus={() => setFocusedField('school')}
                          onBlur={() => setFocusedField(null)}
                          autoCapitalize="characters"
                          returnKeyType="next"
                        />
                      </View>
                    </Field>

                    <Field label="Email / ID / Roll No">
                      <View style={[styles.inputGroup, focusedField === 'user' && styles.inputActive]}>
                        <User size={20} color={focusedField === 'user' ? Theme.colors.primary : '#8B9BB4'} />
                        <TextInput
                          style={styles.input}
                          placeholder="name@school.com / EMP001"
                          placeholderTextColor="#B7C0D0"
                          value={username}
                          onChangeText={setUsername}
                          onFocus={() => setFocusedField('user')}
                          onBlur={() => setFocusedField(null)}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          returnKeyType="next"
                        />
                      </View>
                    </Field>

                    <Field label="Password">
                      <View style={[styles.inputGroup, focusedField === 'pass' && styles.inputActive]}>
                        <Lock size={20} color={focusedField === 'pass' ? Theme.colors.primary : '#8B9BB4'} />
                        <TextInput
                          style={styles.input}
                          placeholder="••••••••"
                          placeholderTextColor="#B7C0D0"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          onFocus={() => setFocusedField('pass')}
                          onBlur={() => setFocusedField(null)}
                          returnKeyType="done"
                          onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                          {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                        </TouchableOpacity>
                      </View>
                    </Field>
                  </View>

                  <View style={styles.actionRow}>
                    <GradientButton text="SIGN IN →" onPress={handleLogin} loading={loading} style={styles.signInBtn} />
                  </View>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotBtn}
                  >
                    <Text style={styles.forgotTxt}>Forgot password?</Text>
                  </TouchableOpacity>

                  <View style={styles.dividerLine} />

                  <TouchableOpacity
                    onPress={() => Linking.openURL('https://portal.attendx.ai/register-school')}
                    style={styles.registerBtn}
                  >
                    <Text style={styles.registerTxt}>
                      New Institution? <Text style={styles.registerLink}>Register Now</Text>
                    </Text>
                  </TouchableOpacity>

                  {savedAccounts.length > 0 && (
                    <TouchableOpacity onPress={() => setShowSavedOnly(true)} style={styles.viewSavedBtn}>
                      <Text style={styles.viewSavedTxt}>VIEW SAVED ACCOUNTS</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountSwitcher visible={showSwitcher} onClose={() => setShowSwitcher(false)} />
    </View>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: isSmallDevice ? 20 : 40,
    justifyContent: 'center',
  },
  cornerTopRight: {
    position: 'absolute',
    width: SCREEN_W * 0.6,
    height: SCREEN_W * 0.6,
    top: -SCREEN_W * 0.18,
    right: -SCREEN_W * 0.08,
    borderRadius: SCREEN_W * 0.4,
    backgroundColor: Theme.colors.primary,
    opacity: 0.12,
  },
  cornerBottomLeft: {
    position: 'absolute',
    width: SCREEN_W * 0.5,
    height: SCREEN_W * 0.5,
    bottom: -SCREEN_W * 0.15,
    left: -SCREEN_W * 0.12,
    borderRadius: SCREEN_W * 0.4,
    backgroundColor: Theme.colors.blue,
    opacity: 0.08,
  },
  brand: { marginBottom: isSmallDevice ? 15 : 25, alignItems: 'center' },
  logoContainer: {
    width: 300,
    height: 100,
    marginBottom: Theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  welcome: { fontSize: 32, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subWelcome: { fontSize: 13, letterSpacing: 2, color: '#8B9BB4', textAlign: 'center', marginTop: Theme.spacing.xs },
  cardContainer: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: Theme.colors.card,
    overflow: 'hidden',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  cardTopGradient: { height: 6, width: '100%' },
  cardInner: {
    padding: Theme.spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  bannerErr: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
  bannerOk: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
  bannerTxt: { fontSize: 13, fontWeight: '600', marginLeft: Theme.spacing.sm },
  form: { gap: 16 },
  field: { gap: 8 },
  fieldLabel: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: '#8B9BB4',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: Theme.spacing.xs,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 56,
    paddingHorizontal: Theme.spacing.md,
  },
  inputActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.background,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    ...Theme.typography.bodyMd,
    color: '#111827',
    fontWeight: '600',
  },
  eyeBtn: { padding: Theme.spacing.xs },
  actionRow: { marginTop: Theme.spacing.sm },
  signInBtn: { width: '100%', height: 56, borderRadius: 12 },
  forgotBtn: { alignSelf: 'center', marginTop: Theme.spacing.md },
  forgotTxt: { color: Theme.colors.primary, ...Theme.typography.body, fontWeight: '700' },
  dividerLine: { width: '100%', height: 1, backgroundColor: Theme.colors.background, marginVertical: 20 },
  registerBtn: { alignItems: 'center' },
  registerTxt: { ...Theme.typography.body, color: Theme.colors.textSec },
  registerLink: { color: Theme.colors.primary, fontWeight: '800' },
  viewSavedBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  viewSavedTxt: { ...Theme.typography.caption, color: '#111827', fontWeight: '700', letterSpacing: 1 },
  savedAccountsContainer: {
    gap: 12,
    marginTop: Theme.spacing.sm,
  },
  savedAccountsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  savedAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  savedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  savedInfo: {
    flex: 1,
    marginLeft: 14,
  },
  savedName: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: '#111827',
  },
  savedRole: {
    ...Theme.typography.label,
    fontWeight: '600',
    color: '#8B9BB4',
    marginTop: 2,
  },
  loginAnotherBtn: {
    marginTop: Theme.spacing.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginAnotherTxt: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
});

export default LoginScreen;
