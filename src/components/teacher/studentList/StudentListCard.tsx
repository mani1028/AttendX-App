import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { getStudentPhotoUri, initials } from './helpers';
import { studentListStyles as styles } from './studentListStyles';
import type { Student } from './types';

export interface StudentListCardProps {
  student: Student;
  onView: (student: Student) => void;
}

export default function StudentListCard({ student, onView }: StudentListCardProps) {
  const isActive = student.student_status?.toUpperCase() === 'ACTIVE';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onView(student)} style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <View style={styles.studentAvatarContainer}>
          <View style={styles.avatarWrapper}>
            {getStudentPhotoUri(student.student_photograph) ? (
              <Image
                source={{ uri: getStudentPhotoUri(student.student_photograph)! }}
                style={styles.studentAvatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <AppText weight="bold" style={styles.avatarText}>{initials(student.student_full_name)}</AppText>
              </View>
            )}
          </View>
        </View>
        <View style={styles.studentDetails}>
          <AppText weight="bold" style={styles.studentName} numberOfLines={1}>{student.student_full_name}</AppText>
          <AppText weight="regular" style={styles.studentClass}>Class {student.class_grade} • Section {student.section}</AppText>
        </View>
      </View>

      <View style={styles.cardRight}>
        <View style={[styles.statusBadge, { backgroundColor: isActive ? '#f0fdf4' : '#fef2f2' }]}>
          <AppText weight="bold" style={[styles.statusBadgeText, { color: isActive ? Theme.colors.success : Theme.colors.error }]}>
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </AppText>
        </View>
        <ChevronRight size={18} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
};
