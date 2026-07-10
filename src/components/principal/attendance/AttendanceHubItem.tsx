import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { C } from '../../../theme/tokens';
import { attendanceHubStyles as styles } from './attendanceHubStyles';
import type { Teacher, Student } from './types';

export default function AttendanceHubItem({
  item,
  type,
  onPress,
}: {
  item: Teacher | Student;
  type: 'teacher' | 'student';
  onPress?: () => void;
}) {
  const avatar = type === 'teacher'
    ? (item as Teacher).teacher_full_name?.[0]?.toUpperCase() || '?'
    : (item as Student).student_full_name?.[0]?.toUpperCase() || '?';
  const title = type === 'teacher' ? (item as Teacher).teacher_full_name : (item as Student).student_full_name;
  const subtitle = type === 'teacher'
    ? `${(item as Teacher).designation || ''} • ${(item as Teacher).department_subject || ''}`
    : `${(item as Student).roll_number || ''} • ${(item as Student).admission_number || ''}`;
  const id = type === 'teacher' ? (item as Teacher).employee_id : (item as Student).admission_number;
  const status = item.status;
  const statusText = status === 'PRESENT' ? 'PRESENT' : status === 'HALF_DAY' || status === 'LATE' ? 'HALF-DAY' : 'ABSENT';
  const getStatusColor = () => {
    if (status === 'PRESENT') { return C.success; }
    if (status === 'HALF_DAY' || status === 'LATE') { return C.warning; }
    return C.error;
  };

  return (
    <TouchableOpacity accessibilityRole="button" style={styles.itemCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.itemAvatar, { backgroundColor: C.primary }]}>
        <AppText style={styles.itemAvatarText} weight="bold">{avatar}</AppText>
      </View>
      <View style={styles.itemContent}>
        <View>
          <AppText style={styles.itemId} weight="semibold">{id}</AppText>
          <AppText style={styles.itemTitle} weight="bold">{title}</AppText>
          <AppText style={styles.itemSubtitle}>{subtitle}</AppText>
          <View style={[styles.statusChip, { backgroundColor: getStatusColor() + '20' }]}>
            <AppText style={[styles.statusChipText, { color: getStatusColor() }]} weight="bold">{statusText}</AppText>
          </View>
        </View>
      </View>
      <ChevronRight size={20} color={C.text2} />
    </TouchableOpacity>
  );
}
