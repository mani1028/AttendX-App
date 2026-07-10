import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { attendanceStyles as styles } from './styles';

interface StatItem {
  label: string;
  value: string | number;
  borderColor: string;
}

interface AttendanceStatsRowProps {
  stats: StatItem[];
}

export default function AttendanceStatsRow({ stats }: AttendanceStatsRowProps) {
  return (
    <View style={styles.statsRow}>
      {stats.map(stat => (
        <View key={stat.label} style={[styles.miniStatCard, { borderLeftColor: stat.borderColor }]}>
          <AppText style={styles.miniStatVal}>{stat.value}</AppText>
          <AppText style={styles.miniStatLabel}>{stat.label}</AppText>
        </View>
      ))}
    </View>
  );
}

export const RESULT_STAT_COLORS = {
  total: Theme.colors.primaryLight,
  present: Theme.colors.success,
  absent: Theme.colors.error,
  rate: Theme.colors.warning,
};
