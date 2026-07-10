import React from 'react';
import { View } from 'react-native';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import AppText from '../../common/AppText';
import StudentAttendanceCard from './StudentAttendanceCard';
import AttendanceEmptyState from './AttendanceEmptyState';
import { viewAttendanceStyles as styles } from './viewAttendanceStyles';
import type { Student } from './types';

export interface AttendanceStudentListProps {
  loading: boolean;
  students: Student[] | null;
}

export default function AttendanceStudentList({ loading, students }: AttendanceStudentListProps) {
  if (loading) {
    return <ScreenSkeleton variant="list" />;
  }
  if (students === null) {
    return (
      <AttendanceEmptyState
        variant="none-selected"
        title="No Records Selected"
        subtitle="Select class and date to view attendance records"
      />
    );
  }
  if (students.length === 0) {
    return (
      <AttendanceEmptyState
        variant="not-found"
        title="No Records Found"
        subtitle="Try a different date or class"
      />
    );
  }

  return (
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <AppText style={styles.listHeaderText}>Student Details</AppText>
        <AppText style={styles.listHeaderCount}>{students.length} Total</AppText>
      </View>
      {students.filter(Boolean).map((student, idx) => (
        <StudentAttendanceCard key={student.id || idx} student={student} index={idx} />
      ))}
    </View>
  );
}
