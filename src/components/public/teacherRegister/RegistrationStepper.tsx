import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { TeacherRegistrationStyles } from './teacherRegistrationStyles';
import { teacherRegistrationStyles as defaultStyles } from './teacherRegistrationStyles';
import { STEPS } from './types';

export interface RegistrationStepperProps {
  step: number;
  onStepPress: (index: number) => void;
  styles?: TeacherRegistrationStyles;
}

export default function RegistrationStepper({
  step,
  onStepPress,
  styles = defaultStyles,
}: RegistrationStepperProps) {
  return (
    <View style={styles.stepper}>
      {STEPS.map((label, i) => (
        <TouchableOpacity
          accessibilityRole="button"
          key={label}
          style={styles.stepItem}
          onPress={() => onStepPress(i)}
        >
          <View style={[styles.stepCircle, step > i && styles.stepCompleted, step === i && styles.stepActive]}>
            {step > i ? (
              <Text style={styles.stepIcon}>✓</Text>
            ) : (
              <Text style={styles.stepNumber}>{i + 1}</Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              step === i && styles.stepLabelActive,
              step > i && styles.stepLabelCompleted,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
