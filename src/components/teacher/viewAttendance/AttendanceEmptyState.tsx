import React from 'react';
import { View } from 'react-native';
import { Search, Filter } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { viewAttendanceStyles as styles } from './viewAttendanceStyles';

export interface AttendanceEmptyStateProps {
  variant: 'none-selected' | 'not-found';
  title: string;
  subtitle: string;
}

export default function AttendanceEmptyState({ variant, title, subtitle }: AttendanceEmptyStateProps) {
  const Icon = variant === 'none-selected' ? Search : Filter;
  return (
    <View style={styles.emptyState}>
      <Icon size={48} color={Theme.colors.textMuted} />
      <AppText style={styles.emptyStateTitle}>{title}</AppText>
      <AppText style={styles.emptyStateSub}>{subtitle}</AppText>
    </View>
  );
}
