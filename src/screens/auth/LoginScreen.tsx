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
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../api/authService';
import { useAuth } from '../../context/AuthContext';
import { setAuthToken } from '../../services/api';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ScreenContainer from '../../components/ScreenContainer';
import { colors } from '../../constants/theme';

type Props = {
  navigation: any;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { signIn } = useAuth();
  const [schoolId, setSchoolId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!schoolId || !username || !password) {
      Alert.alert('Required', 'Please enter school code, username and password');
      return;
    }

    setLoading(true);
    try {
      const schoolCode = schoolId.trim();
      const normalized = await authService.login(schoolCode, username.trim(), password);

      const toStore: [string, string][] = [
        ['token', normalized.token || ''],
        ['role', normalized.role],
        ['school_code', schoolCode],
      ];

      if (normalized.user?.branch_id) {
        toStore.push(['branch_id', String(normalized.user.branch_id)]);
      }

      await AsyncStorage.multiSet(toStore);
      setAuthToken(normalized.token);
      signIn(normalized);
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Invalid credentials");
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
            <Text style={styles.brandTitle}>Attendance Reimagined</Text>
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
              placeholder="XXXXXXXXX"
              value={schoolId}
              onChangeText={setSchoolId}
              autoCapitalize="characters"
            />

            <AppInput
              label="EMAIL / EMPLOYEE ID"
              placeholder="XXXXXXXXX"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <AppInput
              label="PASSWORD"
              placeholder="XXXXXXXXX"
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

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
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
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    width: 220,
    height: 100,
    marginBottom: 16,
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
    padding: 24,
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
});