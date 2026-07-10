import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react-native';
import AppText from '../../common/AppText';
import Loader from '../../common/Loader';
import { C, Theme } from '../../../theme/tokens';
import TeacherAttendanceRow from './TeacherAttendanceRow';
import { attendanceStyles as styles } from './styles';
import type { Teacher } from './types';

export interface TeacherAttendanceListProps {
  loading: boolean;
  teachers: Teacher[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function TeacherAttendanceList({
  loading,
  teachers,
  page,
  totalPages,
  onPageChange,
}: TeacherAttendanceListProps) {
  if (loading) {
    return (
      <View style={styles.pagePad}><Loader /></View>
    );
  }

  if (teachers.length === 0) {
    return (
      <View style={styles.pagePad}>
        <View style={styles.emptyStateCard}>
          <Users size={40} color={C.muted} style={{ marginBottom: Theme.spacing.sm }} />
          <AppText style={styles.emptyTitle} weight="semibold">No teachers found</AppText>
          <AppText style={styles.emptyText}>Try adjusting your search or filters</AppText>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.listCard}>
        {teachers.map((teacher, idx) => (
          <TeacherAttendanceRow key={teacher.employee_id || teacher.teacher_id || `teacher-${idx}`} teacher={teacher} />
        ))}
      </View>
      {totalPages > 1 && (
        <View style={[styles.pagination, styles.pagePad]}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
            onPress={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={20} color={C.text} />
          </TouchableOpacity>
          <AppText style={styles.pageInfo} weight="semibold">Page {page} of {totalPages}</AppText>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
            onPress={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight size={20} color={C.text} />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
