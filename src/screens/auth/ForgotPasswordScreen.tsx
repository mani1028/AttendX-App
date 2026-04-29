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

export default function ForgotPasswordScreen({ navigation }: any) {
  const [schoolId, setSchoolId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (!schoolId || !identifier) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const trimmedSchoolId = schoolId.trim();
      const trimmedIdentifier = identifier.trim();
      
      console.log('[ForgotPassword] Requesting OTP with:', { schoolId: trimmedSchoolId, identifier: trimmedIdentifier });
      
      await authService.requestOtp(trimmedSchoolId, trimmedIdentifier);
      navigation.navigate('VerifyOtp', { schoolId: trimmedSchoolId, identifier: trimmedIdentifier });
    } catch (error: any) {
      console.error('[ForgotPassword] Error requesting OTP:', error?.response?.data || error?.message);
      
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data?.detail || 
        error?.response?.data?.error || 
        error?.message || 
        'Failed to send OTP. Please check your school code and email/employee ID.';
      
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
            <Text style={styles.cardTitle}>Forgot Password</Text>
            <Text style={styles.cardSubtitle}>Recover password by school code and registered email/ID</Text>

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
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />

            <AppButton
              title={loading ? "SENDING OTP..." : "SEND OTP"}
              onPress={next}
              disabled={loading}
              style={styles.actionButton}
            />

            <TouchableOpacity
              onPress={() => navigation.goBack()}
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
