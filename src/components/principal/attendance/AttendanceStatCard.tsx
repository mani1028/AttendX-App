import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { attendanceHubStyles as styles } from './attendanceHubStyles';

export interface AttendanceStatCardProps {
  label: string;
  percentage: number;
  presentEq: number;
  halfDayEq: number;
  isActive?: boolean;
}

export default function AttendanceStatCard({ label, percentage, presentEq, halfDayEq, isActive }: AttendanceStatCardProps) {
  return (
    <AppCard style={StyleSheet.flatten([styles.statCard, isActive && styles.statCardActive])}>
      <View style={[styles.statAccent, isActive && styles.statAccentActive]} />
      <AppText style={[styles.statLabel, isActive && styles.statLabelActive]} weight="bold">{label}</AppText>
      <AppText style={[styles.statValue, isActive && styles.statValueActive]} weight="bold">{percentage}%</AppText>
      <View style={styles.statMeta}>
        <AppText style={styles.statMetaText}>Present eq: {presentEq}</AppText>
        <AppText style={styles.statMetaText}>Half-day eq: {halfDayEq}</AppText>
      </View>
    </AppCard>
  );
}
