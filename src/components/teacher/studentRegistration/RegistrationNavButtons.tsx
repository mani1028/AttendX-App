import React from 'react';
import { View } from 'react-native';
import AppButton from '../../common/AppButton';
import type { RegistrationStyles } from './RegistrationStepper';
import { registrationStyles as defaultStyles } from './registrationStyles';

export interface RegistrationNavButtonsProps {
  step: number;
  isLastStep: boolean;
  loading: boolean;
  backType?: 'primary' | 'secondary';
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  styles?: RegistrationStyles;
}

export default function RegistrationNavButtons({
  step,
  isLastStep,
  loading,
  backType = 'primary',
  onBack,
  onNext,
  onSubmit,
  styles = defaultStyles,
}: RegistrationNavButtonsProps) {
  return (
    <View style={styles.navButtons}>
      <AppButton title="Back" onPress={onBack} disabled={step === 0 || loading} type={backType} style={styles.navBtn} />
      {isLastStep ? (
        <AppButton title={loading ? 'Registering...' : 'Confirm'} onPress={onSubmit} disabled={loading} style={styles.navBtn} />
      ) : (
        <AppButton title="Next" onPress={onNext} disabled={loading} style={styles.navBtn} />
      )}
    </View>
  );
}
