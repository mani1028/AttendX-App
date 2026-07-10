import React from 'react';
import { View, Text } from 'react-native';
import { safeTrim } from './helpers';
import { principalRegistrationStyles as styles } from './principalRegistrationStyles';

interface PrincipalRegistrationFooterProps {
  schoolCode: string;
  branchId: string;
}

export default function PrincipalRegistrationFooter({
  schoolCode,
  branchId,
}: PrincipalRegistrationFooterProps) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>🏫 School Code: {schoolCode || '—'}</Text>
      <Text style={styles.footerText}>🏢 Branch ID: {safeTrim(branchId) || '—'}</Text>
      <Text style={styles.footerText}>👑 Role: Principal (Registration)</Text>
    </View>
  );
}
