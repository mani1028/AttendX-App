import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { StudentWithStatus } from './types';
import { attendanceStyles as styles } from './styles';

interface StudentAttendanceRowProps {
  item: StudentWithStatus;
  index: number;
  onStatusChange: (studentId: string, status: 'PRESENT' | 'ABSENT') => void;
}

export default function StudentAttendanceRow({ item, index, onStatusChange }: StudentAttendanceRowProps) {
  if (!item) { return null; }

  return (
    <View
      style={[
        styles.tRow,
        item._currentStatus === 'PRESENT' && styles.rowPresent,
        item._currentStatus === 'ABSENT' && styles.rowAbsent,
        item._changed && styles.rowChanged,
      ]}
    >
      <AppText style={[styles.tCell, { width: 40, color: Theme.colors.textMuted }]}>{item.roll || index + 1}</AppText>
      <View style={{ flex: 1 }}>
        <AppText style={styles.tCellName}>{item.name || 'Unknown Student'}</AppText>
        {item._changed && <AppText style={styles.changedText}>• Manually Edited</AppText>}
      </View>
      <View style={styles.statusToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, item._currentStatus === 'PRESENT' && styles.toggleBtnP]}
          onPress={() => onStatusChange(item.student_id, 'PRESENT')}
        >
          <AppText style={[styles.toggleText, item._currentStatus === 'PRESENT' && styles.toggleTextActive]}>P</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, item._currentStatus === 'ABSENT' && styles.toggleBtnA]}
          onPress={() => onStatusChange(item.student_id, 'ABSENT')}
        >
          <AppText style={[styles.toggleText, item._currentStatus === 'ABSENT' && styles.toggleTextActive]}>A</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
