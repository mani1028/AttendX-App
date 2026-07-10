import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { StudentMark } from './types';
import StudentMarkRow from './StudentMarkRow';
import { marksEntryStyles as styles } from './marksEntryStyles';

interface MarksStudentListProps {
  students: StudentMark[];
  maxMarks: number;
  onAbsentToggle: (studentId: string, isAbsent: boolean) => void;
  onMarksChange: (studentId: string, value: string) => void;
}

export default function MarksStudentList({
  students,
  maxMarks,
  onAbsentToggle,
  onMarksChange,
}: MarksStudentListProps) {
  return (
    <View style={styles.listWrapper}>
      <AppText weight="bold" style={styles.listTitle}>Student List ({students.length})</AppText>
      {students.map((student, idx) => (
        <StudentMarkRow
          key={student.student_id || `std-row-${idx}`}
          student={student}
          maxMarks={maxMarks}
          onAbsentToggle={onAbsentToggle}
          onMarksChange={onMarksChange}
        />
      ))}
    </View>
  );
}
