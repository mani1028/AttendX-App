import React from 'react';
import { View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { attendanceStyles as styles } from './styles';

interface AttendanceStepperProps {
  step: number;
  isClassTeacher: boolean;
}

export default function AttendanceStepper({ step, isClassTeacher }: AttendanceStepperProps) {
  const currentStepLabels = isClassTeacher
    ? ['Teacher Auth', 'Verified', 'Student Setup', 'Review & Save']
    : ['Teacher Auth', 'Verified'];

  return (
    <View style={styles.stepperWrapper}>
      <View style={styles.stepperContainer}>
        {currentStepLabels.map((label, idx) => {
          const stepNumber = idx + 1;
          const isDone = stepNumber < step;
          const isActive = stepNumber === step;
          return (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  isDone && styles.stepDone,
                  isActive && styles.stepActive,
                ]}>
                  {isDone ? (
                    <CheckCircle2 size={16} color={Theme.colors.card} />
                  ) : (
                    <AppText style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{stepNumber}</AppText>
                  )}
                </View>
                <AppText style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]} numberOfLines={1}>
                  {label}
                </AppText>
              </View>
              {idx < currentStepLabels.length - 1 && (
                <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
