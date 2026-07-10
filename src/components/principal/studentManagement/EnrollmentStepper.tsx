import React from 'react';
import { View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { studentManagementStyles as styles } from './styles';
import { STEPS } from './types';

export interface EnrollmentStepperProps {
  currentStep: number;
}

export default function EnrollmentStepper({ currentStep }: EnrollmentStepperProps) {
  return (
    <View style={styles.stepperWrapper}>
      <View style={styles.stepperContainer}>
        {STEPS.map((label, idx) => {
          const stepNumber = idx + 1;
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;
          return (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  isDone && styles.stepDone,
                  isActive && styles.stepActive,
                ]}>
                  {isDone ? (
                    <Check size={14} color={Theme.colors.card} />
                  ) : (
                    <AppText style={[styles.stepNumber, isActive && styles.stepNumberActive]} weight="bold">{stepNumber}</AppText>
                  )}
                </View>
                <AppText style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]} weight={isActive ? 'bold' : 'regular'} numberOfLines={1}>
                  {label}
                </AppText>
              </View>
              {idx < STEPS.length - 1 && (
                <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
