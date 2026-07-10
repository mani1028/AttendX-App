import React from 'react';
import { View, Text } from 'react-native';
import type { TeacherRegistrationStyles } from './teacherRegistrationStyles';
import { teacherRegistrationStyles as defaultStyles } from './teacherRegistrationStyles';

export interface RegistrationFooterProps {
  schoolCode: string;
  branchId: string;
  styles?: TeacherRegistrationStyles;
}

export default function RegistrationFooter({
  schoolCode,
  branchId,
  styles = defaultStyles,
}: RegistrationFooterProps) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>🏫 School: {schoolCode || '—'}</Text>
      <Text style={styles.footerText}>🏢 Branch: {branchId || '—'}</Text>
    </View>
  );
}
