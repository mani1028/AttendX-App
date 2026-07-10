import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import { formatPersonName } from './helpers';
import { attendanceStyles as styles } from './styles';
import type { Teacher } from './types';

export interface TeacherAttendanceRowProps {
  teacher: Teacher;
}

export default function TeacherAttendanceRow({ teacher }: TeacherAttendanceRowProps) {
  const isActive = teacher.teacher_status?.toUpperCase() === 'ACTIVE';
  const meta = [
    teacher.employee_id,
    teacher.designation,
    teacher.department_subject,
  ].filter(Boolean).join(' · ');

  return (
    <View style={styles.teacherCard}>
      <View style={[styles.teacherAvatar, !isActive && styles.teacherAvatarMuted]}>
        <AppText style={styles.teacherAvatarText} weight="semibold">
          {(teacher.teacher_full_name || '?').charAt(0).toUpperCase()}
        </AppText>
      </View>
      <View style={styles.teacherInfo}>
        <AppText style={styles.teacherName} weight="semibold" numberOfLines={1}>
          {formatPersonName(teacher.teacher_full_name)}
          {!isActive ? (
            <AppText style={styles.inactiveSuffix}> · Inactive</AppText>
          ) : null}
        </AppText>
        {meta ? (
          <AppText style={styles.teacherMeta} numberOfLines={1}>{meta}</AppText>
        ) : null}
        {teacher.email_id ? (
          <AppText style={styles.teacherEmail} numberOfLines={1}>
            {teacher.email_id.toLowerCase()}
          </AppText>
        ) : null}
      </View>
      <AttendanceStatusBadge status={teacher.status || 'ABSENT'} />
    </View>
  );
}
