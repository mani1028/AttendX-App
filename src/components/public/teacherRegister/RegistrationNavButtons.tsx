import React from 'react';
import { View, Text } from 'react-native';
import AppButton from '../../common/AppButton';
import type { TeacherRegistrationStyles } from './teacherRegistrationStyles';
import { teacherRegistrationStyles as defaultStyles } from './teacherRegistrationStyles';

export interface RegistrationNavButtonsProps {
  step: number;
  isLastStep: boolean;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  styles?: TeacherRegistrationStyles;
}

export default function RegistrationNavButtons({
  step,
  isLastStep,
  loading,
  onBack,
  onNext,
  onSubmit,
  styles = defaultStyles,
}: RegistrationNavButtonsProps) {
  return (
    <View style={styles.navButtons}>
      <AppButton
        title="← Back"
        onPress={onBack}
        disabled={step === 0 || loading}
        type="secondary"
        style={styles.navBtn}
      />
      {isLastStep ? (
        <AppButton
          title={loading ? 'Registering...' : '✓ Register Teacher'}
          onPress={onSubmit}
          disabled={loading}
          style={styles.navBtn}
        />
      ) : (
        <AppButton
          title="Next →"
          onPress={onNext}
          disabled={loading}
          style={styles.navBtn}
        />
      )}
    </View>
  );
}
