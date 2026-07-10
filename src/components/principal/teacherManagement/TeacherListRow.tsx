import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { CheckCircle2, XCircle, Eye, Edit2 } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppCard from '../../common/AppCard';
import { C, Theme } from '../../../theme/tokens';
import { teacherManagementStyles as styles } from './styles';
import type { Teacher } from './types';

export interface TeacherListRowProps {
  teacher: Teacher;
  index: number;
  variant: 'card' | 'table';
  onViewProfile: (teacher: Teacher) => void;
  onEdit: (teacher: Teacher) => void;
}

export default function TeacherListRow({
  teacher,
  index,
  variant,
  onViewProfile,
  onEdit,
}: TeacherListRowProps) {
  const isActive = teacher.teacher_status === 'ACTIVE';
  const initial = teacher.teacher_full_name ? teacher.teacher_full_name.charAt(0).toUpperCase() : 'T';

  if (variant === 'card') {
    return (
      <AppCard key={teacher.teacher_id || index} style={styles.teacherCard} padded={false} variant="bordered">
        <View style={styles.teacherCardHeader}>
          <View style={styles.teacherCardIdentityContainer}>
            <View style={[styles.teacherAvatar, { backgroundColor: C.primary }]}>
              <AppText style={styles.avatarText} weight="bold">{initial}</AppText>
            </View>
            <View style={styles.teacherIdentity}>
              <AppText style={styles.teacherName} weight="semibold" numberOfLines={1}>{teacher.teacher_full_name || '—'}</AppText>
              <AppText style={styles.teacherEmail} numberOfLines={1}>{teacher.email_id || '—'}</AppText>
            </View>
          </View>
          <View style={[styles.statusPill, isActive ? styles.statusActive : styles.statusInactive]}>
            {isActive ? <CheckCircle2 size={10} color={C.success} /> : <XCircle size={10} color={C.error} />}
            <AppText style={[styles.statusText, isActive ? styles.statusActiveText : styles.statusInactiveText]} weight="bold">
              {teacher.teacher_status || 'INACTIVE'}
            </AppText>
          </View>
        </View>

        <View style={styles.teacherMetaGrid}>
          {([
            ['Emp ID', teacher.employee_id],
            ['Contact', teacher.mobile_number],
            ['Designation', teacher.designation],
            ['Department', teacher.department_subject],
          ] as const).map(([label, value]) => (
            <View key={label} style={styles.teacherMetaItem}>
              <AppText style={styles.teacherMetaLabel}>{label}</AppText>
              <AppText style={styles.teacherMetaValue} numberOfLines={1}>{value || '—'}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.teacherCardFooter}>
          <View style={styles.teacherSubStack}>
            <AppText style={styles.teacherSubText}>
              {teacher.gender || '—'}{teacher.age ? ` • ${teacher.age}y` : ''}
            </AppText>
          </View>
          <View style={styles.teacherCardActions}>
            <TouchableOpacity accessibilityRole="button" style={[styles.cardActionBtn, styles.cardActionSecondary]} onPress={() => onViewProfile(teacher)}>
              <Eye size={14} color={C.primary} />
              <AppText style={styles.cardActionSecondaryText} weight="semibold">View Profile</AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.cardActionBtn, styles.cardActionPrimary]} onPress={() => onEdit(teacher)}>
              <Edit2 size={14} color={Theme.colors.card} />
              <AppText style={styles.cardActionPrimaryText} weight="semibold">Edit Details</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </AppCard>
    );
  }

  return (
    <View key={teacher.teacher_id || index} style={styles.teacherRow}>
      <View style={styles.teacherCellName}>
        <View style={[styles.teacherAvatar, { backgroundColor: C.primary }]}>
          <AppText style={styles.avatarText} weight="bold">{initial}</AppText>
        </View>
        <View>
          <AppText style={styles.teacherName} weight="semibold">{teacher.teacher_full_name || '—'}</AppText>
          <AppText style={styles.teacherEmail}>{teacher.email_id || '—'}</AppText>
        </View>
      </View>
      <View style={styles.teacherCellEmpId}>
        <AppText style={styles.teacherText}>{teacher.employee_id || '—'}</AppText>
      </View>
      <View style={styles.teacherCellContact}>
        <AppText style={styles.teacherText}>{teacher.mobile_number || '—'}</AppText>
        <AppText style={styles.teacherSubText}>{teacher.gender || '—'}{teacher.age ? ` • ${teacher.age}y` : ''}</AppText>
      </View>
      <View style={styles.teacherCellDesignation}>
        <AppText style={styles.teacherText}>{teacher.designation || '—'}</AppText>
      </View>
      <View style={styles.teacherCellDept}>
        <AppText style={styles.teacherText}>{teacher.department_subject || '—'}</AppText>
      </View>
      <View style={styles.teacherCellStatus}>
        <View style={[styles.statusPill, isActive ? styles.statusActive : styles.statusInactive]}>
          {isActive ? <CheckCircle2 size={10} color={C.success} /> : <XCircle size={10} color={C.error} />}
          <AppText style={[styles.statusText, isActive ? styles.statusActiveText : styles.statusInactiveText]} weight="bold">
            {teacher.teacher_status || 'INACTIVE'}
          </AppText>
        </View>
      </View>
      <View style={styles.teacherCellActions}>
        <TouchableOpacity accessibilityRole="button" style={styles.iconBtn} onPress={() => onViewProfile(teacher)}>
          <Eye size={16} color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.iconBtn} onPress={() => onEdit(teacher)}>
          <Edit2 size={16} color={C.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
