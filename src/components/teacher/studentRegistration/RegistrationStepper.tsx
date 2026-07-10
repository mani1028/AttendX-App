import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { registrationStyles as defaultStyles } from './registrationStyles';
import { STEPS } from './types';

export type RegistrationStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export interface RegistrationStepperProps {
  step: number;
  onStepPress: (index: number) => void;
  styles?: RegistrationStyles;
}

export default function RegistrationStepper({ step, onStepPress, styles = defaultStyles }: RegistrationStepperProps) {
  return (
    <View style={styles.stepperContainer}>
      {STEPS.map((label, i) => (
        <TouchableOpacity accessibilityRole="button" key={label} style={styles.stepItem} onPress={() => onStepPress(i)}>
          <View style={[styles.stepCircle, step > i && styles.stepCompleted, step === i && styles.stepActive]}>
            {step > i ? (
              <Check size={14} color={Theme.colors.card} />
            ) : (
              <AppText weight="bold" style={[styles.stepNumber, step === i && styles.stepNumberActive]}>{i + 1}</AppText>
            )}
          </View>
          <AppText
            weight={step === i ? 'bold' : 'regular'}
            style={[styles.stepLabel, step === i && styles.stepLabelActive, step > i && styles.stepLabelCompleted]}
          >
            {label}
          </AppText>
        </TouchableOpacity>
      ))}
    </View>
  );
}
