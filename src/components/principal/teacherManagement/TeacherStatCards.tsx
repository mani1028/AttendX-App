import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import AppCard from '../../common/AppCard';
import { teacherManagementStyles as styles } from './styles';
import type { SummaryStats } from './types';

export interface TeacherStatCardsProps {
  stats: SummaryStats;
}

export default function TeacherStatCards({ stats }: TeacherStatCardsProps) {
  const items = [
    { value: stats.total, label: 'Total Staff' },
    { value: stats.active, label: 'Active' },
    { value: stats.inactive, label: 'Inactive' },
  ];

  return (
    <View style={styles.summaryRow}>
      {items.map((item) => (
        <AppCard key={item.label} style={styles.summaryCard} padded={false} variant="bordered">
          <AppText style={styles.summaryValue} weight="bold">{item.value}</AppText>
          <AppText style={styles.summaryLabel}>{item.label}</AppText>
        </AppCard>
      ))}
    </View>
  );
}
