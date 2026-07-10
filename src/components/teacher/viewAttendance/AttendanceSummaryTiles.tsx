import React from 'react';
import { View } from 'react-native';
import { CheckCircle2, XCircle, Users } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme, colors } from '../../../theme/tokens';
import { viewAttendanceStyles as styles } from './viewAttendanceStyles';

export interface AttendanceSummaryTilesProps {
  totalPresent: number;
  totalAbsent: number;
  overallPct: number;
}

export default function AttendanceSummaryTiles({
  totalPresent,
  totalAbsent,
  overallPct,
}: AttendanceSummaryTilesProps) {
  return (
    <View style={styles.summaryGrid}>
      <View style={[styles.summaryTile, { backgroundColor: colors.accentSoft }]}>
        <CheckCircle2 size={24} color={Theme.colors.primary} />
        <AppText style={styles.summaryValue}>{totalPresent}</AppText>
        <AppText style={styles.summaryLabel}>Present</AppText>
      </View>
      <View style={[styles.summaryTile, { backgroundColor: colors.errorSoft }]}>
        <XCircle size={24} color={Theme.colors.error} />
        <AppText style={styles.summaryValue}>{totalAbsent}</AppText>
        <AppText style={styles.summaryLabel}>Absent</AppText>
      </View>
      <View style={[styles.summaryTile, { backgroundColor: colors.successSoft }]}>
        <Users size={24} color={Theme.colors.success} />
        <AppText style={styles.summaryValue}>{overallPct}%</AppText>
        <AppText style={styles.summaryLabel}>Attendance</AppText>
      </View>
    </View>
  );
}
