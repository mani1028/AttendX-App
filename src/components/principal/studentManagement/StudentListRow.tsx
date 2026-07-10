import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Clock, User } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AvatarBubble from '../../common/AvatarBubble';
import { C, Theme } from '../../../theme/tokens';
import { avColor, getStatusBadge, resolveStudentId } from './helpers';
import { studentManagementStyles as styles } from './styles';
import type { Student } from './types';

export interface StudentListRowProps {
  student: Student;
  index: number;
  variant: 'card' | 'table';
  onViewProfile: (student: Student) => void;
  onOpenAttendance: (student: Student) => void;
}

export default function StudentListRow({
  student,
  index,
  variant,
  onViewProfile,
  onOpenAttendance,
}: StudentListRowProps) {
  const statusStyle = getStatusBadge(student.status);
  const StatusIcon = statusStyle.icon;
  const { color } = avColor(index);
  const studentId = resolveStudentId(student);

  if (variant === 'card') {
    return (
      <View key={studentId || student.student_full_name || index} style={styles.studentCard}>
        <View style={styles.studentCardHeader}>
          <View style={styles.studentCellName}>
            <AvatarBubble
              displayName={student.student_full_name}
              size={36}
              textSize={13}
              primaryColor={color}
            />
            <View style={styles.studentIdentity}>
              <AppText style={styles.studentName} weight="semibold" numberOfLines={1}>{student.student_full_name || '—'}</AppText>
              <AppText style={styles.studentIdText} numberOfLines={1}>Roll No: {student.roll_number || '—'}</AppText>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: 'transparent' }]}>
            <StatusIcon size={10} color={statusStyle.color} />
            <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="bold">
              {student.status || 'UNKNOWN'}
            </AppText>
          </View>
        </View>

        <View style={styles.studentCardFooter}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.cardActionBtn, styles.cardActionSecondary]}
            onPress={() => onOpenAttendance(student)}
          >
            <Clock size={14} color={C.primary} />
            <AppText style={styles.cardActionSecondaryText} weight="semibold">Attendance</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.cardActionBtn, styles.cardActionPrimary]}
            onPress={() => onViewProfile(student)}
          >
            <User size={14} color={Theme.colors.card} />
            <AppText style={styles.cardActionPrimaryText} weight="semibold">View Profile</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View key={studentId || student.student_full_name || index} style={styles.tableRow}>
      <View style={[styles.tableCell, styles.cellStudent]}>
        <AvatarBubble
          displayName={student.student_full_name}
          size={32}
          textSize={11}
          primaryColor={color}
        />
        <View>
          <AppText style={styles.studentName} weight="semibold">{student.student_full_name || '—'}</AppText>
          <AppText style={styles.studentIdText}>Roll No: {student.roll_number || '—'}</AppText>
        </View>
      </View>
      <View style={[styles.tableCell, styles.cellStatus]}>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: 'transparent' }]}>
          <StatusIcon size={10} color={statusStyle.color} />
          <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="bold">
            {student.status || 'UNKNOWN'}
          </AppText>
        </View>
      </View>
      <View style={[styles.tableCell, styles.cellActions]}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.tableViewBtn}
          onPress={() => onViewProfile(student)}
        >
          <User size={14} color={C.primary} />
          <AppText style={styles.tableViewBtnText} weight="semibold">Profile</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
