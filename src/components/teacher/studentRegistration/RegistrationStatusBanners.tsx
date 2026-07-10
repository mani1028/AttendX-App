import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import type { RegistrationStyles } from './RegistrationStepper';
import { registrationStyles as defaultStyles } from './registrationStyles';

export interface RegistrationStatusBannersProps {
  error?: string;
  success?: string;
  errorTextStyle?: object;
  styles?: RegistrationStyles;
}

export default function RegistrationStatusBanners({ error, success, errorTextStyle, styles = defaultStyles }: RegistrationStatusBannersProps) {
  return (
    <>
      {error ? (
        <View style={styles.errorBox}>
          <AppText style={[styles.errorText, (styles as any).errorBoxText, errorTextStyle]}>{error}</AppText>
        </View>
      ) : null}
      {success ? (
        <View style={styles.successBox}>
          <AppText style={styles.successText}>{success}</AppText>
        </View>
      ) : null}
    </>
  );
}
