import React from 'react';
import { ActivityIndicator } from 'react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { colors } from '../../../theme/tokens';
import { visitorDashboardStyles as styles } from './visitorDashboardStyles';

interface StatCardProps {
  title: string;
  value: number;
  loading: boolean;
  color?: string;
}

export default function StatCard({ title, value, loading, color }: StatCardProps) {
  return (
    <AppCard style={styles.statCard}>
      <AppText style={styles.statTitle}>{title}</AppText>
      {loading ? (
        <ActivityIndicator size="small" color={color || colors.accent} />
      ) : (
        <AppText style={[styles.statValue, color ? { color } : undefined]}>{value}</AppText>
      )}
    </AppCard>
  );
}
