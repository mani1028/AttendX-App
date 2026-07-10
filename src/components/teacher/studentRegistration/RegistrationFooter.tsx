import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import type { RegistrationStyles } from './RegistrationStepper';
import { registrationStyles as defaultStyles } from './registrationStyles';

export interface RegistrationFooterProps {
  schoolCode: string;
  branchId: string;
  styles?: RegistrationStyles;
}

export default function RegistrationFooter({ schoolCode, branchId, styles = defaultStyles }: RegistrationFooterProps) {
  return (
    <View style={styles.footer}>
      <AppText style={styles.footerText}>School: {schoolCode || '—'}</AppText>
      <AppText style={styles.footerText}>Branch: {branchId || '—'}</AppText>
    </View>
  );
}
