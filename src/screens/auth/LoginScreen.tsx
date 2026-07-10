import { Theme } from '../../theme/tokens';
import { useScreenEntrance } from '../../theme/motion';
import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { setSessionData } from '../../utils/authSession';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { setAuthToken } from '../../services/api';
import { formatErrorMessage } from '../../utils/helpers';
import { AlertCircle, Building2, User, Lock, ChevronRight } from 'lucide-react-native';
import AppButton from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import AppText from '../../components/common/AppText';
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
  const [loading, setLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [loginMessageType, setLoginMessageType] = useState<'error' | 'success'>('error');

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
            <AppText variant="h1" weight="extrabold" style={styles.welcome}>Welcome Back</AppText>
            <AppText variant="caption" muted style={styles.subWelcome}>SECURE INSTITUTION PORTAL</AppText>
          </Animated.View>

          {/* LOGIN CARD */}
          <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={[Theme.colors.primary, Theme.colors.blue]} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.cardTopGradient} />
            <View style={styles.cardInner}>

              {savedAccounts.length > 0 && showSavedOnly ? (
                <View style={styles.savedAccountsContainer}>
                  <AppText variant="h4" weight="bold" color={Theme.colors.textSec} style={styles.savedAccountsTitle}>
                    Choose an account
                  </AppText>
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
                        <AppText variant="bodyMd" weight="bold">{acc.name || 'User'}</AppText>
                        <AppText variant="label" weight="semibold" muted style={styles.savedRole}>
                          {String(acc.role || '').toUpperCase()} • {acc.schoolCode}
                        </AppText>
                      </View>
                      <ChevronRight size={20} color={Theme.colors.border} />
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity onPress={() => setShowSavedOnly(false)} style={styles.loginAnotherBtn}>
                    <AppText variant="body" weight="bold" color={Theme.colors.primary}>Log into another account</AppText>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {loginMessage ? (
                    <View style={[styles.banner, loginMessageType === 'success' ? styles.bannerOk : styles.bannerErr]}>
                      <AlertCircle size={16} color={loginMessageType === 'success' ? Theme.colors.success : Theme.colors.error} />
                      <AppText
                        variant="caption"
                        weight="semibold"
                        color={loginMessageType === 'success' ? Theme.colors.success : Theme.colors.error}
                        style={styles.bannerTxt}
                      >
                        {loginMessage}
                      </AppText>
                    </View>
                  ) : null}

                  <View>
                    <AppInput
                      label="School ID"
                      placeholder="SSC1111"
                      value={schoolId}
                      onChangeText={t => setSchoolId(t.toUpperCase())}
                      autoCapitalize="characters"
                      returnKeyType="next"
                      leftIcon={<Building2 size={20} color={Theme.colors.textMuted} />}
                    />

                    <AppInput
                      label="Email / ID / Roll No"
                      placeholder="name@school.com / EMP001"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      returnKeyType="next"
                      leftIcon={<User size={20} color={Theme.colors.textMuted} />}
                    />

                    <AppInput
                      label="Password"
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      leftIcon={<Lock size={20} color={Theme.colors.textMuted} />}
                    />
                  </View>

                  <View style={styles.actionRow}>
                    <AppButton
                      title="SIGN IN →"
                      onPress={handleLogin}
                      loading={loading}
                      size="lg"
                      style={styles.signInBtn}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotBtn}
                  >
                    <AppText variant="body" weight="bold" color={Theme.colors.primary}>Forgot password?</AppText>
                  </TouchableOpacity>

                  <View style={styles.dividerLine} />

                  <TouchableOpacity
                    onPress={() => Linking.openURL('https://portal.attendx.ai/register-school')}
                    style={styles.registerBtn}
                  >
                    <AppText variant="body" color={Theme.colors.textSec}>
                      New Institution?{' '}
                      <AppText variant="body" weight="extrabold" color={Theme.colors.primary}>Register Now</AppText>
                    </AppText>
                  </TouchableOpacity>

                  {savedAccounts.length > 0 && (
                    <TouchableOpacity onPress={() => setShowSavedOnly(true)} style={styles.viewSavedBtn}>
                      <AppText variant="label" style={styles.viewSavedTxt}>VIEW SAVED ACCOUNTS</AppText>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: isSmallDevice ? Theme.spacing.lg : Theme.spacing.xl,
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
  welcome: { textAlign: 'center' },
  subWelcome: { letterSpacing: 2, textAlign: 'center', marginTop: Theme.spacing.xs },
  cardContainer: {
    width: '100%',
    borderRadius: Theme.radius.xxl,
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
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
  },
  bannerErr: { backgroundColor: Theme.colors.redLight, borderColor: Theme.colors.redLight },
  bannerOk: { backgroundColor: Theme.colors.greenLight, borderColor: Theme.colors.greenLight },
  bannerTxt: { marginLeft: Theme.spacing.sm },
  actionRow: { marginTop: Theme.spacing.sm },
  signInBtn: { width: '100%' },
  forgotBtn: { alignSelf: 'center', marginTop: Theme.spacing.md },
  dividerLine: { width: '100%', height: 1, backgroundColor: Theme.colors.background, marginVertical: Theme.spacing.xl },
  registerBtn: { alignItems: 'center' },
  viewSavedBtn: {
    marginTop: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
  },
  viewSavedTxt: { letterSpacing: 1 },
  savedAccountsContainer: {
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  savedAccountsTitle: {
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  savedAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBg,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  savedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.blueLight,
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
    marginLeft: Theme.spacing.md,
  },
  savedRole: {
    marginTop: 2,
  },
  loginAnotherBtn: {
    marginTop: Theme.spacing.md,
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
  },
});

export default LoginScreen;
