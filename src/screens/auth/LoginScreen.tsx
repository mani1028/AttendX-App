import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSessionData } from '../../utils/authSession';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { setAuthToken } from '../../services/api';
import { AppInput } from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ScreenContainer from '../../components/ScreenContainer';
import { colors } from '../../constants/theme';
import { formatErrorMessage } from '../../utils/helpers';

type Props = {
  navigation: any;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { signIn } = useAuth();
  const [schoolId, setSchoolId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getLoginErrorMessage = (error: any) => {
    const status = error?.response?.status;
    const apiMessage = formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.response?.data?.error);

    if (status === 401 || status === 403 || status === 404) {
      return apiMessage || 'Invalid school ID, username or password';
    }

    if (status === 405) {
      // Method not allowed - more likely a server routing/config issue
      const url = error?.response?.url || error?.config?.url;
      return `Server error: method not allowed when calling ${url || 'auth endpoint'}. Please verify API route and method.`;
    }

    return apiMessage || error?.message || 'Login failed. Please try again.';
  };

  const handleLogin = async () => {
    if (!schoolId || !username || !password) {
      Alert.alert('Required', 'Please enter school code, username and password');
      return;
    }

    setLoading(true);
    try {
      const schoolCode = schoolId.trim();
      const normalized = await authService.login(schoolCode, username.trim(), password);

      // Use the helper to ensure consistent storage
      await setSessionData(normalized);

      setAuthToken(normalized.token || '');
      signIn(
        normalized.role,
        normalized.user?.name || username,
        normalized.token || '',
        normalized.user?.isClassTeacher ?? false
      );
    } catch (err: any) {
      Alert.alert('Login Failed', getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View style={styles.headerSection}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitle}>
              The next generation of educational management, built with security and scalability
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Secure Login</Text>
            <Text style={styles.cardSubtitle}>Enter credentials to proceed</Text>

            <AppInput
              label="SCHOOL ID"
              placeholder="SSCXXXXX"
              value={schoolId}
              onChangeText={setSchoolId}
              autoCapitalize="characters"
            />
            <AppInput
              label="EMAIL / EMPLOYEE ID"
              placeholder="user@school.com or EMP12345"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <AppInput
              label="PASSWORD"
              placeholder="P@ssw0rd123"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <AppButton
              title={loading ? "SIGNING IN..." : "SIGN IN"}
              onPress={handleLogin}
              disabled={loading}
              style={styles.signInButton}
            />

            <View style={styles.footerRowCentered}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.footerText}>Forgot password?</Text>
              </TouchableOpacity>

              <Text style={styles.footerSeparator}>•</Text>

              <TouchableOpacity onPress={() => Linking.openURL('https://portal.attendx.ai/register-school')}>
                <Text style={styles.footerText}>New to AttendX?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC', // Light background matching the UI
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
    width: '100%',
  },
  logo: {
    width: 300,
    height: 100,
    marginBottom: 16,
    alignSelf: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  signInButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    marginTop: 24,
  },
  forgotPasswordContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: '#2563EB',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  footerRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  footerRowCentered: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  footerSeparator: {
    marginHorizontal: 10,
    fontSize: 14,
    color: '#94A3B8',
  },
});