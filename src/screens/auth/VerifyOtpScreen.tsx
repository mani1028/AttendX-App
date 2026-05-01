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

export default function VerifyOtpScreen({ route, navigation }: any) {
  const { schoolId, identifier } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!otp) {
      Alert.alert('Required', 'Please enter OTP');
      return;
    }

    try {
      setLoading(true);
      console.log('[VerifyOtp] Verifying OTP with:', { schoolId, identifier });
      
      const res = await authService.verifyOtp(schoolId, identifier, otp);

      const resetToken =
        res?.data?.reset_token ||
        res?.data?.resetToken ||
        res?.data?.token ||
        res?.data?.access_token ||
        res?.data?.data?.reset_token ||
        res?.data?.data?.resetToken ||
        res?.data?.data?.token ||
        res?.data?.data?.access_token ||
        '';

      if (!resetToken) {
        console.error('[VerifyOtp] No reset token found in response:', res?.data);
        Alert.alert('Error', 'Unable to verify OTP. Please try again.');
        return;
      }

      console.log('[VerifyOtp] OTP verified successfully');
      navigation.navigate('ResetPassword', {
        schoolId,
        identifier,
        resetToken,
      });
    } catch (error: any) {
      console.error('[VerifyOtp] Error verifying OTP:', error?.response?.data || error?.message);
      
      const errorMessage = 
        formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.response?.data?.error) ||
        error?.message || 
        'Invalid OTP. Please check and try again.';
      
      Alert.alert('Error', errorMessage);
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
            <Text style={styles.cardTitle}>Verify OTP</Text>
            <Text style={styles.cardSubtitle}>Enter the OTP sent to your registered contact</Text>

            <AppInput
              label="OTP"
              placeholder="XXXXXX"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              inputStyle={styles.otpInput}
            />

            <AppButton
              title={loading ? "VERIFYING..." : "VERIFY OTP"}
              onPress={verify}
              disabled={loading}
              style={styles.actionButton}
            />

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>Back</Text>
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
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: '700',
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
