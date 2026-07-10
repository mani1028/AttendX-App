import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AppInput from '../../common/AppInput';
import { Theme } from '../../../theme/tokens';
import type { FormData } from './types';
import { principalRegistrationStyles as styles } from './principalRegistrationStyles';

interface PrincipalDetailsStepProps {
  form: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  errors: Record<string, string>;
  otp: string;
  setOtp: (value: string) => void;
  otpSent: boolean;
  emailVerified: boolean;
  otpSending: boolean;
  otpVerifying: boolean;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
}

export default function PrincipalDetailsStep({
  form,
  onChange,
  confirmPassword,
  onConfirmPasswordChange,
  errors,
  otp,
  setOtp,
  otpSent,
  emailVerified,
  otpSending,
  otpVerifying,
  onSendOtp,
  onVerifyOtp,
}: PrincipalDetailsStepProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>👨‍🏫 Principal Details</Text>

      <AppInput
        label="Employee ID"
        placeholder="Auto generated"
        value={form.principal_employee_id}
        editable={false}
        containerStyle={{ opacity: 0.7 }}
      />

      <AppInput
        label="Principal Name"
        placeholder="Principal full name"
        value={form.principal_name}
        onChangeText={(text) => onChange('principal_name', text)}
        error={errors.principal_name}
      />

      <AppInput
        label="Email"
        placeholder="principal@school.edu"
        keyboardType="email-address"
        autoCapitalize="none"
        value={form.principal_email}
        onChangeText={(text) => onChange('principal_email', text)}
        editable={!emailVerified}
        error={errors.principal_email}
        rightIcon={
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.verifyBtn,
              (otpSending || emailVerified) && styles.verifyBtnDisabled,
              {
                height: 34,
                paddingVertical: 0,
                paddingHorizontal: Theme.spacing.md,
                borderRadius: Theme.radius.sm,
                justifyContent: 'center',
              },
            ]}
            onPress={onSendOtp}
            disabled={otpSending || emailVerified}
          >
            <Text style={[styles.verifyBtnText, { ...Theme.typography.label }]}>
              {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
            </Text>
          </TouchableOpacity>
        }
      />

      {otpSent && !emailVerified && (
        <AppInput
          label="Enter OTP"
          placeholder="Enter OTP"
          keyboardType="numeric"
          value={otp}
          onChangeText={setOtp}
          rightIcon={
            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.verifyBtn,
                styles.verifyOtpBtn,
                {
                  height: 34,
                  paddingVertical: 0,
                  paddingHorizontal: Theme.spacing.md,
                  borderRadius: Theme.radius.sm,
                  justifyContent: 'center',
                },
              ]}
              onPress={onVerifyOtp}
              disabled={otpVerifying}
            >
              <Text style={[styles.verifyBtnText, { ...Theme.typography.label }]}>
                {otpVerifying ? 'Verifying...' : 'Verify OTP'}
              </Text>
            </TouchableOpacity>
          }
        />
      )}

      <AppInput
        label="Password"
        placeholder="••••••••"
        secureTextEntry
        value={form.password}
        onChangeText={(text) => onChange('password', text)}
        error={errors.password}
      />

      <AppInput
        label="Confirm Password"
        placeholder="Re-enter password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={onConfirmPasswordChange}
        error={errors.confirm_password}
      />
    </View>
  );
}
