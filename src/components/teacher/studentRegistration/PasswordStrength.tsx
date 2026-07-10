import React from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { getPasswordStrength } from '../../../utils/studentRegistrationValidation';
import { registrationStyles as styles } from './registrationStyles';

const PasswordRule: React.FC<{ valid: boolean; children: React.ReactNode }> = ({ valid, children }) => (
  <View style={styles.passwordRule}>
    {valid ? <Check size={12} color={Theme.colors.success} /> : <View style={styles.passwordRuleDot} />}
    <AppText style={[styles.passwordRuleText, valid && styles.passwordRuleTextValid]}>{children}</AppText>
  </View>
);

export default function PasswordStrength({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  return (
    <View style={styles.passwordStrength}>
      <PasswordRule valid={strength.minLength}>At least 8 characters</PasswordRule>
      <PasswordRule valid={strength.hasUpper}>At least 1 uppercase (A-Z)</PasswordRule>
      <PasswordRule valid={strength.hasLower}>At least 1 lowercase (a-z)</PasswordRule>
      <PasswordRule valid={strength.hasNumber}>At least 1 number (0-9)</PasswordRule>
      <PasswordRule valid={strength.hasSpecial}>At least 1 special character (!@#$%)</PasswordRule>
    </View>
  );
}
