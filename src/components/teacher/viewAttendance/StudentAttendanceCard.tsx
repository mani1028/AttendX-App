import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { viewAttendanceStyles as styles } from './viewAttendanceStyles';
import type { Student } from './types';

const StudentAttendanceCard: React.FC<{ student: Student; index: number }> = ({ student }) => {
  const present = student.presentDays > 0;
  return (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <View style={[styles.studentAvatar, { backgroundColor: present ? Theme.colors.successBg : Theme.colors.errorBg }]}>
          <AppText style={[styles.studentAvatarText, { color: present ? Theme.colors.success : Theme.colors.error }]}>
            {(student.name || '?')[0].toUpperCase()}
          </AppText>
        </View>
        <View style={styles.studentDetails}>
          <AppText style={styles.studentName}>{student.name}</AppText>
          <AppText style={styles.studentRoll}>Roll No: {student.roll}</AppText>
        </View>
      </View>
      <View style={[styles.statusBadge, present ? styles.statusPresent : styles.statusAbsent]}>
        <AppText style={[styles.statusText, present ? styles.statusTextPresent : styles.statusTextAbsent]}>
          {present ? 'Present' : 'Absent'}
        </AppText>
      </View>
    </View>
  );
};

export default StudentAttendanceCard;
