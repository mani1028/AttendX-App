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
import { authService } from '../../api/authService';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ScreenContainer from '../../components/ScreenContainer';
import { formatErrorMessage } from '../../utils/helpers';

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { schoolId, identifier, resetToken } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      console.log('[ResetPassword] Resetting password for:', { schoolId, identifier });
      
      await authService.resetPassword(schoolId, identifier, resetToken, password);
      
      console.log('[ResetPassword] Password reset successfully');
      Alert.alert('Success', 'Password reset successfully');
      navigation.replace('Login');
    } catch (error: any) {
      console.error('[ResetPassword] Error resetting password:', error?.response?.data || error?.message);
      
      const errorMsg = 
        formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.response?.data?.error) ||
        error?.message || 
        'Failed to reset password. Please try again.';
      
      Alert.alert('Error', errorMsg);
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

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change Password</Text>
            <Text style={styles.cardSubtitle}>Choose a strong new password for your account</Text>

            <AppInput
              label="NEW PASSWORD"
              placeholder="XXXXXXXXX"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <AppInput
              label="CONFIRM PASSWORD"
              placeholder="XXXXXXXXX"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <AppButton
              title={loading ? "SAVING..." : "RESET PASSWORD"}
              onPress={reset}
              disabled={loading}
              style={styles.actionButton}
            />

            <TouchableOpacity
              onPress={() => navigation.replace('Login')}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
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
    width: '100%',
  },
  logo: {
    width: 300,
    height: 100,
    marginBottom: 16,
    alignSelf: 'center',
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
  actionButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    marginTop: 24,
  },
  linkContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
});
