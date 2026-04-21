import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Building2, Lock, School, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authService } from '../../api/authService';
import { AppRole } from '../../constants/roles';
import { Theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [schoolId, setSchoolId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!schoolId || !username || !password) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(schoolId.trim(), username.trim(), password);
      const role = result.role as AppRole;

      await AsyncStorage.multiSet([
        ['userToken', result.token ?? ''],
        ['userRole', role],
        ['schoolCode', result.schoolCode || schoolId.trim()],
        ['studentId', result.user?.studentId || ''],
        ['branchId', result.user?.branchId || ''],
      ]);

      await signIn(role, result.user?.name || username.trim(), result.token);
      navigation.replace('MainTabs');
    } catch (error: any) {
      Alert.alert('Login Failed', error?.response?.data?.detail || 'Invalid Credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Attendance Reimagined</Text>
          <Text style={styles.subtitle}>
            The next generation of educational management, built with security and scalability
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Secure Login</Text>
          <Text style={styles.cardSub}>Enter credentials to proceed</Text>

          <Text style={styles.label}>SCHOOL ID</Text>
          <View style={styles.inputContainer}>
            <School size={18} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="XXXXXXXXX"
              placeholderTextColor={Theme.colors.textMuted}
              value={schoolId}
              onChangeText={setSchoolId}
              autoCapitalize="characters"
            />
          </View>

          <Text style={styles.label}>EMAIL/EMPLOYEE ID</Text>
          <View style={styles.inputContainer}>
            <User size={18} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="XXXXXXXXX"
              placeholderTextColor={Theme.colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputContainer}>
            <Lock size={18} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="XXXXXXXXX"
              secureTextEntry
              placeholderTextColor={Theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>SIGN IN</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scroll: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#312e81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    color: Theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardTitle: {
    color: Theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  cardSub: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    marginBottom: 20,
  },
  label: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  input: {
    flex: 1,
    color: Theme.colors.text,
    height: 48,
    marginLeft: 10,
  },
  btn: {
    backgroundColor: Theme.colors.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
  linkText: {
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
});
