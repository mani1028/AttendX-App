import React from 'react';
import { View, Text } from 'react-native';
import { teacherRegistrationStyles as styles } from './teacherRegistrationStyles';

export default function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'At least 1 uppercase (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'At least 1 lowercase (a-z)', valid: /[a-z]/.test(password) },
    { label: 'At least 1 number (0-9)', valid: /\d/.test(password) },
    { label: 'At least 1 special character (!@#$%)', valid: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <View style={styles.passwordStrength}>
      {checks.map((check, idx) => (
        <View key={idx} style={styles.passwordRule}>
          <Text style={[styles.passwordRuleIcon, check.valid && styles.passwordRuleIconValid]}>
            {check.valid ? '✓' : '○'}
          </Text>
          <Text style={[styles.passwordRuleText, check.valid && styles.passwordRuleTextValid]}>
            {check.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
