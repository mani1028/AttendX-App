import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { attendanceLabel } from './helpers';
import { attendanceStyles as styles } from './styles';

export interface AttendanceStatusBadgeProps {
  status: string;
}

export default function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const isPresent = status === 'PRESENT';
  const isHalfDay = status === 'HALF_DAY' || status === 'LATE';

  const badgeStyle = isPresent ? styles.badgePresent : isHalfDay ? styles.badgeHalfDay : styles.badgeAbsent;
  const textStyle = isPresent ? styles.badgePresentText : isHalfDay ? styles.badgeHalfDayText : styles.badgeAbsentText;
  const dotStyle = isPresent ? styles.badgeDotPresent : isHalfDay ? styles.badgeDotHalfDay : styles.badgeDotAbsent;

  return (
    <View style={[styles.badge, badgeStyle]}>
      <View style={[styles.badgeDot, dotStyle]} />
      <AppText style={[styles.badgeText, textStyle]} weight="semibold">
        {attendanceLabel(status || 'ABSENT')}
      </AppText>
    </View>
  );
}
