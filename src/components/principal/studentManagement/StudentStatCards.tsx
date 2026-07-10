import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import AppCard from '../../common/AppCard';
import { studentManagementStyles as styles } from './styles';

export interface StudentStatCardsProps {
  classCount: number;
  studentCount: number;
  presentCount: number;
}

export default function StudentStatCards({ classCount, studentCount, presentCount }: StudentStatCardsProps) {
  const items = [
    { value: classCount, label: 'Total Classes' },
    { value: studentCount, label: 'Total Students' },
    { value: presentCount, label: 'Today Present' },
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
